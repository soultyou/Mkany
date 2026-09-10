import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, users, type User } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

/**
 * Middleware to require an authenticated session and load the corresponding database user.
 * It enforces that the user must exist in the PostgreSQL database.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Clerk session" });
    return;
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, auth.userId),
    });

    if (!dbUser) {
      req.log.warn({ clerkUserId: auth.userId }, "Authenticated Clerk user not found in database");
      res.status(401).json({ error: "Unauthorized", message: "User profile incomplete or not synced" });
      return;
    }

    // Attach the DB user to the request
    req.dbUser = dbUser;
    next();
  } catch (error) {
    req.log.error({ error, clerkUserId: auth.userId }, "Error fetching user from database");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Middleware factory to restrict route access based on user role.
 * ALWAYS use this *after* `requireAuth`.
 */
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return (req, res, next) => {
    const dbUser = req.dbUser;
    
    if (!dbUser) {
      res.status(401).json({ error: "Unauthorized", message: "Database user context missing" });
      return;
    }

    if (!allowedRoles.includes(dbUser.role)) {
      req.log.warn(
        { userId: dbUser.id, role: dbUser.role, allowedRoles },
        "Forbidden access attempt"
      );
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }

    next();
  };
};

// Common reusable authorization middleware
export const requireAdmin = requireRole(["admin"]);
export const requireOwner = requireRole(["owner", "admin"]); // Admins usually can do what owners do

/**
 * Helper to ensure a specific requested user ID (e.g., from URL param) 
 * matches the authenticated user, preventing IDOR.
 * Use for student-scoped operations. Admins might be allowed to bypass.
 */
export const requireSelfOrAdmin = (idParamName: string = "id"): RequestHandler => {
  return (req, res, next) => {
    const dbUser = req.dbUser;
    if (!dbUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const requestedId = req.params[idParamName];
    
    // User is accessing their own data OR user is an admin
    if (dbUser.id === requestedId || dbUser.clerkUserId === requestedId || dbUser.role === "admin") {
      next();
      return;
    }

    req.log.warn(
      { userId: dbUser.id, requestedId, role: dbUser.role },
      "IDOR attempt blocked"
    );
    res.status(403).json({ error: "Forbidden", message: "Cannot access resources belonging to other users" });
  };
};
