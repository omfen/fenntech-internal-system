import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, sessions } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-development";
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken(userId);
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export async function invalidateSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    // Verify JWT token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // Check if session exists and is valid
    const session = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, new Date())
      ))
      .limit(1);

    if (session.length === 0) {
      return res.status(403).json({ message: "Session expired" });
    }

    // Get user details
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        firstName: users.firstName,
        lastName: users.lastName,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0 || !user[0].isActive) {
      return res.status(403).json({ message: "User not found or inactive" });
    }

    req.user = {
      ...user[0],
      firstName: user[0].firstName || undefined,
      lastName: user[0].lastName || undefined,
    };
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireRole("administrator")(req, res, next);
}