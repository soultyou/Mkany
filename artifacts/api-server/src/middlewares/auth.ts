import type { Request, Response, NextFunction, RequestHandler } from "express";
import { db, users, type User } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

/**
 * Middleware to require an authenticated session and load the corresponding database user.
 * If the user is authenticated via Clerk but does not exist in PostgreSQL, it performs
 * safe Just-In-Time (JIT) provisioning with default role 'student'.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    res.status(401).json({ error: "Unauthorized", message: "Missing or invalid Clerk session" });
    return;
  }

  try {
    let dbUser = await db.query.users.findFirst({
      where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
    });

    if (!dbUser) {
      req.log.info({ clerkUserId: auth.userId }, "Authenticated Clerk user not found in database, initiating JIT provisioning");

      let clerkUser: any = null;
      try {
        clerkUser = await clerkClient.users.getUser(auth.userId);
      } catch (clerkErr) {
        req.log.warn({ clerkUserId: auth.userId, clerkErr }, "Could not fetch Clerk user info from Clerk API, using fallback defaults");
      }

      const primaryEmail =
        clerkUser?.primaryEmailAddressId
          ? clerkUser.emailAddresses?.find((e: any) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress
          : clerkUser?.emailAddresses?.[0]?.emailAddress || `${auth.userId}@student.mkany.eg`;

      const fullName =
        [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
        clerkUser?.username ||
        primaryEmail.split("@")[0] ||
        "مستخدم مكاني";

      const avatarUrl = clerkUser?.imageUrl || null;

      // Check if an existing user record matches this email (e.g. pre-seeded or existing account)
      const existingByEmail = await db.query.users.findFirst({
        where: eq(users.email, primaryEmail),
      });

      if (existingByEmail) {
        // Safely link the Clerk User ID to existing account without overwriting existing role
        const [updated] = await db
          .update(users)
          .set({
            clerkUserId: auth.userId,
            avatarUrl: avatarUrl || existingByEmail.avatarUrl,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id))
          .returning();
        dbUser = updated;
      } else {
        // Provision new user record with default 'student' role (never admin from client)
        const newId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const rawNationalId =
          (clerkUser?.unsafeMetadata?.nationalId as string) ||
          (clerkUser?.publicMetadata?.nationalId as string) ||
          "00000000000000";
        const rawPhone =
          (clerkUser?.unsafeMetadata?.phoneNumber as string) ||
          (clerkUser?.publicMetadata?.phoneNumber as string) ||
          clerkUser?.phoneNumbers?.[0]?.phoneNumber ||
          "01000000000";
        const rawUniversity =
          (clerkUser?.unsafeMetadata?.university as string) ||
          (clerkUser?.publicMetadata?.university as string) ||
          "جامعة كفر الشيخ";

        const [created] = await db
          .insert(users)
          .values({
            id: newId,
            clerkUserId: auth.userId,
            fullName,
            email: primaryEmail,
            nationalId: rawNationalId,
            phoneNumber: rawPhone,
            university: rawUniversity,
            avatarUrl,
            role: "student",
            isVerified: false,
          })
          .returning();
        dbUser = created;
      }

      if (!dbUser) {
        // Fallback search in case of concurrent creation
        dbUser = await db.query.users.findFirst({
          where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
        });
      }

      if (!dbUser) {
        res.status(500).json({ error: "Internal Server Error", message: "Failed to provision user profile" });
        return;
      }
    }

    // Attach the authoritative PostgreSQL DB user to the request
    req.dbUser = dbUser;
    next();
  } catch (error) {
    req.log.error({ error, clerkUserId: auth.userId }, "Error resolving user from database");
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
