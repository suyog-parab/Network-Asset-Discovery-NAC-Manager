import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const radiusGroupsTable = pgTable("radius_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  vlanId: integer("vlan_id"),
  attribute: text("attribute"),
  value: text("value"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRadiusGroupSchema = createInsertSchema(radiusGroupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRadiusGroup = z.infer<typeof insertRadiusGroupSchema>;
export type RadiusGroup = typeof radiusGroupsTable.$inferSelect;
