import { pgTable, text, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

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

// Task status history table
export const taskStatusHistory = pgTable("task_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull(),
  fromStatus: varchar("from_status", { length: 50 }),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  changedById: varchar("changed_by_id").notNull(),
  changedByName: varchar("changed_by_name").notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  notes: text("notes"),
});

// Zod schemas
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
});

export const updateTaskSchema = insertTaskSchema.partial();

export const insertTaskLogSchema = createInsertSchema(taskLogs, {
  action: z.string().min(1, "Action is required"),
  description: z.string().min(1, "Description is required"),
});

export const insertTaskStatusHistorySchema = createInsertSchema(taskStatusHistory);

// Types
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type TaskLog = typeof taskLogs.$inferSelect;
export type InsertTaskLog = z.infer<typeof insertTaskLogSchema>;
export type TaskStatusHistory = typeof taskStatusHistory.$inferSelect;
export type InsertTaskStatusHistory = z.infer<typeof insertTaskStatusHistorySchema>;

// Task urgency and priority mappings
export const urgencyLevels = {
  low: { label: "Low", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "High", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-800" },
};

export const priorityLevels = {
  low: { label: "Low", color: "bg-gray-100 text-gray-800" },
  normal: { label: "Normal", color: "bg-blue-100 text-blue-800" },
  high: { label: "High", color: "bg-purple-100 text-purple-800" },
  critical: { label: "Critical", color: "bg-red-100 text-red-800" },
};

export const taskStatuses = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-800" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};