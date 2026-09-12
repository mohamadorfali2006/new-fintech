// PII-minimized AI context + grounding/disclaimer helpers.
// Principle: send aggregates to the model by default; raw merchant names
// only when the user explicitly opts in (includeMerchantNames flag).

export const AI_DISCLAIMER =
  "This is general financial information, not financial advice. " +
  "Consider consulting a qualified professional before making financial decisions.";

export const NO_HALLUCINATION_RULES = [
  "Use ONLY the numbers provided in the financial summary below.",
  "Never invent transactions, amounts, dates, merchants, or budgets.",
  "When citing a figure, reference its transaction ID (e.g. [txn:abc123]).",
  'If the data does not contain the answer, say so plainly (e.g. "I don\'t have that data").',
  "Do not guess at future prices, returns, or eligibility.",
].join("\n");

export interface MinimizedTxn {
  id: string;
  date: string; // YYYY-MM-DD
  type: string; // income | expense
  amount: number;
  category: string;
  merchantName?: string; // present ONLY when opt-in is true
}

export interface MinimizedContext {
  summaryText: string;
  citationLines: string[];
  citations: Array<{ id: string; amount: number; date: string }>;
  merchantNamesIncluded: boolean;
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}

/** Build a PII-minimized context block. Never includes description/notes/account numbers. */
export function buildMinimizedContext(args: {
  transactions: Array<{
    id: string;
    date: Date | string;
    type: string;
    amount: number;
    category: string;
    merchantName?: string | null;
  }>;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  savingsRate: number;
  topCategories: Array<[string, number]>;
  topMerchants: Array<[string, number]>;
  budgets: Array<{ category: string; amount: number }>;
  accountCount: number;
  totalBalance: number;
  includeMerchantNames: boolean;
  recentLimit?: number;
}): MinimizedContext {
  const {
    transactions,
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    topCategories,
    topMerchants,
    budgets,
    accountCount,
    totalBalance,
    includeMerchantNames,
    recentLimit = 10,
  } = args;

  const distinctMerchants = new Set(
    transactions
      .map((t) => (t.merchantName || "").toLowerCase().trim())
      .filter(Boolean)
  ).size;

  const recent = transactions.slice(0, recentLimit);
  const citationLines: string[] = [];
  const citations: MinimizedContext["citations"] = [];

  for (const t of recent) {
    const d = typeof t.date === "string" ? t.date.slice(0, 10) : t.date.toISOString().split("T")[0];
    const merchantPart = includeMerchantNames ? ` | ${t.merchantName || "Unknown"}` : "";
    citationLines.push(
      `[txn:${shortId(t.id)}] ${d}${merchantPart} | ${t.type.toUpperCase()} | $${t.amount.toFixed(2)} | ${t.category}`
    );
    citations.push({ id: t.id, amount: t.amount, date: d });
  }

  const merchantSummary = includeMerchantNames
    ? topMerchants.map(([m, a]) => `${m}: $${a.toFixed(2)}`).join(", ") || "None"
    : `${distinctMerchants} distinct merchants (names withheld for privacy; ` +
      `set includeMerchantNames=true to opt in)`;

  const summaryText = [
    `- Accounts Total Balance: $${totalBalance.toFixed(2)} across ${accountCount} accounts`,
    `- Recent Total Income (last ${transactions.length} txns): $${totalIncome.toFixed(2)}`,
    `- Recent Total Expenses: $${totalExpenses.toFixed(2)}`,
    `- Net Cash Flow: $${netCashFlow.toFixed(2)}`,
    `- Savings Rate: ${savingsRate}%`,
    `- Top Categories: ${topCategories.map(([c, a]) => `${c}: $${a.toFixed(2)}`).join(", ") || "None"}`,
    `- Top Merchants: ${merchantSummary}`,
    `- Active Budgets: ${budgets.map((b) => `${b.category}: $${b.amount}/mo`).join(", ") || "None"}`,
    `- Recent ${recent.length} Transactions (cite by [txn:id]):`,
    ...citationLines.map((l) => `  ${l}`),
  ].join("\n");

  return { summaryText, citationLines, citations, merchantNamesIncluded: includeMerchantNames };
}

/** System prompt with grounding rules + PII-minimized summary. */
export function buildSystemPrompt(minimizedSummary: string): string {
  return [
    "You are NewFinTech's AI financial intelligence assistant.",
    "Analyze the user's financial queries based strictly on their transaction data and portfolio context provided below.",
    "Be concise, clear, encouraging, and accurate. Format numbers nicely as currency (USD).",
    "If suggesting actions, keep them practical and grounded.",
    "",
    "GROUNDING RULES:",
    NO_HALLUCINATION_RULES,
    "",
    "User Financial Summary (PII-minimized; merchant names appear only if the user opted in):",
    minimizedSummary,
  ].join("\n");
}

/** Append the disclaimer footer + machine-readable citations to any reply. */
export function appendDisclaimer(
  reply: string,
  citations: Array<{ id: string; amount: number; date?: string }>
): string {
  const cited = citations
    .slice(0, 10)
    .map((c) => `[txn:${shortId(c.id)} $${c.amount.toFixed(2)}]`)
    .join(" ");
  const footer = `\n\n---\n*${AI_DISCLAIMER}${cited ? ` Sources: ${cited}.` : ""}*`;
  return `${reply.trim()}${footer}`;
}

/** Rough token estimate (~4 chars per token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

// ---------------------------------------------------------------------------
// Insight generation (pure helper — route persists the results)
// ---------------------------------------------------------------------------

export interface InsightCandidate {
  title: string;
  body: string;
  type: string;
  severity: "info" | "warning" | "critical";
}

export interface InsightInputTxn {
  id: string;
  amount: number;
  type: string;
  category: string;
  merchantName?: string | null;
  date: Date | string;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/**
 * Deterministic insight candidates from transaction aggregates:
 * - overspend: a category exceeds its budget (or >40% of expenses with no budget)
 * - subscription-creep: recurring-merchant spend is material and concentrated
 * - large-txn: a single expense dwarfs the median (>=3x median and >=$200)
 */
export function generateInsightCandidates(args: {
  transactions: InsightInputTxn[];
  budgets: Array<{ category: string; amount: number }>;
  recurring?: Array<{ merchantName: string; amount: number; occurrences: number }>;
  largeTxnThreshold?: number;
}): InsightCandidate[] {
  const { transactions, budgets, recurring = [], largeTxnThreshold = 200 } = args;
  const out: InsightCandidate[] = [];

  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length === 0) return out;

  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const byCategory = new Map<string, number>();
  for (const t of expenses) {
    const c = t.category || "Other";
    byCategory.set(c, (byCategory.get(c) ?? 0) + t.amount);
  }

  // 1. Overspend vs budgets
  for (const b of budgets) {
    const spent = byCategory.get(b.category) ?? 0;
    if (b.amount > 0 && spent > b.amount) {
      const over = spent - b.amount;
      const pct = Math.round((over / b.amount) * 100);
      out.push({
        title: `Overspending in ${b.category}`,
        body:
          `You've spent $${spent.toFixed(2)} of your $${b.amount.toFixed(2)} ` +
          `${b.category} budget ($${over.toFixed(2)} / ${pct}% over). ` +
          `Consider trimming discretionary purchases in this category for the rest of the period.`,
        type: "overspend",
        severity: pct >= 25 ? "critical" : "warning",
      });
    }
  }
  // No-budget concentration fallback: single category > 40% of expenses
  if (budgets.length === 0 && totalExpenses > 0) {
    for (const [cat, amt] of [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1)) {
      const share = amt / totalExpenses;
      if (share > 0.4) {
        out.push({
          title: `Heavy spending concentration in ${cat}`,
          body:
            `${cat} accounts for $${amt.toFixed(2)} (${Math.round(share * 100)}%) of your ` +
            `recent $${totalExpenses.toFixed(2)} in expenses. Setting a monthly budget for ${cat} could help.`,
          type: "overspend",
          severity: "warning",
        });
      }
    }
  }

  // 2. Subscription creep: >=3 recurring merchants or recurring total >15% of expenses
  const recurringTotal = recurring.reduce((s, r) => s + r.amount * r.occurrences, 0);
  if (recurring.length >= 3 || (totalExpenses > 0 && recurringTotal / totalExpenses > 0.15)) {
    const top = [...recurring]
      .sort((a, b) => b.amount * b.occurrences - a.amount * a.occurrences)
      .slice(0, 3)
      .map((r) => `${r.merchantName} (~$${(r.amount * r.occurrences).toFixed(2)} over ${r.occurrences} charges)`)
      .join("; ");
    out.push({
      title: "Subscription creep detected",
      body:
        `Found ${recurring.length} recurring charge group${recurring.length === 1 ? "" : "s"} ` +
        `totaling ~$${recurringTotal.toFixed(2)} in the analyzed window` +
        (top ? `: ${top}.` : ".") +
        ` Review the Subscriptions tab and cancel anything you no longer use.`,
      type: "subscription_creep",
      severity: totalExpenses > 0 && recurringTotal / totalExpenses > 0.25 ? "warning" : "info",
    });
  }

  // 3. Large transactions: >= max(3x median, $threshold)
  const med = median(expenses.map((t) => t.amount));
  const bar = Math.max(med * 3, largeTxnThreshold);
  const large = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 3).filter((t) => t.amount >= bar);
  for (const t of large) {
    const d = typeof t.date === "string" ? t.date.slice(0, 10) : t.date.toISOString().split("T")[0];
    out.push({
      title: `Large transaction: $${t.amount.toFixed(2)}`,
      body:
        `A ${t.category} expense of $${t.amount.toFixed(2)} on ${d} ` +
        `(ref [txn:${shortId(t.id)}]) is well above your median expense of $${med.toFixed(2)}. ` +
        `Verify this was expected${t.merchantName ? ` (${t.merchantName})` : ""}.`,
      type: "large_transaction",
      severity: t.amount >= bar * 2 ? "warning" : "info",
    });
  }

  return out;
}
