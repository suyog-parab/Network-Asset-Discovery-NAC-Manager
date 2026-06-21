import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vlansTable = pgTable("vlans", {
  id: serial("id").primaryKey(),
  vlanId: integer("vlan_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type"),
  isQuarantine: boolean("is_quarantine").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVlanSchema = createInsertSchema(vlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVlan = z.infer<typeof insertVlanSchema>;
export type Vlan = typeof vlansTable.$inferSelect;
