import { pgTable, serial, text, timestamp, varchar, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

/**
 * Enums for PostgreSQL
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const timeBlockEnum = pgEnum("time_block", ["morning", "afternoon", "evening"]);

/**
 * Core user table backing auth flow.
 * Uses Clerk userId (string) as the unique identifier.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  /** Clerk user ID - unique identifier from Clerk */
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  imageUrl: text("image_url"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tasks table - stores individual tasks for the weekly planner
 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  /** User who owns this task (references users.id) */
  userId: integer("user_id").notNull(),
  /** Task content/description */
  content: text("content").notNull(),
  /** Whether the task is completed */
  completed: boolean("completed").default(false).notNull(),
  /** Date of the task (YYYY-MM-DD format) */
  date: varchar("date", { length: 10 }).notNull(),
  /** Time block: morning, afternoon, evening */
  timeBlock: timeBlockEnum("time_block").notNull(),
  /** Display order within the time block */
  sortOrder: integer("sort_order").default(0).notNull(),
  /** Creation timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Notes table - stores weekly notes
 */
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  /** User who owns this note */
  userId: integer("user_id").notNull(),
  /** Week identifier (YYYY-Www format, e.g., 2026-W03) */
  weekId: varchar("week_id", { length: 10 }).notNull(),
  /** Note content */
  content: text("content"),
  /** Creation timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Week settings table - stores per-week layout settings like column widths
 */
export const weekSettings = pgTable("week_settings", {
  id: serial("id").primaryKey(),
  /** User who owns this setting */
  userId: integer("user_id").notNull(),
  /** Week identifier (YYYY-Www format, e.g., 2026-W03) */
  weekId: varchar("week_id", { length: 10 }).notNull(),
  /** Column widths as JSON string: {"0": 150, "1": 200, ...} for each day index */
  columnWidths: text("column_widths"),
  /** Row heights as JSON string (for future use) */
  rowHeights: text("row_heights"),
  /** Custom content text */
  customText: text("custom_text"),
  /** Custom content image URL */
  customImageUrl: text("custom_image_url"),
  /** Creation timestamp */
  createdAt: timestamp("created_at").defaultNow().notNull(),
  /** Last update timestamp */
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WeekSettings = typeof weekSettings.$inferSelect;
export type InsertWeekSettings = typeof weekSettings.$inferInsert;
