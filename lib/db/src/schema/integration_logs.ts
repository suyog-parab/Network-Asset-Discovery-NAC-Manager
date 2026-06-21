import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const integrationLogsTable = pgTable("integration_logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  sourceId: integer("source_id"),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IntegrationLog = typeof integrationLogsTable.$inferSelect;
