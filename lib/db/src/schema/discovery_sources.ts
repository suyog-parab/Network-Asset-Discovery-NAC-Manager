import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const discoverySourcesTable = pgTable("discovery_sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  host: text("host").notNull(),
  port: integer("port"),
  username: text("username"),
  password: text("password"),
  community: text("community"),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDiscoverySourceSchema = createInsertSchema(discoverySourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiscoverySource = z.infer<typeof insertDiscoverySourceSchema>;
export type DiscoverySource = typeof discoverySourcesTable.$inferSelect;
