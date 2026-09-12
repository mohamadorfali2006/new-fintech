/**
 * Bank Integration Abstraction Layer
 *
 * Provides a consistent interface for multiple banking providers.
 * New providers can be added without changing the rest of the app.
 *
 * Architecture:
 *   BankProvider (interface)
 *     ├── MockProvider (demo / development)
 *     ├── PlaidProvider (production, US/EEA)
 *     ├── TrueLayerProvider (production, UK/EEA)
 *     └── TellerProvider (production, US)
 *
 * All providers normalize data into our internal Transaction/Account shapes.
 */

export interface AccountInfo {
  institutionName: string;
  institutionId: string;
  accountName: string;
  accountType: "checking" | "savings" | "credit" | "investment";
  accountNumber: string; // last-4 or masked
  currency: string;
  balance: number;
  availableBalance: number;
  accountId: string;
}

export interface RawTransaction {
  id: string;
  accountId: string;
  amount: number;
  type: "income" | "expense";
  description?: string;
  merchantName?: string;
  date: Date;
  status: "posted" | "pending";
  originalData?: Record<string, unknown>;
}

export interface BankProvider {
  readonly name: string;
  connect(): Promise<{ success: boolean; url?: string; error?: string }>;
  disconnect(connectionId: string): Promise<{ success: boolean }>;
  sync(connectionId: string): Promise<{
    accounts: AccountInfo[];
    transactions: RawTransaction[];
    lastSyncedAt: Date;
    error?: string;
  }>;
  getInstitutions(): Promise<Array<{ id: string; name: string; logoUrl?: string }>>;
}

// ── Mock Provider ────────────────────────────────────────────────────────────
// Used when real API keys are not available.
// Returns realistic but fictional data so the app is fully usable in demo mode.

const MOCK_INSTITUTIONS = [
  { id: "ins_chase", name: "Chase Bank", logoUrl: "/institutions/chase.svg" },
  { id: "ins_bofa", name: "Bank of America", logoUrl: "/institutions/bofa.svg" },
  { id: "ins_wells", name: "Wells Fargo", logoUrl: "/institutions/wells.svg" },
  { id: "ins_citi", name: "Citibank", logoUrl: "/institutions/citi.svg" },
  { id: "ins_capone", name: "Capital One", logoUrl: "/institutions/capone.svg" },
  { id: "ins_amex", name: "American Express", logoUrl: "/institutions/amex.svg" },
  { id: "ins_discover", name: "Discover", logoUrl: "/institutions/discover.svg" },
  { id: "ins_schwab", name: "Charles Schwab", logoUrl: "/institutions/schwab.svg" },
];

const MOCK_ACCOUNTS = [
  {
    id: "acc_chk_1",
    institutionId: "ins_chase",
    institutionName: "Chase Bank",
    accountName: "Total Checking",
    accountType: "checking" as const,
    accountNumber: "****4521",
    currency: "USD",
    balance: 4823.67,
    availableBalance: 4623.67,
  },
  {
    id: "acc_sav_1",
    institutionId: "ins_chase",
    institutionName: "Chase Bank",
    accountName: "Freedom Savings",
    accountType: "savings" as const,
    accountNumber: "****8834",
    currency: "USD",
    balance: 12450.0,
    availableBalance: 12450.0,
  },
  {
    id: "acc_cc_1",
    institutionId: "ins_amex",
    institutionName: "American Express",
    accountName: "Gold Card",
    accountType: "credit" as const,
    accountNumber: "****1122",
    currency: "USD",
    balance: -1247.83,
    availableBalance: -1247.83,
  },
  {
    id: "acc_cc_2",
    institutionId: "ins_discover",
    institutionName: "Discover",
    accountName: "Cashback Card",
    accountType: "credit" as const,
    accountNumber: "****3344",
    currency: "USD",
    balance: -389.42,
    availableBalance: -389.42,
  },
];

// Realistic 90-day transaction stream
function buildMockTransactions(accountId: string): RawTransaction[] {
  const merchants: Array<{ merchant: string; category: string; min: number; max: number }> = [
    { merchant: "Whole Foods Market", category: "groceries", min: 30, max: 180 },
    { merchant: "Target", category: "shopping", min: 25, max: 150 },
    { merchant: "Amazon", category: "shopping", min: 15, max: 200 },
    { merchant: "Starbucks", category: "food_dining", min: 5, max: 12 },
    { merchant: "McDonald's", category: "food_dining", min: 8, max: 20 },
    { merchant: "Uber", category: "transportation", min: 8, max: 45 },
    { merchant: "Lyft", category: "transportation", min: 10, max: 50 },
    { merchant: "Shell Gas", category: "transportation", min: 30, max: 80 },
    { merchant: "Netflix", category: "subscriptions", min: 15.99, max: 15.99 },
    { merchant: "Spotify", category: "subscriptions", min: 9.99, max: 9.99 },
    { merchant: "Adobe Creative Cloud", category: "subscriptions", min: 52.99, max: 52.99 },
    { merchant: "Gym Membership", category: "healthcare", min: 49, max: 49 },
    { merchant: "Electric Co", category: "utilities", min: 80, max: 140 },
    { merchant: "Water Department", category: "utilities", min: 40, max: 70 },
    { merchant: "Internet Provider", category: "utilities", min: 60, max: 80 },
    { merchant: "Rent Payment", category: "housing", min: 1800, max: 1800 },
    { merchant: "Salary Deposit", category: "income", min: 4200, max: 4200 },
    { merchant: "Freelance Payment", category: "income", min: 800, max: 2500 },
    { merchant: "Trader Joe's", category: "groceries", min: 25, max: 90 },
    { merchant: "Chipotle", category: "food_dining", min: 10, max: 25 },
    { merchant: "Walgreens", category: "personal_care", min: 10, max: 40 },
    { merchant: "CVS Pharmacy", category: "healthcare", min: 15, max: 60 },
    { merchant: "Best Buy", category: "shopping", min: 50, max: 600 },
    { merchant: "Home Depot", category: "housing", min: 40, max: 300 },
    { merchant: "Delta Airlines", category: "travel", min: 200, max: 800 },
  ];

  const now = new Date();
  const transactions: RawTransaction[] = [];
  let id = 0;

  // Salary deposits (twice a month)
  for (let m = 2; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    d.setMonth(d.getMonth() - m);
    const payday1 = new Date(d.getFullYear(), d.getMonth(), 15);
    const payday2 = new Date(d.getFullYear(), d.getMonth(), 30);
    if (payday2 > now) continue;
    for (const payday of [payday1, payday2]) {
      if (payday > now) continue;
      transactions.push({
        id: `txn_${id++}`,
        accountId,
        amount: 4200,
        type: "income",
        merchantName: "Salary Deposit",
        description: "Monthly Salary",
        date: payday,
        status: "posted",
        originalData: { provider: "mock", payroll: true },
      });
    }
  }

  // Monthly subscriptions
  for (let m = 8; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    d.setMonth(d.getMonth() - m);
    for (const sub of [
      { merchant: "Netflix", amount: 15.99 },
      { merchant: "Spotify", amount: 9.99 },
      { merchant: "Adobe Creative Cloud", amount: 52.99 },
    ]) {
      const date = new Date(d.getFullYear(), d.getMonth(), 5 + Math.random() * 10);
      if (date > now) continue;
      transactions.push({
        id: `txn_${id++}`,
        accountId,
        amount,
        type: "expense",
        merchantName: sub.merchant,
        description: `Monthly subscription - ${sub.merchant}`,
        date,
        status: "posted",
        originalData: { provider: "mock", recurring: true },
      });
    }
  }

  // Random daily spending
  for (const merchant of merchants) {
    if (merchant.category === "income") continue;
    const count = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < count; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 28) + 1
      );
      if (d > now) continue;
      transactions.push({
        id: `txn_${id++}`,
        accountId,
        amount: Math.round((merchant.min + Math.random() * (merchant.max - merchant.min)) * 100) / 100,
        type: "expense",
        merchantName: merchant.merchant,
        description: undefined,
        date: d,
        status: "posted",
        originalData: { provider: "mock" },
      });
    }
  }

  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const mockProvider: BankProvider = {
  name: "demo",
  async connect() {
    return { success: true };
  },
  async disconnect() {
    return { success: true };
  },
  async sync() {
    const accounts: AccountInfo[] = MOCK_ACCOUNTS.map((a) => ({
      ...a,
      accountId: a.id,
    }));
    const transactions: RawTransaction[] = [];
    for (const acc of MOCK_ACCOUNTS) {
      for (const txn of buildMockTransactions(acc.id)) {
        transactions.push(txn);
      }
    }
    return {
      accounts,
      transactions,
      lastSyncedAt: new Date(),
    };
  },
  async getInstitutions() {
    return MOCK_INSTITUTIONS;
  },
};

// Provider registry — add new providers here without touching app code.
const providers: Record<string, BankProvider> = {
  mock: mockProvider,
  // plaid: new PlaidProvider({...}),
  // truelayer: new TrueLayerProvider({...}),
  // teller: new TellerProvider({...}),
};

export function getProvider(name: string): BankProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown bank provider: ${name}`);
  return provider;
}

export { MOCK_INSTITUTIONS, MOCK_ACCOUNTS };
