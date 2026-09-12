import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

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

    const apiKey = process.env.AI_API_KEY;
    const baseUrl = process.env.AI_BASE_URL || "https://api.openai.com/v1";
    const model = process.env.AI_MODEL || "gpt-4o-mini";

    if (apiKey) {
      try {
        const systemPrompt = `You are NewFinTech's AI financial intelligence assistant.
Analyze the user's financial queries based strictly on their transaction data and portfolio context provided below.
Be concise, clear, encouraging, and accurate. Format numbers nicely as currency (USD).
If suggesting actions, keep them practical and grounded.

User Financial Summary:
- Accounts Total Balance: $${totalBalance.toFixed(2)} across ${accounts.length} accounts
- Recent Total Income (last ${transactions.length} txns): $${totalIncome.toFixed(2)}
- Recent Total Expenses: $${totalExpenses.toFixed(2)}
- Net Cash Flow: $${netCashFlow.toFixed(2)}
- Savings Rate: ${savingsRate}%
- Top Categories: ${topCategories.map(([c, a]) => `${c}: $${a.toFixed(2)}`).join(", ") || "None"}
- Top Merchants: ${topMerchants.map(([m, a]) => `${m}: $${a.toFixed(2)}`).join(", ") || "None"}
- Active Budgets: ${budgets.map((b) => `${b.category}: $${b.amount}/mo`).join(", ") || "None"}
- Recent 10 Transactions:
${transactions
  .slice(0, 10)
  .map(
    (t) =>
      `• ${t.date.toISOString().split("T")[0]} | ${t.merchantName || "Unknown"} | ${t.type.toUpperCase()} | $${t.amount.toFixed(2)} | ${t.category}`
  )
  .join("\n")}
`;

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
              ...(body.history || []).slice(-6),
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          const reply = aiData.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({
              reply,
              metrics: {
                totalIncome,
                totalExpenses,
                netCashFlow,
                savingsRate,
              },
            });
          }
        }
      } catch (aiErr) {
        console.warn("AI API fetch failed, falling back to mock response:", aiErr);
      }
    }

    // Helpful mock response generation based on transactions
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
      reply,
      metrics: {
        totalIncome,
        totalExpenses,
        netCashFlow,
        savingsRate,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json({ error: "Failed to process chat message" }, { status: 500 });
  }
}
