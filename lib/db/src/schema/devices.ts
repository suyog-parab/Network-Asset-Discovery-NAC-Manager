import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const devicesTable = pgTable("devices", {
  id: serial("id").primaryKey(),
  macAddress: text("mac_address").notNull().unique(),
  ipAddress: text("ip_address"),
  hostname: text("hostname"),
  username: text("username"),
  vendor: text("vendor"),
  operatingSystem: text("operating_system"),
  department: text("department"),
  switchName: text("switch_name"),
  switchPort: text("switch_port"),
  vlanId: integer("vlan_id"),
  siteId: integer("site_id"),
  status: text("status").notNull().default("DISCOVERED"),
  firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: text("approved_by"),
  notes: text("notes"),
  radiusSynced: boolean("radius_synced").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devicesTable.$inferSelect;
