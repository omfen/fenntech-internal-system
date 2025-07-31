import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = ["administrator", "user"] as const;
export type UserRole = typeof userRoles[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: varchar("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().refine(
    (email) => email.endsWith("@fenntechltd.com"),
    { message: "Email must be from @fenntechltd.com domain" }
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoles),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export const updateCategorySchema = insertCategorySchema.extend({
  id: z.string(),
});

export type Category = typeof categories.$inferSelect;
export type User = typeof users.$inferSelect;

// Customer Product Inquiries table
export const customerInquiries = pgTable("customer_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name").notNull(),
  telephoneNumber: varchar("telephone_number").notNull(),
  itemInquiry: varchar("item_inquiry").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
});

export type CustomerInquiry = typeof customerInquiries.$inferSelect;
export type InsertCustomerInquiry = typeof customerInquiries.$inferInsert;

// Request for Quotation table
export const quotationRequests = pgTable("quotation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name").notNull(),
  telephoneNumber: varchar("telephone_number").notNull(),
  emailAddress: varchar("email_address").notNull(),
  quoteDescription: varchar("quote_description").notNull(),
  urgency: varchar("urgency").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
});

export type QuotationRequest = typeof quotationRequests.$inferSelect;
export type InsertQuotationRequest = typeof quotationRequests.$inferInsert;

// Validation schemas
export const insertCustomerInquirySchema = createInsertSchema(customerInquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationRequestSchema = createInsertSchema(quotationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const urgencyLevels = ["low", "medium", "high", "urgent"] as const;
export type Session = typeof sessions.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
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
