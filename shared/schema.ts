import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  markupPercentage: decimal("markup_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pricingSessions = pgTable("pricing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number"),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).notNull(),
  roundingOption: integer("rounding_option").notNull().default(1000), // 100, 1000, or 10000
  items: jsonb("items").notNull(), // Array of items with calculations
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  emailSent: timestamp("email_sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Amazon pricing sessions table
export const amazonPricingSessions = pgTable("amazon_pricing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amazonUrl: text("amazon_url").notNull(),
  productName: text("product_name").notNull(),
  costUsd: decimal("cost_usd", { precision: 10, scale: 2 }).notNull(),
  amazonPrice: decimal("amazon_price", { precision: 10, scale: 2 }).notNull(), // Cost + 7%
  markupPercentage: decimal("markup_percentage", { precision: 5, scale: 2 }).notNull(),
  sellingPriceUsd: decimal("selling_price_usd", { precision: 10, scale: 2 }).notNull(),
  sellingPriceJmd: decimal("selling_price_jmd", { precision: 15, scale: 2 }).notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 4 }).notNull(),
  notes: text("notes"), // For weight and local taxes consideration
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  emailSent: timestamp("email_sent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertPricingSessionSchema = createInsertSchema(pricingSessions).omit({
  id: true,
  createdAt: true,
  emailSent: true,
});

export const insertAmazonPricingSessionSchema = createInsertSchema(amazonPricingSessions).omit({
  id: true,
  createdAt: true,
  emailSent: true,
});

export const updateCategorySchema = insertCategorySchema.extend({
  id: z.string(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type PricingSession = typeof pricingSessions.$inferSelect;
export type InsertPricingSession = z.infer<typeof insertPricingSessionSchema>;
export type AmazonPricingSession = typeof amazonPricingSessions.$inferSelect;
export type InsertAmazonPricingSession = z.infer<typeof insertAmazonPricingSessionSchema>;

export interface PricingItem {
  id: string;
  description: string;
  costUsd: number;
  categoryId: string;
  categoryName: string;
  markupPercentage: number;
  costJmd: number; // After exchange rate and GCT
  sellingPrice: number; // After markup
  finalPrice: number; // After rounding
}

export interface EmailReport {
  to: string;
  subject: string;
  notes?: string;
  sessionId: string;
}
