import { db, pool } from "./db";
import { portraitStyles, subscriptionPlans } from "@shared/schema";
import { portraitStyles as styleOptions } from "../client/src/lib/portrait-styles";
import { eq, notInArray } from "drizzle-orm";

const planDefinitions = [
  { id: 1, name: "Small Community", description: "For communities up to 100 homes. Unlimited portraits.", priceAnnualCents: 49900, sizeTier: "small", maxHomes: 100, isActive: true },
  { id: 2, name: "Medium Community", description: "For communities of 101-300 homes. Unlimited portraits.", priceAnnualCents: 79900, sizeTier: "medium", maxHomes: 300, isActive: true },
  { id: 3, name: "Large Community", description: "For communities of 301+ homes. Unlimited portraits.", priceAnnualCents: 119900, sizeTier: "large", maxHomes: 999999, isActive: true },
];

export async function seedDatabase() {
  console.log("Checking if seed data exists...");

  // ─── Migrations ───
  try {
    const migTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000));
    await Promise.race([
      (async () => {
        await pool.query("SET LOCAL statement_timeout = 8000");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS community_code VARCHAR(20) UNIQUE");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS total_homes INTEGER");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP");
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP");
        console.log("[migration] Community org columns ready");

        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_annual_cents INTEGER");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS size_tier TEXT");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_homes INTEGER");
        console.log("[migration] Subscription plan tier columns ready");

        await pool.query(`CREATE TABLE IF NOT EXISTS residents (
          id SERIAL PRIMARY KEY, supabase_auth_id VARCHAR NOT NULL, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          home_number VARCHAR(20) NOT NULL, display_name TEXT, email TEXT NOT NULL, phone TEXT, role TEXT NOT NULL DEFAULT 'resident',
          notification_preference TEXT DEFAULT 'email', is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        console.log("[migration] Residents table ready");

        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE");
        await pool.query("ALTER TABLE portraits ADD COLUMN IF NOT EXISTS opt_out_gallery BOOLEAN DEFAULT false NOT NULL");
        await pool.query("ALTER TABLE portraits ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL");
        console.log("[migration] Dogs + portrait gallery fields ready");

        await pool.query(`CREATE TABLE IF NOT EXISTS portrait_likes (
          id SERIAL PRIMARY KEY, portrait_id INTEGER NOT NULL REFERENCES portraits(id) ON DELETE CASCADE,
          resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, UNIQUE(portrait_id, resident_id)
        )`);
        console.log("[migration] Portrait likes ready");

        await pool.query(`CREATE TABLE IF NOT EXISTS calendar_projects (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE, dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
          calendar_year INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'uploading', uploaded_photo_count INTEGER NOT NULL DEFAULT 0,
          generated_image_count INTEGER NOT NULL DEFAULT 0, selected_image_count INTEGER NOT NULL DEFAULT 0, price_cents INTEGER NOT NULL DEFAULT 7500,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS calendar_project_images (
          id SERIAL PRIMARY KEY, calendar_project_id INTEGER NOT NULL REFERENCES calendar_projects(id) ON DELETE CASCADE,
          image_type TEXT NOT NULL, image_url TEXT NOT NULL, style_id INTEGER REFERENCES portrait_styles(id),
          month_assignment INTEGER, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS pet_wall_periods (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          quarter INTEGER NOT NULL, year INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          finalized_at TIMESTAMP, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, UNIQUE(organization_id, year, quarter)
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS pet_wall_entries (
          id SERIAL PRIMARY KEY, pet_wall_period_id INTEGER NOT NULL REFERENCES pet_wall_periods(id) ON DELETE CASCADE,
          portrait_id INTEGER NOT NULL REFERENCES portraits(id), rank INTEGER NOT NULL,
          like_count_at_selection INTEGER NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER REFERENCES residents(id) ON DELETE SET NULL, channel TEXT NOT NULL,
          recipient_address TEXT NOT NULL, subject TEXT, message_body TEXT NOT NULL, notification_type TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', sent_at TIMESTAMP, error TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`);
        console.log("[migration] All future tables ready");

        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id)");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS fulfillment_provider TEXT DEFAULT 'printful'");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS external_order_id TEXT");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS external_status TEXT");
        await pool.query("ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS calendar_project_id INTEGER");
        await pool.query("ALTER TABLE merch_earnings ADD COLUMN IF NOT EXISTS community_share_cents INTEGER");
        await pool.query("ALTER TABLE merch_earnings ADD COLUMN IF NOT EXISTS platform_share_cents INTEGER");
        console.log("[migration] All Communities tables ready");
      })(),
      migTimeout,
    ]);
  } catch (migErr: any) {
    console.log("[migration] Communities migrations:", migErr.message);
  }

  // ─── Seed Plans ───
  const existingPlans = await db.select().from(subscriptionPlans);
  const planMap = new Map(existingPlans.map((p) => [p.id, p]));
  for (const plan of planDefinitions) {
    const existing = planMap.get(plan.id);
    if (!existing) {
      await db.insert(subscriptionPlans).values(plan as any).onConflictDoNothing();
    } else {
      const updates: Record<string, any> = {};
      if (existing.priceAnnualCents !== plan.priceAnnualCents) updates.priceAnnualCents = plan.priceAnnualCents;
      if (existing.sizeTier !== plan.sizeTier) updates.sizeTier = plan.sizeTier;
      if (existing.maxHomes !== plan.maxHomes) updates.maxHomes = plan.maxHomes;
      if (existing.name !== plan.name) updates.name = plan.name;
      if (Object.keys(updates).length > 0) await db.update(subscriptionPlans).set(updates).where(eq(subscriptionPlans.id, plan.id));
    }
  }

  // ─── Seed Styles ───
  const existingStyles = await db.select().from(portraitStyles);
  const styleMap = new Map(existingStyles.map((s) => [s.id, s]));
  const missing = styleOptions.filter((s) => !styleMap.has(s.id));
  if (missing.length > 0) {
    for (const style of missing) {
      await db.insert(portraitStyles).values({ id: style.id, name: style.name, description: style.description, promptTemplate: style.promptTemplate, category: style.category }).onConflictDoNothing();
    }
    console.log(`Seeded ${missing.length} portrait styles`);
  }

  let updated = 0;
  for (const style of styleOptions) {
    const e = styleMap.get(style.id);
    if (e && (e.name !== style.name || e.description !== style.description || e.promptTemplate !== style.promptTemplate || e.category !== style.category)) {
      await db.update(portraitStyles).set({ name: style.name, description: style.description, promptTemplate: style.promptTemplate, category: style.category }).where(eq(portraitStyles.id, style.id));
      updated++;
    }
  }
  if (updated > 0) console.log(`Updated ${updated} portrait styles`);

  const validIds = styleOptions.map(s => s.id);
  const stale = existingStyles.filter(s => !validIds.includes(s.id));
  if (stale.length > 0) {
    await db.delete(portraitStyles).where(notInArray(portraitStyles.id, validIds));
    console.log(`Removed ${stale.length} stale styles`);
  }

  console.log("Database seeding complete!");
}
