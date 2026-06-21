import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const switchesTable = pgTable("switches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ipAddress: text("ip_address").notNull(),
  model: text("model"),
  location: text("location"),
  siteId: integer("site_id"),
  snmpVersion: text("snmp_version").notNull().default("v2c"),
  snmpCommunity: text("snmp_community"),
  snmpUsername: text("snmp_username"),
  snmpAuthPassword: text("snmp_auth_password"),
  snmpPrivPassword: text("snmp_priv_password"),
  status: text("status").notNull().default("unknown"),
  lastPolled: timestamp("last_polled", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSwitchSchema = createInsertSchema(switchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSwitch = z.infer<typeof insertSwitchSchema>;
export type Switch = typeof switchesTable.$inferSelect;
