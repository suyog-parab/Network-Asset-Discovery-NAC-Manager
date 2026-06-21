import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const radiusClientsTable = pgTable("radius_clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  secret: text("secret").notNull(),
  nasType: text("nas_type"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRadiusClientSchema = createInsertSchema(radiusClientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRadiusClient = z.infer<typeof insertRadiusClientSchema>;
export type RadiusClient = typeof radiusClientsTable.$inferSelect;
