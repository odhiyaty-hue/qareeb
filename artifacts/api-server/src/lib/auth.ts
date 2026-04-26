// @ts-nocheck
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { logger } from "./logger";

const rawSecret = process.env["JWT_SECRET"] ?? process.env["SESSION_SECRET"];

if (!rawSecret) {
  throw new Error(
    "JWT_SECRET (or SESSION_SECRET) environment variable is required.",
  );
}

const JWT_SECRET: string = rawSecret;
const JWT_EXPIRES_IN = "30d" as const;

export interface AuthTokenPayload {
  sub: number;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown;
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      typeof (decoded as AuthTokenPayload).sub === "number"
    ) {
      return decoded as AuthTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    trustStatus: user.trustStatus,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt,
  };
}

export interface AuthedRequest extends Request {
  authUser?: User;
}

async function loadUserFromHeader(req: Request): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = header.slice(7).trim();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, payload.sub));
  return user ?? null;
}

export function attachUser() {
  return async (
    req: AuthedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await loadUserFromHeader(req);
      if (user) {
        req.authUser = user;
      }
    } catch (err) {
      logger.warn({ err }, "Failed to attach user from token");
    }
    next();
  };
}

export function requireAuth() {
  return async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    next();
  };
}

export function requireAdmin() {
  return async (
    req: AuthedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    if (!req.authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (req.authUser.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  };
}
