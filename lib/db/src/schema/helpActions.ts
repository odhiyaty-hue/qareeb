import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { requestsTable } from "./requests";

export const helpActionsTable = pgTable("help_actions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => requestsTable.id, { onDelete: "cascade" }),
  helperUserId: integer("helper_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  message: text("message"),
  contactInfo: text("contact_info"),
  status: text("status").notNull().default("offered"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHelpActionSchema = createInsertSchema(helpActionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertHelpAction = z.infer<typeof insertHelpActionSchema>;
export type HelpAction = typeof helpActionsTable.$inferSelect;
