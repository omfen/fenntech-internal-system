import { type Category, type InsertCategory, type UpdateCategory, type PricingSession, type InsertPricingSession, categories, pricingSessions } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryById(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(category: UpdateCategory): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  // Pricing Sessions
  getPricingSessions(): Promise<PricingSession[]>;
  getPricingSessionById(id: string): Promise<PricingSession | undefined>;
  createPricingSession(session: InsertPricingSession): Promise<PricingSession>;
  updatePricingSessionEmailSent(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).orderBy(categories.name);
    return result;
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(updateCategory: UpdateCategory): Promise<Category | undefined> {
    const [category] = await db
      .update(categories)
      .set({
        name: updateCategory.name,
        markupPercentage: updateCategory.markupPercentage,
      })
      .where(eq(categories.id, updateCategory.id))
      .returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getPricingSessions(): Promise<PricingSession[]> {
    const result = await db.select().from(pricingSessions).orderBy(pricingSessions.createdAt);
    return result;
  }

  async getPricingSessionById(id: string): Promise<PricingSession | undefined> {
    const [session] = await db.select().from(pricingSessions).where(eq(pricingSessions.id, id));
    return session || undefined;
  }

  async createPricingSession(insertSession: InsertPricingSession): Promise<PricingSession> {
    const [session] = await db
      .insert(pricingSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updatePricingSessionEmailSent(id: string): Promise<void> {
    await db
      .update(pricingSessions)
      .set({ emailSent: new Date() })
      .where(eq(pricingSessions.id, id));
  }

  // Initialize with predefined categories if none exist
  async initializeCategories(): Promise<void> {
    const existingCategories = await this.getCategories();
    if (existingCategories.length === 0) {
      const defaultCategories = [
        { name: "Accessories", markupPercentage: "100.00" },
        { name: "Ink", markupPercentage: "45.00" },
        { name: "Sub Woofers", markupPercentage: "35.00" },
        { name: "Speakers", markupPercentage: "45.00" },
        { name: "Headphones", markupPercentage: "65.00" },
        { name: "UPS", markupPercentage: "50.00" },
        { name: "Laptop Bags", markupPercentage: "50.00" },
        { name: "Laptops", markupPercentage: "25.00" },
        { name: "Desktops", markupPercentage: "25.00" },
        { name: "Adaptors", markupPercentage: "65.00" },
        { name: "Routers", markupPercentage: "50.00" },
      ];

      for (const cat of defaultCategories) {
        await this.createCategory(cat);
      }
    }
  }
}

export const storage = new DatabaseStorage();
