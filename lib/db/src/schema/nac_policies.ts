import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const nacPoliciesTable = pgTable("nac_policies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  condition: text("condition").notNull(),
  action: text("action").notNull(),
  priority: integer("priority").notNull().default(10),
  vlanId: integer("vlan_id"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNacPolicySchema = createInsertSchema(nacPoliciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNacPolicy = z.infer<typeof insertNacPolicySchema>;
export type NacPolicy = typeof nacPoliciesTable.$inferSelect;
