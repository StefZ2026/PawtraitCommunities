// Stripe Connect — 85/15 revenue split (platform 85%, community 15%)
import { getStripe } from "./stripe";
import { pool } from "./db";
import { storage } from "./storage";

// Create a Connect onboarding link for a community
export async function createConnectOnboarding(orgId: number, returnUrl: string): Promise<string> {
  const org = await storage.getOrganization(orgId);
  if (!org) throw new Error("Organization not found");

  const s = getStripe();
  let accountId = org.stripeConnectAccountId;

  if (!accountId) {
    const account = await s.accounts.create({
      type: "express",
      country: "US",
      email: org.contactEmail || undefined,
      metadata: { orgId: String(orgId) },
      capabilities: { transfers: { requested: true } },
    });
    accountId = account.id;
    await pool.query("UPDATE organizations SET stripe_connect_account_id = $1 WHERE id = $2", [accountId, orgId]);
  }

  const link = await s.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?refresh=true`,
    return_url: `${returnUrl}?connected=true`,
    type: "account_onboarding",
  });

  return link.url;
}

// Check if Connect account is ready for payouts
export async function checkConnectStatus(orgId: number): Promise<{ ready: boolean; accountId: string | null }> {
  const org = await storage.getOrganization(orgId);
  if (!org?.stripeConnectAccountId) return { ready: false, accountId: null };

  const s = getStripe();
  const account = await s.accounts.retrieve(org.stripeConnectAccountId);
  const ready = account.charges_enabled && account.payouts_enabled;

  if (ready && !org.stripeConnectOnboardingComplete) {
    await pool.query("UPDATE organizations SET stripe_connect_onboarding_complete = true WHERE id = $1", [orgId]);
  }

  return { ready: !!ready, accountId: org.stripeConnectAccountId };
}

// Record earnings and split for a merch order
export async function recordMerchEarnings(orderId: number, orgId: number, retailCents: number, wholesaleCents: number): Promise<void> {
  const marginCents = retailCents - wholesaleCents;
  const communityShareCents = Math.round(marginCents * 0.15); // 15% to community
  const platformShareCents = marginCents - communityShareCents; // 85% to platform

  await pool.query(
    `INSERT INTO merch_earnings (organization_id, merch_order_id, retail_cents, wholesale_cents, margin_cents, community_share_cents, platform_share_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [orgId, orderId, retailCents, wholesaleCents, marginCents, communityShareCents, platformShareCents]
  );
}

// Create a payout transfer to community's Connect account
export async function createPayout(orgId: number, amountCents: number, periodStart: Date, periodEnd: Date): Promise<string> {
  const org = await storage.getOrganization(orgId);
  if (!org?.stripeConnectAccountId) throw new Error("No Connect account");

  const s = getStripe();
  const transfer = await s.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: org.stripeConnectAccountId,
    metadata: { orgId: String(orgId), periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() },
  });

  await pool.query(
    `INSERT INTO merch_payouts (organization_id, amount_cents, stripe_transfer_id, period_start, period_end, status, initiated_by)
     VALUES ($1, $2, $3, $4, $5, 'completed', 'system')`,
    [orgId, amountCents, transfer.id, periodStart, periodEnd]
  );

  return transfer.id;
}
