import { type Category, type InsertCategory, type UpdateCategory, type PricingSession, type InsertPricingSession } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private categories: Map<string, Category>;
  private pricingSessions: Map<string, PricingSession>;

  constructor() {
    this.categories = new Map();
    this.pricingSessions = new Map();
    
    // Initialize with predefined categories
    this.initializeCategories();
  }

  private initializeCategories() {
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

    defaultCategories.forEach(cat => {
      const id = randomUUID();
      const category: Category = {
        id,
        name: cat.name,
        markupPercentage: cat.markupPercentage,
        createdAt: new Date(),
      };
      this.categories.set(id, category);
    });
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCategoryById(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = {
      ...insertCategory,
      id,
      createdAt: new Date(),
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(updateCategory: UpdateCategory): Promise<Category | undefined> {
    const existing = this.categories.get(updateCategory.id);
    if (!existing) return undefined;

    const updated: Category = {
      ...existing,
      name: updateCategory.name,
      markupPercentage: updateCategory.markupPercentage,
    };
    this.categories.set(updateCategory.id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  async getPricingSessions(): Promise<PricingSession[]> {
    return Array.from(this.pricingSessions.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getPricingSessionById(id: string): Promise<PricingSession | undefined> {
    return this.pricingSessions.get(id);
  }

  async createPricingSession(insertSession: InsertPricingSession): Promise<PricingSession> {
    const id = randomUUID();
    const session: PricingSession = {
      ...insertSession,
      id,
      status: insertSession.status || "pending",
      createdAt: new Date(),
      emailSent: null,
    };
    this.pricingSessions.set(id, session);
    return session;
  }

  async updatePricingSessionEmailSent(id: string): Promise<void> {
    const session = this.pricingSessions.get(id);
    if (session) {
      session.emailSent = new Date();
      this.pricingSessions.set(id, session);
    }
  }
}

export const storage = new MemStorage();
