import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const discoveryJobsTable = pgTable("discovery_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  sourceId: integer("source_id"),
  sourceName: text("source_name"),
  devicesFound: integer("devices_found").notNull().default(0),
  devicesNew: integer("devices_new").notNull().default(0),
  devicesUpdated: integer("devices_updated").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiscoveryJobSchema = createInsertSchema(discoveryJobsTable).omit({ id: true, createdAt: true });
export type InsertDiscoveryJob = z.infer<typeof insertDiscoveryJobSchema>;
export type DiscoveryJob = typeof discoveryJobsTable.$inferSelect;
