import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deviceHistoryTable = pgTable("device_history", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull(),
  action: text("action").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  oldVlan: text("old_vlan"),
  newVlan: text("new_vlan"),
  performedBy: text("performed_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDeviceHistorySchema = createInsertSchema(deviceHistoryTable).omit({ id: true, createdAt: true });
export type InsertDeviceHistory = z.infer<typeof insertDeviceHistorySchema>;
export type DeviceHistory = typeof deviceHistoryTable.$inferSelect;
