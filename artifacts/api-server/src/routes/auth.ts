import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  hashPassword,
  verifyPassword,
  signToken,
  toPublicUser,
  requireAuth,
  type AuthedRequest,
} from "../lib/auth";

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.post(
  "/auth/register",
  authLimiter,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input. Check name, email, and password (min 6)." });
      return;
    }

    const { name, email, phone, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(usersTable)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        phone: phone?.trim() || null,
        passwordHash,
        role: "user",
        trustStatus: "new",
      })
      .returning();

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user: toPublicUser(user) });
  },
);

router.post(
  "/auth/login",
  authLimiter,
  async (req: AuthedRequest, res: Response): Promise<void> => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    res.status(200).json({ token, user: toPublicUser(user) });
  },
);

router.get(
  "/auth/me",
  requireAuth(),
  async (req: AuthedRequest, res: Response): Promise<void> => {
    res.json(toPublicUser(req.authUser!));
  },
);

export default router;
