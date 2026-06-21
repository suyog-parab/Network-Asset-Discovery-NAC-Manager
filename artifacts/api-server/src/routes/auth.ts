import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "nac-salt").digest("hex");
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.post("/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (!user || user.passwordHash !== hashPassword(parsed.data.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));
  const token = createHash("sha256").update(user.id + user.username + Date.now()).digest("hex");

  res.json({ user: sanitizeUser(user), token });
});

router.post("/logout", async (req, res) => {
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.role, "super_admin")).limit(1);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json(sanitizeUser(user));
});

export default router;
