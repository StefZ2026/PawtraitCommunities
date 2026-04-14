import { db, pool } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  organizations, subscriptionPlans, dogs, portraits, portraitStyles, residents, portraitLikes,
  type Organization, type InsertOrganization, type SubscriptionPlan,
  type Dog, type InsertDog, type Portrait, type InsertPortrait, type PortraitStyle,
  type Resident, type InsertResident,
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  updateSubscriptionPlan(id: number, data: Record<string, any>): Promise<void>;
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getOrganizationByOwner(ownerId: string): Promise<Organization | undefined>;
  getOrganizationByCommunityCode(code: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(org: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, org: Partial<InsertOrganization>): Promise<Organization | undefined>;
  updateOrganizationStripeInfo(id: number, info: Record<string, any>): Promise<Organization | undefined>;
  clearOrganizationOwner(id: number): Promise<void>;
  deleteOrganization(id: number): Promise<void>;
  getResident(id: number): Promise<Resident | undefined>;
  getResidentByAuthId(authId: string, orgId: number): Promise<Resident | undefined>;
  getResidentsByOrganization(orgId: number): Promise<Resident[]>;
  createResident(r: InsertResident): Promise<Resident>;
  updateResident(id: number, data: Partial<InsertResident>): Promise<Resident | undefined>;
  deleteResident(id: number): Promise<void>;
  getDog(id: number): Promise<Dog | undefined>;
  getDogsByOrganization(orgId: number): Promise<Dog[]>;
  getDogsByResident(residentId: number): Promise<Dog[]>;
  getAllDogs(): Promise<Dog[]>;
  createDog(dog: InsertDog): Promise<Dog>;
  updateDog(id: number, dog: Partial<InsertDog>): Promise<Dog | undefined>;
  deleteDog(id: number): Promise<void>;
  getPortraitStyle(id: number): Promise<PortraitStyle | undefined>;
  getAllPortraitStyles(): Promise<PortraitStyle[]>;
  getPortrait(id: number): Promise<Portrait | undefined>;
  getPortraitByDogAndStyle(dogId: number, styleId: number): Promise<Portrait | undefined>;
  getPortraitsByDog(dogId: number): Promise<Portrait[]>;
  getLatestPortraitByDog(dogId: number): Promise<Portrait | undefined>;
  getGalleryPortraits(orgId: number, limit?: number, offset?: number): Promise<Portrait[]>;
  createPortrait(portrait: InsertPortrait): Promise<Portrait>;
  updatePortrait(id: number, portrait: Partial<InsertPortrait>): Promise<Portrait | undefined>;
  incrementPortraitEditCount(id: number): Promise<void>;
  likePortrait(portraitId: number, residentId: number): Promise<void>;
  unlikePortrait(portraitId: number, residentId: number): Promise<void>;
  getPortraitLikesByResident(residentId: number): Promise<number[]>;
  getUsedStyleIdsForDog(dogId: number): Promise<number[]>;
  repairSequences(): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) { const [u] = await db.select().from(users).where(eq(users.id, id)); return u; }
  async getAllUsers() { return db.select().from(users); }
  async getSubscriptionPlan(id: number) { const [p] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)); return p; }
  async getAllSubscriptionPlans() { return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)); }
  async updateSubscriptionPlan(id: number, data: Record<string, any>) { await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)); }
  async getOrganization(id: number) { const [o] = await db.select().from(organizations).where(eq(organizations.id, id)); return o; }
  async getOrganizationBySlug(slug: string) { const [o] = await db.select().from(organizations).where(eq(organizations.slug, slug)); return o; }
  async getOrganizationByOwner(ownerId: string) { const [o] = await db.select().from(organizations).where(eq(organizations.ownerId, ownerId)); return o; }
  async getOrganizationByCommunityCode(code: string) { const [o] = await db.select().from(organizations).where(and(eq(organizations.communityCode, code), eq(organizations.isActive, true))); return o; }
  async getAllOrganizations() { return db.select().from(organizations).orderBy(desc(organizations.createdAt)); }
  async createOrganization(org: InsertOrganization) { const [c] = await db.insert(organizations).values(org).returning(); return c; }
  async updateOrganization(id: number, org: Partial<InsertOrganization>) { const [u] = await db.update(organizations).set(org).where(eq(organizations.id, id)).returning(); return u; }
  async updateOrganizationStripeInfo(id: number, info: Record<string, any>) { if (Object.keys(info).length > 0) await db.update(organizations).set(info).where(eq(organizations.id, id)); const [u] = await db.select().from(organizations).where(eq(organizations.id, id)); return u; }
  async clearOrganizationOwner(id: number) { await db.update(organizations).set({ ownerId: null } as any).where(eq(organizations.id, id)); }
  async deleteOrganization(id: number) { await db.delete(organizations).where(eq(organizations.id, id)); }
  async getResident(id: number) { const [r] = await db.select().from(residents).where(eq(residents.id, id)); return r; }
  async getResidentByAuthId(authId: string, orgId: number) { const [r] = await db.select().from(residents).where(and(eq(residents.supabaseAuthId, authId), eq(residents.organizationId, orgId))); return r; }
  async getResidentsByOrganization(orgId: number) { return db.select().from(residents).where(eq(residents.organizationId, orgId)).orderBy(desc(residents.createdAt)); }
  async createResident(r: InsertResident) { const [c] = await db.insert(residents).values(r).returning(); return c; }
  async updateResident(id: number, data: Partial<InsertResident>) { const [u] = await db.update(residents).set(data).where(eq(residents.id, id)).returning(); return u; }
  async deleteResident(id: number) { await db.delete(residents).where(eq(residents.id, id)); }
  async getDog(id: number) { const [d] = await db.select().from(dogs).where(eq(dogs.id, id)); return d; }
  async getDogsByOrganization(orgId: number) { return db.select().from(dogs).where(eq(dogs.organizationId, orgId)).orderBy(desc(dogs.createdAt)); }
  async getDogsByResident(residentId: number) { return db.select().from(dogs).where(eq(dogs.residentId, residentId)).orderBy(desc(dogs.createdAt)); }
  async getAllDogs() { return db.select().from(dogs).orderBy(desc(dogs.createdAt)); }
  async createDog(dog: InsertDog) { const [c] = await db.insert(dogs).values(dog).returning(); return c; }
  async updateDog(id: number, dog: Partial<InsertDog>) { const [u] = await db.update(dogs).set(dog).where(eq(dogs.id, id)).returning(); return u; }
  async deleteDog(id: number) { await db.delete(dogs).where(eq(dogs.id, id)); }
  async getPortraitStyle(id: number) { const [s] = await db.select().from(portraitStyles).where(eq(portraitStyles.id, id)); return s; }
  async getAllPortraitStyles() { return db.select().from(portraitStyles); }
  async getPortrait(id: number) { const [p] = await db.select().from(portraits).where(eq(portraits.id, id)); return p; }
  async getPortraitByDogAndStyle(dogId: number, styleId: number) { const [p] = await db.select().from(portraits).where(and(eq(portraits.dogId, dogId), eq(portraits.styleId, styleId))); return p; }
  async getPortraitsByDog(dogId: number) { return db.select().from(portraits).where(eq(portraits.dogId, dogId)).orderBy(desc(portraits.createdAt)); }
  async getLatestPortraitByDog(dogId: number) { const [p] = await db.select().from(portraits).where(eq(portraits.dogId, dogId)).orderBy(desc(portraits.createdAt)).limit(1); return p; }
  async getGalleryPortraits(orgId: number, limit = 50, offset = 0) {
    return db.select().from(portraits).innerJoin(dogs, eq(portraits.dogId, dogs.id))
      .where(and(eq(dogs.organizationId, orgId), eq(portraits.optOutGallery, false)))
      .orderBy(desc(portraits.likeCount), desc(portraits.createdAt)).limit(limit).offset(offset) as any;
  }
  async createPortrait(portrait: InsertPortrait) { const [c] = await db.insert(portraits).values(portrait).returning(); return c; }
  async updatePortrait(id: number, portrait: Partial<InsertPortrait>) { const [u] = await db.update(portraits).set(portrait).where(eq(portraits.id, id)).returning(); return u; }
  async incrementPortraitEditCount(id: number) { await db.update(portraits).set({ editCount: sql`COALESCE(${portraits.editCount}, 0) + 1` }).where(eq(portraits.id, id)); }

  async likePortrait(portraitId: number, residentId: number) {
    await db.transaction(async (tx) => {
      await tx.insert(portraitLikes).values({ portraitId, residentId });
      await tx.update(portraits).set({ likeCount: sql`COALESCE(${portraits.likeCount}, 0) + 1` }).where(eq(portraits.id, portraitId));
    });
  }

  async unlikePortrait(portraitId: number, residentId: number) {
    await db.transaction(async (tx) => {
      await tx.delete(portraitLikes).where(and(eq(portraitLikes.portraitId, portraitId), eq(portraitLikes.residentId, residentId)));
      await tx.update(portraits).set({ likeCount: sql`GREATEST(COALESCE(${portraits.likeCount}, 0) - 1, 0)` }).where(eq(portraits.id, portraitId));
    });
  }

  async getPortraitLikesByResident(residentId: number) {
    const rows = await db.select({ portraitId: portraitLikes.portraitId }).from(portraitLikes).where(eq(portraitLikes.residentId, residentId));
    return rows.map(r => r.portraitId);
  }

  async getUsedStyleIdsForDog(dogId: number) {
    const rows = await db.select({ styleId: portraits.styleId }).from(portraits).where(eq(portraits.dogId, dogId));
    return [...new Set(rows.map(r => r.styleId))];
  }

  async repairSequences() {
    const fixes: string[] = [];
    for (const { table, seq } of [
      { table: "organizations", seq: "organizations_id_seq" },
      { table: "dogs", seq: "dogs_id_seq" },
      { table: "portraits", seq: "portraits_id_seq" },
      { table: "portrait_styles", seq: "portrait_styles_id_seq" },
      { table: "subscription_plans", seq: "subscription_plans_id_seq" },
      { table: "residents", seq: "residents_id_seq" },
    ]) {
      try {
        await db.execute(sql.raw(`SELECT setval('${seq}', GREATEST((SELECT COALESCE(MAX(id), 0) FROM ${table}), 1))`));
        fixes.push(`${table}: synced`);
      } catch {}
    }
    return fixes;
  }
}

export const storage = new DatabaseStorage();
