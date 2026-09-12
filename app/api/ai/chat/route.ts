import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import {
  appendDisclaimer,
  buildMinimizedContext,
  buildSystemPrompt,
  estimateTokens,
} from "@/lib/ai/safety";
import {
  consumeAiTokens,
  DAILY_AI_TOKEN_CAP,
  RESERVED_COMPLETION_TOKENS,
} from "@/lib/rate-limit";

const historyItemSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(2000),
});

const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, "Message is required")
    .max(2000, "Message must be at most 2000 characters"),
  history: z
    .array(historyItemSchema)
    .max(6, "History must contain at most 6 messages")
    .optional()
    .default([]),
  // Opt-in: include raw merchant names in the LLM prompt. Default false —
  // the model gets category aggregates + anonymized citation IDs instead.
  includeMerchantNames: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const message = parsed.data.message.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    // Already capped at 6 by validation; slice is defense in depth.
    const history = parsed.data.history.slice(-6);
    const includeMerchantNames = parsed.data.includeMerchantNames ?? false;

    // Fetch last 100 transactions for the current user
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        isDeleted: false,
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id },
    });

    const accounts = await prisma.bankAccount.findMany({
      where: { userId: session.user.id, isDeleted: false },
    });

    // Calculate financial context
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryTotals: Record<string, number> = {};
    const merchantTotals: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "income") {
        totalIncome += tx.amount;
      } else {
        totalExpenses += tx.amount;
        const cat = tx.category || "Other";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;

        const merch = tx.merchantName || "Unknown";
        merchantTotals[merch] = (merchantTotals[merch] || 0) + tx.amount;
      }
    });

    const netCashFlow = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((netCashFlow / totalIncome) * 100) : 0;

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topMerchants = Object.entries(merchantTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    // PII-minimized context: aggregates by default, raw merchant names only on opt-in.
    const minimized = buildMinimizedContext({
      transactions,
      totalIncome,
      totalExpenses,
      netCashFlow,
      savingsRate,
      topCategories,
      topMerchants,
      budgets: budgets.map((b) => ({ category: b.category, amount: b.amount })),
      accountCount: accounts.length,
      totalBalance,
      includeMerchantNames,
    });

    const systemPrompt = buildSystemPrompt(minimized.summaryText);

    // Per-user daily token cap (prompt estimate + reserved completion).
    const historyText = history.map((h) => h.content).join("\n");
    const estimatedTokens =
      estimateTokens(`${systemPrompt}\n${historyText}\n${message}`) + RESERVED_COMPLETION_TOKENS;
    const budget = consumeAiTokens(session.user.id, estimatedTokens);
    if (!budget.allowed) {
      return NextResponse.json(
        {
          error: "Daily AI token budget exceeded. Please try again tomorrow.",
          tokenUsage: {
            used: budget.used,
            remaining: budget.remaining,
            cap: DAILY_AI_TOKEN_CAP,
          },
        },
        { status: 429 }
      );
    }
    const tokenUsage = {
      used: budget.used,
      remaining: budget.remaining,
      cap: DAILY_AI_TOKEN_CAP,
    };

    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (apiKey) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...history,
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const rawReply: string | undefined = aiData.choices?.[0]?.message?.content;
          if (rawReply) {
            const reply = appendDisclaimer(rawReply, minimized.citations);
            return NextResponse.json({
              reply,
              metrics: {
                totalIncome,
                totalExpenses,
                netCashFlow,
                savingsRate,
              },
              citations: minimized.citations,
              piiMinimized: true,
              merchantNamesIncluded: minimized.merchantNamesIncluded,
              tokenUsage,
            });
          }
        }
      } catch (aiErr) {
        console.warn("AI API fetch failed, falling back to mock response:", aiErr);
      }
    }

    // Helpful mock response generation based on transactions
    // (local-only fallback — no data leaves the server; own merchant names OK here).
    const query = message.toLowerCase();
    let reply = "";

    if (transactions.length === 0) {
      reply =
        "You don't have any transactions recorded yet! Once you connect a bank account or start tracking your expenses, I can analyze your spending patterns, identify recurring subscriptions, and recommend savings targets.";
    } else if (query.includes("food") || query.includes("dining") || query.includes("groceries") || query.includes("restaurant")) {
      const foodSpent = (categoryTotals["Food & Dining"] || 0) + (categoryTotals["Groceries"] || 0);
      reply = `Based on your recent transactions, you have spent **$${foodSpent.toFixed(
        2
      )}** on food and groceries.\n\n• Food & Dining: **$${(categoryTotals["Food & Dining"] || 0).toFixed(
        2
      )}**\n• Groceries: **$${(categoryTotals["Groceries"] || 0).toFixed(
        2
      )}**\n\nThis represents approximately **${
        totalExpenses > 0 ? Math.round((foodSpent / totalExpenses) * 100) : 0
      }%** of your total recorded expenses. Consider setting a monthly food budget to keep spending steady.`;
    } else if (query.includes("top") || query.includes("largest") || query.includes("category") || query.includes("where")) {
      const topList = topCategories
        .map(([c, a], i) => `${i + 1}. **${c}**: $${a.toFixed(2)} (${Math.round((a / (totalExpenses || 1)) * 100)}%)`)
        .join("\n");
      reply = `Here are your top spending categories from your last ${transactions.length} transactions:\n\n${topList}\n\nYour highest single category is **${
        topCategories[0]?.[0] || "None"
      }** totaling **$${(topCategories[0]?.[1] || 0).toFixed(2)}**.`;
    } else if (query.includes("save") || query.includes("savings") || query.includes("rate") || query.includes("cut")) {
      reply = `Your current estimated savings rate is **${savingsRate}%**.\n\n• Total Income: **$${totalIncome.toFixed(
        2
      )}**\n• Total Expenses: **$${totalExpenses.toFixed(2)}**\n• Net Surplus: **$${netCashFlow.toFixed(
        2
      )}**\n\n💡 **Actionable Tip**: Reducing spending in your top category (**${
        topCategories[0]?.[0] || "General"
      }**) by just 10% would save you **$${((topCategories[0]?.[1] || 0) * 0.1).toFixed(2)}** per month!`;
    } else if (query.includes("subscription") || query.includes("recurring")) {
      const subscriptions = topMerchants.filter(([name]) =>
        ["netflix", "spotify", "apple", "amazon", "gym", "google", "icloud", "chatgpt"].some((s) =>
          name.toLowerCase().includes(s)
        )
      );
      if (subscriptions.length > 0) {
        reply = `I identified recurring subscriptions from your transaction history:\n\n${subscriptions
          .map(([name, cost]) => `• **${name}**: ~$${cost.toFixed(2)}`)
          .join("\n")}\n\nCheck the **Subscriptions** tab to manage upcoming renewal dates and cancel unused services.`;
      } else {
        reply = `You have recurring expenses across major merchants such as **${
          topMerchants[0]?.[0] || "various merchants"
        }**. You can view and manage recurring bills under the Subscriptions tab!`;
      }
    } else if (query.includes("budget") || query.includes("over")) {
      if (budgets.length > 0) {
        reply = `You have **${budgets.length}** active budgets configured.\n\n${budgets
          .map((b) => {
            const spent = categoryTotals[b.category] || 0;
            const status = spent > b.amount ? "⚠️ Over budget" : "✅ On track";
            return `• **${b.category}**: $${spent.toFixed(2)} of $${b.amount.toFixed(2)} (${status})`;
          })
          .join("\n")}\n\nStay on top of limits in the Budgets section!`;
      } else {
        reply = `You haven't set any budgets yet! Setting monthly budgets for top categories like **${
          topCategories[0]?.[0] || "Food & Dining"
        }** and **${topCategories[1]?.[0] || "Entertainment"}** will alert you before you overspend.`;
      }
    } else {
      reply = `Here is your financial snapshot based on your last ${transactions.length} transactions:\n\n• **Total Inflow**: $${totalIncome.toFixed(
        2
      )}\n• **Total Outflow**: $${totalExpenses.toFixed(2)}\n• **Net Cash Flow**: $${netCashFlow.toFixed(
        2
      )}\n• **Top Category**: ${topCategories[0]?.[0] || "None"} ($${(topCategories[0]?.[1] || 0).toFixed(
        2
      )})\n• **Connected Accounts Balance**: $${totalBalance.toFixed(
        2
      )}\n\nFeel free to ask me specific questions such as *"How much did I spend on food?"*, *"What are my top 3 expenses?"*, or *"How much can I save?"*!`;
    }

    return NextResponse.json({
      reply: appendDisclaimer(reply, minimized.citations),
      metrics: {
        totalIncome,
        totalExpenses,
        netCashFlow,
        savingsRate,
      },
      citations: minimized.citations,
      piiMinimized: true,
      merchantNamesIncluded: minimized.merchantNamesIncluded,
      tokenUsage,
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
