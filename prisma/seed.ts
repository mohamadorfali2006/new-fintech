import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.financialInsight.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.bankConnection.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@newfintech.app",
      passwordHash: "$2a$10$XwJ9fB8kZPqGqR7T6vN3uOMzL1aBcDeFgHiJkLmNoPqRsTuVwX",
      currency: "USD",
      country: "US",
      timezone: "America/New_York",
      language: "en",
      theme: "system",
      notificationPrefs: "{}",
    },
  });

  console.log("✅ Created demo user:", demoUser.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Food & Dining", icon: "UtensilsCrossed", color: "#f59e0b" } }),
    prisma.category.create({ data: { name: "Shopping", icon: "ShoppingBag", color: "#8b5cf6" } }),
    prisma.category.create({ data: { name: "Transport", icon: "Car", color: "#3b82f6" } }),
    prisma.category.create({ data: { name: "Entertainment", icon: "Film", color: "#ec4899" } }),
    prisma.category.create({ data: { name: "Bills & Utilities", icon: "FileText", color: "#ef4444" } }),
    prisma.category.create({ data: { name: "Health", icon: "Heart", color: "#10b981" } }),
    prisma.category.create({ data: { name: "Income", icon: "TrendingUp", color: "#10b981" } }),
    prisma.category.create({ data: { name: "Transfer", icon: "ArrowLeftRight", color: "#6b7280" } }),
    prisma.category.create({ data: { name: "Other", icon: "MoreHorizontal", color: "#6b7280" } }),
  ]);

  console.log("✅ Created", categories.length, "categories");

  // Create bank account
  const account = await prisma.bankAccount.create({
    data: {
      userId: demoUser.id,
      institutionName: "Chase Bank",
      accountType: "checking",
      accountName: "Chase Total Checking",
      accountNumber: "•••• 4521",
      currency: "USD",
      balance: 5432.18,
      availableBalance: 5100.00,
    },
  });

  console.log("✅ Created bank account");

  // Generate realistic transactions
  const merchants = [
    { name: "Whole Foods Market", cat: "Food & Dining", type: "expense" },
    { name: "Shell Gas Station", cat: "Transport", type: "expense" },
    { name: "Netflix", cat: "Entertainment", type: "expense" },
    { name: "Spotify", cat: "Entertainment", type: "expense" },
    { name: "Amazon", cat: "Shopping", type: "expense" },
    { name: "Uber", cat: "Transport", type: "expense" },
    { name: "Starbucks", cat: "Food & Dining", type: "expense" },
    { name: "Exxon Mobil", cat: "Transport", type: "expense" },
    { name: "Target", cat: "Shopping", type: "expense" },
    { name: "Walmart", cat: "Shopping", type: "expense" },
    { name: "Electric Company", cat: "Bills & Utilities", type: "expense" },
    { name: "Water Department", cat: "Bills & Utilities", type: "expense" },
    { name: "Internet Provider", cat: "Bills & Utilities", type: "expense" },
    { name: "Hulu", cat: "Entertainment", type: "expense" },
    { name: "Disney+", cat: "Entertainment", type: "expense" },
    { name: "McDonald's", cat: "Food & Dining", type: "expense" },
    { name: "Chipotle", cat: "Food & Dining", type: "expense" },
    { name: "Trader Joe's", cat: "Food & Dining", type: "expense" },
    { name: "CVS Pharmacy", cat: "Health", type: "expense" },
    { name: "Doctor's Office", cat: "Health", type: "expense" },
    { name: "Paycheck", cat: "Income", type: "income" },
    { name: "Freelance Payment", cat: "Income", type: "income" },
    { name: "Transfer to Savings", cat: "Transfer", type: "expense" },
    { name: "Transfer from Savings", cat: "Transfer", type: "income" },
  ];

  const now = new Date();
  const transactions = [];

  for (let i = 0; i < 40; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const daysAgo = Math.floor(Math.random() * 90);
    const transactionDate = new Date(now);
    transactionDate.setDate(transactionDate.getDate() - daysAgo);

    const amount = merchant.type === "income"
      ? Math.round((Math.random() * 3000 + 2000) * 100) / 100
      : Math.round(Math.random() * 150 + 5 * 100) / 100;

    transactions.push({
      userId: demoUser.id,
      accountId: account.id,
      amount,
      type: merchant.type,
      merchantName: merchant.name,
      category: merchant.cat,
      date: transactionDate,
      status: "posted",
      isReviewed: Math.random() > 0.3,
    });
  }

  // Sort by date descending
  transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

  await prisma.transaction.createMany({ data: transactions });
  console.log("✅ Created", transactions.length, "transactions");

  // Create budgets
  await Promise.all([
    prisma.budget.create({
      data: {
        userId: demoUser.id,
        category: "Food & Dining",
        amount: 600,
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    }),
    prisma.budget.create({
      data: {
        userId: demoUser.id,
        category: "Shopping",
        amount: 400,
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    }),
    prisma.budget.create({
      data: {
        userId: demoUser.id,
        category: "Entertainment",
        amount: 100,
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    }),
    prisma.budget.create({
      data: {
        userId: demoUser.id,
        category: "Transport",
        amount: 200,
        period: "monthly",
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    }),
  ]);

  console.log("✅ Created budgets");

  // Create subscriptions
  await Promise.all([
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        merchantName: "Netflix",
        amount: 15.99,
        currency: "USD",
        frequency: "monthly",
        nextPaymentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
        category: "Entertainment",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        merchantName: "Spotify Premium",
        amount: 10.99,
        currency: "USD",
        frequency: "monthly",
        nextPaymentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12),
        category: "Entertainment",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        merchantName: "Hulu",
        amount: 7.99,
        currency: "USD",
        frequency: "monthly",
        nextPaymentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 18),
        category: "Entertainment",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        merchantName: "Internet Provider",
        amount: 65.00,
        currency: "USD",
        frequency: "monthly",
        nextPaymentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 25),
        category: "Bills & Utilities",
      },
    }),
    prisma.subscription.create({
      data: {
        userId: demoUser.id,
        merchantName: "Gym Membership",
        amount: 49.99,
        currency: "USD",
        frequency: "monthly",
        nextPaymentDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8),
        category: "Health",
      },
    }),
  ]);

  console.log("✅ Created subscriptions");

  // Calculate totals for insights
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  await prisma.financialInsight.create({
    data: {
      userId: demoUser.id,
      title: "Spending Overview",
      body: `You've spent $${totalExpenses.toFixed(2)} across ${transactions.filter(t => t.type === "expense").length} transactions this period, with $${totalIncome.toFixed(2)} in income. Your top spending categories are Food & Dining and Shopping.`,
      type: "spending",
      severity: "info",
    },
  });

  await prisma.financialInsight.create({
    data: {
      userId: demoUser.id,
      title: "Budget Tip",
      body: "Your Food & Dining spending is trending above average. Consider setting a weekly grocery budget to keep costs in check.",
      type: "budget",
      severity: "warning",
    },
  });

  await prisma.financialInsight.create({
    data: {
      userId: demoUser.id,
      title: "Subscription Alert",
      body: "You have 5 active subscriptions totaling $149.96/month. Review them regularly to catch unused services.",
      type: "subscription",
      severity: "info",
    },
  });

  console.log("✅ Created insights and notifications");
  console.log("\n🎉 Seeding complete!");
  console.log("📧 Demo login: demo@newfintech.app");
  console.log("🔑 Any password works in demo mode");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
