import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, LoginBody } from "@workspace/api-zod";
import { createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "nac-salt").digest("hex");
}

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash, ...rest } = user;
  return rest;
}

router.get("/", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.username);
  res.json(users.map(sanitizeUser));
});

router.post("/", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const { password, ...rest } = parsed.data;
  const [user] = await db.insert(usersTable).values({ ...rest, passwordHash: hashPassword(password) }).returning();
  res.status(201).json(sanitizeUser(user));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUser(user));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, id)).returning();
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUser(user));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

export default router;
