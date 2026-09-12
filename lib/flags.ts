/**
 * Feature flags for bank rails. Mock is ALWAYS the default;
 * real/sandbox providers stay off unless explicitly enabled.
 *
 *   BANK_PLAID_ENABLED=true   → allow the `plaid-sandbox` provider stub.
 *   (unset / anything else)   → mock only; requesting another provider 400s.
 */

/** True only when the operator explicitly opted into the Plaid sandbox stub. */
export function isPlaidEnabled(): boolean {
  return process.env.BANK_PLAID_ENABLED === "true";
}

/** Provider name to use when none is specified. Always "mock" unless flagged. */
export function getDefaultBankProvider(): string {
  return isPlaidEnabled() ? "plaid-sandbox" : "mock";
}

/** Guard helper — throws when a non-mock provider is requested while disabled. */
export function assertProviderAllowed(provider: string): void {
  if (provider === "mock") return;
  if (provider === "plaid-sandbox" && isPlaidEnabled()) return;
  throw new Error(
    `Bank provider "${provider}" is disabled. ` +
      `Set BANK_PLAID_ENABLED=true to enable the sandbox stub (default: mock).`
  );
}
