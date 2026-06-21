import { Router } from "express";
import { db, nacPoliciesTable, vlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreatePolicyBody, UpdatePolicyBody } from "@workspace/api-zod";

const router = Router();

async function enrichPolicy(policy: typeof nacPoliciesTable.$inferSelect) {
  let vlan = null;
  if (policy.vlanId) {
    const [v] = await db.select().from(vlansTable).where(eq(vlansTable.id, policy.vlanId));
    vlan = v ?? null;
  }
  return { ...policy, vlan };
}

router.get("/", async (req, res) => {
  const policies = await db.select().from(nacPoliciesTable).orderBy(nacPoliciesTable.priority);
  const enriched = await Promise.all(policies.map(enrichPolicy));
  res.json(enriched);
});

router.post("/", async (req, res) => {
  const parsed = CreatePolicyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [policy] = await db.insert(nacPoliciesTable).values(parsed.data).returning();
  res.status(201).json(await enrichPolicy(policy));
});

router.put("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdatePolicyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const [policy] = await db.update(nacPoliciesTable).set(parsed.data).where(eq(nacPoliciesTable.id, id)).returning();
  if (!policy) return res.status(404).json({ error: "Policy not found" });
  res.json(await enrichPolicy(policy));
});

router.delete("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(nacPoliciesTable).where(eq(nacPoliciesTable.id, id));
  res.status(204).send();
});

export default router;
