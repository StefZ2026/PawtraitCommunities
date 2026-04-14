import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models (users table)
export * from "./models/auth";

// ─── Subscription Plans (annual, by community size) ───
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  priceAnnualCents: integer("price_annual_cents").notNull(),
  priceMonthlyCents: integer("price_monthly_cents"),
  sizeTier: text("size_tier").notNull(),
  maxHomes: integer("max_homes").notNull(),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  stripeLivePriceId: text("stripe_live_price_id"),
  stripeProductLiveId: text("stripe_product_live_id"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Organizations (Communities) ───
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  communityCode: varchar("community_code", { length: 20 }).unique(),
  totalHomes: integer("total_homes"),
  description: text("description"),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  socialNextdoor: text("social_nextdoor"),
  locationStreet: text("location_street"),
  locationCity: text("location_city"),
  locationState: text("location_state"),
  locationZip: text("location_zip"),
  locationCountry: text("location_country"),
  billingStreet: text("billing_street"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingZip: text("billing_zip"),
  billingCountry: text("billing_country"),
  speciesHandled: text("species_handled").default("both"),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  ownerId: varchar("owner_id"),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").default("pending"),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeConnectOnboardingComplete: boolean("stripe_connect_onboarding_complete").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Residents (community members) ───
export const residents = pgTable("residents", {
  id: serial("id").primaryKey(),
  supabaseAuthId: varchar("supabase_auth_id").notNull(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  homeNumber: varchar("home_number", { length: 20 }).notNull(),
  displayName: text("display_name"),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").default("resident").notNull(),
  notificationPreference: text("notification_preference").default("email"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Dogs (pets owned by residents) ───
export const dogs = pgTable("dogs", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").references(() => residents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  species: text("species").default("dog").notNull(),
  breed: text("breed"),
  age: text("age"),
  description: text("description"),
  originalPhotoUrl: text("original_photo_url"),
  isAvailable: boolean("is_available").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Portrait Styles (AI prompt templates) ───
export const portraitStyles = pgTable("portrait_styles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  promptTemplate: text("prompt_template").notNull(),
  previewImageUrl: text("preview_image_url"),
  category: text("category").notNull(),
});

// ─── Portraits (generated AI images) ───
export const portraits = pgTable("portraits", {
  id: serial("id").primaryKey(),
  dogId: integer("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  styleId: integer("style_id").notNull().references(() => portraitStyles.id),
  generatedImageUrl: text("generated_image_url"),
  previousImageUrl: text("previous_image_url"),
  editCount: integer("edit_count").default(0).notNull(),
  optOutGallery: boolean("opt_out_gallery").default(false).notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Portrait Likes (gallery voting) ───
export const portraitLikes = pgTable("portrait_likes", {
  id: serial("id").primaryKey(),
  portraitId: integer("portrait_id").notNull().references(() => portraits.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Merch Orders (future — not in baseline) ───
export const merchOrders = pgTable("merch_orders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").references(() => residents.id),
  dogId: integer("dog_id").references(() => dogs.id),
  portraitId: integer("portrait_id").references(() => portraits.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  shippingStreet: text("shipping_street").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingState: text("shipping_state").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingCountry: text("shipping_country").default("US").notNull(),
  fulfillmentProvider: text("fulfillment_provider").default("printful"),
  externalOrderId: text("external_order_id"),
  externalStatus: text("external_status"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  totalCents: integer("total_cents").notNull(),
  shippingCents: integer("shipping_cents").default(0).notNull(),
  taxCents: integer("tax_cents").default(0).notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Merch Order Items (future) ───
export const merchOrderItems = pgTable("merch_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => merchOrders.id, { onDelete: "cascade" }),
  productKey: text("product_key").notNull(),
  variantId: integer("variant_id"),
  quantity: integer("quantity").default(1).notNull(),
  priceCents: integer("price_cents").notNull(),
  wholesaleCostCents: integer("wholesale_cost_cents"),
  calendarProjectId: integer("calendar_project_id"),
  occasion: text("occasion"),
  artworkUrl: text("artwork_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Merch Earnings (future — 85/15 split) ───
export const merchEarnings = pgTable("merch_earnings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  merchOrderId: integer("merch_order_id").notNull().references(() => merchOrders.id),
  retailCents: integer("retail_cents").notNull(),
  wholesaleCents: integer("wholesale_cents").notNull(),
  marginCents: integer("margin_cents").notNull(),
  communityShareCents: integer("community_share_cents").notNull(),
  platformShareCents: integer("platform_share_cents").notNull(),
  payoutId: integer("payout_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Merch Payouts (future) ───
export const merchPayouts = pgTable("merch_payouts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id),
  amountCents: integer("amount_cents").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  status: text("status").default("pending").notNull(),
  initiatedBy: text("initiated_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

// ─── Calendar Projects (future) ───
export const calendarProjects = pgTable("calendar_projects", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").notNull().references(() => residents.id, { onDelete: "cascade" }),
  dogId: integer("dog_id").notNull().references(() => dogs.id, { onDelete: "cascade" }),
  calendarYear: integer("calendar_year").notNull(),
  status: text("status").default("uploading").notNull(),
  uploadedPhotoCount: integer("uploaded_photo_count").default(0).notNull(),
  generatedImageCount: integer("generated_image_count").default(0).notNull(),
  selectedImageCount: integer("selected_image_count").default(0).notNull(),
  priceCents: integer("price_cents").default(7500).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Calendar Project Images (future) ───
export const calendarProjectImages = pgTable("calendar_project_images", {
  id: serial("id").primaryKey(),
  calendarProjectId: integer("calendar_project_id").notNull().references(() => calendarProjects.id, { onDelete: "cascade" }),
  imageType: text("image_type").notNull(),
  imageUrl: text("image_url").notNull(),
  styleId: integer("style_id").references(() => portraitStyles.id),
  monthAssignment: integer("month_assignment"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Pet Wall Periods (future) ───
export const petWallPeriods = pgTable("pet_wall_periods", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  status: text("status").default("pending").notNull(),
  finalizedAt: timestamp("finalized_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Pet Wall Entries (future) ───
export const petWallEntries = pgTable("pet_wall_entries", {
  id: serial("id").primaryKey(),
  petWallPeriodId: integer("pet_wall_period_id").notNull().references(() => petWallPeriods.id, { onDelete: "cascade" }),
  portraitId: integer("portrait_id").notNull().references(() => portraits.id),
  rank: integer("rank").notNull(),
  likeCountAtSelection: integer("like_count_at_selection").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Notifications (future) ───
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  residentId: integer("resident_id").references(() => residents.id, { onDelete: "set null" }),
  channel: text("channel").notNull(),
  recipientAddress: text("recipient_address").notNull(),
  subject: text("subject"),
  messageBody: text("message_body").notNull(),
  notificationType: text("notification_type").notNull(),
  status: text("status").default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  error: text("error"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ─── Insert Schemas ───
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true });
export const insertResidentSchema = createInsertSchema(residents).omit({ id: true, createdAt: true });
export const insertDogSchema = createInsertSchema(dogs).omit({ id: true, createdAt: true });
export const insertPortraitStyleSchema = createInsertSchema(portraitStyles).omit({ id: true });
export const insertPortraitSchema = createInsertSchema(portraits).omit({ id: true, createdAt: true });
export const insertPortraitLikeSchema = createInsertSchema(portraitLikes).omit({ id: true, createdAt: true });
export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({ id: true, createdAt: true });
export const insertMerchOrderItemSchema = createInsertSchema(merchOrderItems).omit({ id: true, createdAt: true });
export const insertMerchEarningsSchema = createInsertSchema(merchEarnings).omit({ id: true, createdAt: true });
export const insertMerchPayoutSchema = createInsertSchema(merchPayouts).omit({ id: true, createdAt: true });
export const insertCalendarProjectSchema = createInsertSchema(calendarProjects).omit({ id: true, createdAt: true });
export const insertCalendarProjectImageSchema = createInsertSchema(calendarProjectImages).omit({ id: true, createdAt: true });
export const insertPetWallPeriodSchema = createInsertSchema(petWallPeriods).omit({ id: true, createdAt: true });
export const insertPetWallEntrySchema = createInsertSchema(petWallEntries).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// ─── Types ───
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Resident = typeof residents.$inferSelect;
export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Dog = typeof dogs.$inferSelect;
export type InsertDog = z.infer<typeof insertDogSchema>;
export type PortraitStyle = typeof portraitStyles.$inferSelect;
export type InsertPortraitStyle = z.infer<typeof insertPortraitStyleSchema>;
export type Portrait = typeof portraits.$inferSelect;
export type InsertPortrait = z.infer<typeof insertPortraitSchema>;
export type PortraitLike = typeof portraitLikes.$inferSelect;
export type InsertPortraitLike = z.infer<typeof insertPortraitLikeSchema>;
export type MerchOrder = typeof merchOrders.$inferSelect;
export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;
export type MerchOrderItem = typeof merchOrderItems.$inferSelect;
export type InsertMerchOrderItem = z.infer<typeof insertMerchOrderItemSchema>;
export type MerchEarning = typeof merchEarnings.$inferSelect;
export type InsertMerchEarning = z.infer<typeof insertMerchEarningsSchema>;
export type MerchPayout = typeof merchPayouts.$inferSelect;
export type InsertMerchPayout = z.infer<typeof insertMerchPayoutSchema>;
export type CalendarProject = typeof calendarProjects.$inferSelect;
export type InsertCalendarProject = z.infer<typeof insertCalendarProjectSchema>;
export type CalendarProjectImage = typeof calendarProjectImages.$inferSelect;
export type InsertCalendarProjectImage = z.infer<typeof insertCalendarProjectImageSchema>;
export type PetWallPeriod = typeof petWallPeriods.$inferSelect;
export type InsertPetWallPeriod = z.infer<typeof insertPetWallPeriodSchema>;
export type PetWallEntry = typeof petWallEntries.$inferSelect;
export type InsertPetWallEntry = z.infer<typeof insertPetWallEntrySchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
