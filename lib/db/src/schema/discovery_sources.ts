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
  snmpVersion: text("snmp_version").default("v2c"),
  snmpAuthProtocol: text("snmp_auth_protocol"),
  snmpPrivProtocol: text("snmp_priv_protocol"),
  snmpAuthKey: text("snmp_auth_key"),
  snmpPrivKey: text("snmp_priv_key"),
  snmpContextName: text("snmp_context_name"),
  enabled: boolean("enabled").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastRunStatus: text("last_run_status"),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDiscoverySourceSchema = createInsertSchema(discoverySourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDiscoverySource = z.infer<typeof insertDiscoverySourceSchema>;
export type DiscoverySource = typeof discoverySourcesTable.$inferSelect;
