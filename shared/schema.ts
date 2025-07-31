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
  requiresAdminApproval: boolean("requires_admin_approval").notNull().default(false),
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
    (email) => {
      const allowedDomains = ["@fenntechltd.com", "@876get.com"];
      return allowedDomains.some(domain => email.endsWith(domain));
    },
    { message: "Email must be from @fenntechltd.com or @876get.com domain" }
  ),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoles),
});

// Admin user creation schema (allows any domain)
export const adminCreateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoles),
  requiresAdminApproval: z.boolean().default(false),
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

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  urgencyLevel: varchar("urgency_level", { length: 50 }).notNull().default("medium"), // low, medium, high, urgent
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  assignedUserId: varchar("assigned_user_id"),
  assignedUserName: varchar("assigned_user_name"),
  createdById: varchar("created_by_id").notNull(),
  createdByName: varchar("created_by_name").notNull(),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, critical
});

// Task logs table for tracking task activity
export const taskLogs = pgTable("task_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // created, updated, assigned, completed, commented
  description: text("description").notNull(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

// Zod schemas for tasks
export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().optional(),
  urgencyLevel: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  createdById: true,
  createdByName: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export const insertTaskLogSchema = createInsertSchema(taskLogs, {
  action: z.string().min(1, "Action is required"),
  description: z.string().min(1, "Description is required"),
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = z.infer<typeof insertTaskLogSchema>;



// Customer Product Inquiries table
export const customerInquiries = pgTable("customer_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name").notNull(),
  telephoneNumber: varchar("telephone_number").notNull(),
  itemInquiry: varchar("item_inquiry").notNull(),
  status: varchar("status").default("new"), // new, contacted, follow_up, completed, closed
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  statusHistory: jsonb("status_history").default([]),
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
  status: varchar("status").default("pending"), // pending, in_progress, quoted, accepted, declined, completed
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  statusHistory: jsonb("status_history").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
});

export type QuotationRequest = typeof quotationRequests.$inferSelect;
export type InsertQuotationRequest = typeof quotationRequests.$inferInsert;

// Work Orders table
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name").notNull(),
  telephone: varchar("telephone").notNull(),
  email: varchar("email").notNull(),
  itemDescription: text("item_description").notNull(),
  issue: text("issue").notNull(),
  status: varchar("status").default("received"), // received, in_progress, testing, ready_for_pickup, completed
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  notes: text("notes").default(""),
  lastEmailSent: timestamp("last_email_sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

// Tickets table
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("open"), // open, in_progress, resolved, closed
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  createdById: varchar("created_by_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  statusHistory: jsonb("status_history").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

// Call Log table
export const callLogs = pgTable("call_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerName: varchar("customer_name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  callType: varchar("call_type").notNull(), // incoming, outgoing
  callPurpose: varchar("call_purpose").notNull(), // inquiry, support, follow_up, quote, complaint, other
  notes: text("notes"),
  duration: varchar("duration"), // in format "MM:SS"
  outcome: varchar("outcome"), // answered, voicemail, busy, no_answer, resolved, follow_up_needed
  followUpDate: timestamp("follow_up_date"),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// Change Log table for system-wide activity tracking
export const changeLog = pgTable("change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // "work_order", "task", "ticket", etc.
  entityId: varchar("entity_id").notNull(),
  action: varchar("action").notNull(), // "created", "updated", "deleted", "status_changed", "assigned"
  fieldChanged: varchar("field_changed"), // specific field that was changed
  oldValue: varchar("old_value"), // previous value
  newValue: varchar("new_value"), // new value
  userId: varchar("user_id").references(() => users.id),
  userName: varchar("user_name").notNull(), // cached for performance
  description: varchar("description").notNull(), // human-readable description
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChangeLog = typeof changeLog.$inferSelect;
export type InsertChangeLog = typeof changeLog.$inferInsert;

// Validation schemas
export const insertCustomerInquirySchema = createInsertSchema(customerInquiries, {
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationRequestSchema = createInsertSchema(quotationRequests, {
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkOrderSchema = createInsertSchema(workOrders, {
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets, {
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChangeLogSchema = createInsertSchema(changeLog).omit({
  id: true,
  createdAt: true,
});

export const urgencyLevels = ["low", "medium", "high", "urgent"] as const;
export const statusLevels = ["pending", "in_progress", "completed"] as const;
export const ticketStatusLevels = ["open", "in_progress", "resolved", "closed"] as const;
export const priorityLevels = ["low", "medium", "high", "urgent"] as const;
export const inquiryStatusLevels = ["new", "contacted", "follow_up", "completed", "closed"] as const;
export const quotationStatusLevels = ["pending", "in_progress", "quoted", "accepted", "declined", "completed"] as const;
export const callTypeLevels = ["incoming", "outgoing"] as const;
export const callPurposeLevels = ["inquiry", "support", "follow_up", "quote", "complaint", "other"] as const;
export const callOutcomeLevels = ["answered", "voicemail", "busy", "no_answer", "resolved", "follow_up_needed"] as const;
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

// Company settings table
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: varchar("company_name").notNull(),
  telephone: varchar("telephone"),
  email: varchar("email"),
  url: varchar("url"),
  address: text("address"),
  invoiceFooter: text("invoice_footer"),
  quotationFooter: text("quotation_footer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Clients table
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  contactPerson: varchar("contact_person"),
  phone: varchar("phone"),
  email: varchar("email"),
  billingAddress: text("billing_address"),
  taxId: varchar("tax_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteNumber: varchar("quote_number").notNull().unique(),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  quoteDate: timestamp("quote_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  items: jsonb("items").notNull(), // Array of line items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gctAmount: decimal("gct_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("JMD"),
  notes: text("notes"),
  status: varchar("status").notNull().default("draft"), // draft, sent, accepted, rejected, expired
  createdById: varchar("created_by_id").notNull(),
  createdByName: varchar("created_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  quotationId: varchar("quotation_id").references(() => quotations.id),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  items: jsonb("items").notNull(), // Array of line items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gctAmount: decimal("gct_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0.00"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("JMD"),
  paymentTerms: varchar("payment_terms"),
  notes: text("notes"),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue, cancelled
  createdById: varchar("created_by_id").notNull(),
  createdByName: varchar("created_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas for validation
export const insertCompanySettingsSchema = createInsertSchema(companySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations, {
  quoteDate: z.string().transform((val) => new Date(val)),
  expirationDate: z.string().transform((val) => new Date(val)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices, {
  invoiceDate: z.string().transform((val) => new Date(val)),
  dueDate: z.string().transform((val) => new Date(val)),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Export types
export type CompanySettings = typeof companySettings.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySettingsSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Line item interface
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Status constants
export const quotationStatuses = ["draft", "sent", "accepted", "rejected", "expired"] as const;
export const invoiceStatuses = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
