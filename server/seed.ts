import { db, pool } from "./db";
import { portraitStyles, subscriptionPlans } from "@shared/schema";
import { portraitStyles as styleOptions } from "../client/src/lib/portrait-styles";
import { eq, notInArray } from "drizzle-orm";

const planDefinitions = [
  { id: 1, name: "Standard", description: "For communities up to 250 homes. Unlimited portraits.", priceAnnualCents: 39900, priceMonthlyCents: 3900, sizeTier: "standard", maxHomes: 250, isActive: true },
  { id: 2, name: "Growth", description: "For communities of 250-800 homes. Unlimited portraits.", priceAnnualCents: 79900, priceMonthlyCents: 7900, sizeTier: "growth", maxHomes: 800, isActive: true },
  { id: 3, name: "Signature", description: "For high-engagement and lifestyle communities. Unlimited portraits.", priceAnnualCents: 149900, priceMonthlyCents: 14900, sizeTier: "signature", maxHomes: 999999, isActive: true },
];

export async function seedDatabase() {
  console.log("Checking if seed data exists...");

  // ─── Create base tables (fresh database) ───
  try {
    const migTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 30000));
    await Promise.race([
      (async () => {
        // Users table (auth)
        await pool.query(`CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR UNIQUE, first_name VARCHAR, last_name VARCHAR,
          profile_image_url VARCHAR, terms_accepted_at TIMESTAMP, privacy_accepted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
        )`);
        console.log("[migration] Users table ready");

        // Subscription plans
        await pool.query(`CREATE TABLE IF NOT EXISTS subscription_plans (
          id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT,
          price_annual_cents INTEGER NOT NULL DEFAULT 0, size_tier TEXT NOT NULL DEFAULT 'small',
          max_homes INTEGER NOT NULL DEFAULT 100,
          stripe_product_id TEXT, stripe_price_id TEXT, stripe_live_price_id TEXT, stripe_product_live_id TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] Subscription plans table ready");

        // Organizations
        await pool.query(`CREATE TABLE IF NOT EXISTS organizations (
          id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
          community_code VARCHAR(20) UNIQUE, total_homes INTEGER,
          description TEXT, website_url TEXT, logo_url TEXT,
          contact_name TEXT, contact_email TEXT, contact_phone TEXT,
          social_facebook TEXT, social_instagram TEXT, social_nextdoor TEXT,
          location_street TEXT, location_city TEXT, location_state TEXT, location_zip TEXT, location_country TEXT,
          billing_street TEXT, billing_city TEXT, billing_state TEXT, billing_zip TEXT, billing_country TEXT,
          species_handled TEXT DEFAULT 'both', onboarding_completed BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true,
          owner_id VARCHAR, plan_id INTEGER REFERENCES subscription_plans(id),
          stripe_customer_id TEXT, stripe_subscription_id TEXT,
          subscription_status TEXT DEFAULT 'pending', subscription_start_date TIMESTAMP, subscription_end_date TIMESTAMP,
          stripe_connect_account_id TEXT, stripe_connect_onboarding_complete BOOLEAN DEFAULT false,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] Organizations table ready");

        // Residents
        await pool.query(`CREATE TABLE IF NOT EXISTS residents (
          id SERIAL PRIMARY KEY, supabase_auth_id VARCHAR NOT NULL,
          organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          home_number VARCHAR(20) NOT NULL, display_name TEXT, email TEXT NOT NULL, phone TEXT,
          role TEXT NOT NULL DEFAULT 'resident', notification_preference TEXT DEFAULT 'email',
          is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] Residents table ready");

        // Dogs
        await pool.query(`CREATE TABLE IF NOT EXISTS dogs (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE,
          name TEXT NOT NULL, species TEXT NOT NULL DEFAULT 'dog', breed TEXT, age TEXT, description TEXT,
          original_photo_url TEXT, is_available BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] Dogs table ready");

        // Portrait styles
        await pool.query(`CREATE TABLE IF NOT EXISTS portrait_styles (
          id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
          prompt_template TEXT NOT NULL, preview_image_url TEXT, category TEXT NOT NULL
        )`);
        console.log("[migration] Portrait styles table ready");

        // Portraits
        await pool.query(`CREATE TABLE IF NOT EXISTS portraits (
          id SERIAL PRIMARY KEY, dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
          style_id INTEGER NOT NULL REFERENCES portrait_styles(id),
          generated_image_url TEXT, previous_image_url TEXT, edit_count INTEGER NOT NULL DEFAULT 0,
          opt_out_gallery BOOLEAN NOT NULL DEFAULT false, like_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] Portraits table ready");

        // Portrait likes
        await pool.query(`CREATE TABLE IF NOT EXISTS portrait_likes (
          id SERIAL PRIMARY KEY, portrait_id INTEGER NOT NULL REFERENCES portraits(id) ON DELETE CASCADE,
          resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(portrait_id, resident_id)
        )`);
        console.log("[migration] Portrait likes ready");

        // Merch orders (future)
        await pool.query(`CREATE TABLE IF NOT EXISTS merch_orders (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER REFERENCES residents(id), dog_id INTEGER REFERENCES dogs(id),
          portrait_id INTEGER REFERENCES portraits(id),
          customer_name TEXT NOT NULL, customer_email TEXT, customer_phone TEXT,
          shipping_street TEXT NOT NULL, shipping_city TEXT NOT NULL, shipping_state TEXT NOT NULL,
          shipping_zip TEXT NOT NULL, shipping_country TEXT NOT NULL DEFAULT 'US',
          fulfillment_provider TEXT DEFAULT 'printful', external_order_id TEXT, external_status TEXT,
          stripe_payment_intent_id TEXT, total_cents INTEGER NOT NULL,
          shipping_cents INTEGER NOT NULL DEFAULT 0, tax_cents INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS merch_order_items (
          id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES merch_orders(id) ON DELETE CASCADE,
          product_key TEXT NOT NULL, variant_id INTEGER, quantity INTEGER NOT NULL DEFAULT 1,
          price_cents INTEGER NOT NULL, wholesale_cost_cents INTEGER, calendar_project_id INTEGER,
          occasion TEXT, artwork_url TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS merch_earnings (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id),
          merch_order_id INTEGER NOT NULL REFERENCES merch_orders(id),
          retail_cents INTEGER NOT NULL, wholesale_cents INTEGER NOT NULL, margin_cents INTEGER NOT NULL,
          community_share_cents INTEGER, platform_share_cents INTEGER, payout_id INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS merch_payouts (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id),
          amount_cents INTEGER NOT NULL, stripe_transfer_id TEXT,
          period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending', initiated_by TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMP
        )`);
        console.log("[migration] Merch tables ready");

        // Future tables
        await pool.query(`CREATE TABLE IF NOT EXISTS calendar_projects (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
          dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
          calendar_year INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'uploading',
          uploaded_photo_count INTEGER NOT NULL DEFAULT 0, generated_image_count INTEGER NOT NULL DEFAULT 0,
          selected_image_count INTEGER NOT NULL DEFAULT 0, price_cents INTEGER NOT NULL DEFAULT 7500,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS calendar_project_images (
          id SERIAL PRIMARY KEY, calendar_project_id INTEGER NOT NULL REFERENCES calendar_projects(id) ON DELETE CASCADE,
          image_type TEXT NOT NULL, image_url TEXT NOT NULL, style_id INTEGER REFERENCES portrait_styles(id),
          month_assignment INTEGER, sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS pet_wall_periods (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          quarter INTEGER NOT NULL, year INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          finalized_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(organization_id, year, quarter)
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS pet_wall_entries (
          id SERIAL PRIMARY KEY, pet_wall_period_id INTEGER NOT NULL REFERENCES pet_wall_periods(id) ON DELETE CASCADE,
          portrait_id INTEGER NOT NULL REFERENCES portraits(id), rank INTEGER NOT NULL,
          like_count_at_selection INTEGER NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);

        await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          resident_id INTEGER REFERENCES residents(id) ON DELETE SET NULL, channel TEXT NOT NULL,
          recipient_address TEXT NOT NULL, subject TEXT, message_body TEXT NOT NULL,
          notification_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          sent_at TIMESTAMP, error TEXT, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log("[migration] All tables ready");

        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_annual_cents INTEGER");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS price_monthly_cents INTEGER");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS size_tier TEXT");
        await pool.query("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_homes INTEGER");
        console.log("[migration] Subscription plan tier columns ready");

        // ALTER TABLE additions for columns added after initial schema
        await pool.query("ALTER TABLE dogs ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id) ON DELETE CASCADE");
        await pool.query("ALTER TABLE portraits ADD COLUMN IF NOT EXISTS opt_out_gallery BOOLEAN DEFAULT false NOT NULL");
        await pool.query("ALTER TABLE portraits ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES residents(id)");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS fulfillment_provider TEXT DEFAULT 'printful'");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS external_order_id TEXT");
        await pool.query("ALTER TABLE merch_orders ADD COLUMN IF NOT EXISTS external_status TEXT");
        await pool.query("ALTER TABLE merch_order_items ADD COLUMN IF NOT EXISTS calendar_project_id INTEGER");
        await pool.query("ALTER TABLE merch_earnings ADD COLUMN IF NOT EXISTS community_share_cents INTEGER");
        await pool.query("ALTER TABLE merch_earnings ADD COLUMN IF NOT EXISTS platform_share_cents INTEGER");

        // Organization extensions
        await pool.query("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS communication_preference TEXT DEFAULT 'email'");

        // Calendar project extensions
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS start_month INTEGER DEFAULT 1");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS calendar_name TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS birthday_month INTEGER");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS is_multi_pet BOOLEAN DEFAULT false");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS multi_pet_mode TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS pet_ids TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS total_generations INTEGER DEFAULT 0");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS max_generations INTEGER DEFAULT 24");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS cover_type TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS cover_image_id INTEGER");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS pdf_url TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS gelato_order_id TEXT");
        await pool.query("ALTER TABLE calendar_projects ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT");
        console.log("[migration] Calendar project extensions ready");
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
      if ((existing as any).priceMonthlyCents !== plan.priceMonthlyCents) updates.priceMonthlyCents = plan.priceMonthlyCents;
      if (existing.sizeTier !== plan.sizeTier) updates.sizeTier = plan.sizeTier;
      if (existing.maxHomes !== plan.maxHomes) updates.maxHomes = plan.maxHomes;
      if (existing.name !== plan.name) updates.name = plan.name;
      if (existing.description !== plan.description) updates.description = plan.description;
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
