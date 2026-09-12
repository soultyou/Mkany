import { Router, type Request, type Response } from "express";
import { db, users } from "@workspace/db";
import { eq, or, and, isNotNull, inArray, desc } from "drizzle-orm";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";

const adminRouter = Router();

export function isPermanentSuperAdmin(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return normalized === "soultyou@outlook.sa" || normalized === "soultyou@outlook.com";
}

/**
 * POST /api/admin/bootstrap-super-admin
 * Temporary bootstrap endpoint to set up the first Super Admin.
 * Permanently disables itself once a Super Admin with an attached Clerk user exists.
 */
adminRouter.post("/bootstrap-super-admin", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = req.dbUser;
    const auth = (req as any).auth;
    const clerkUserId = authUser?.clerkUserId || auth?.userId;

    // Check if an active Super Admin (with linked clerkUserId) already exists
    const existingActiveSuperAdmin = await db.query.users.findFirst({
      where: and(eq(users.role, "super_admin"), isNotNull(users.clerkUserId)),
    });

    if (existingActiveSuperAdmin && existingActiveSuperAdmin.clerkUserId !== clerkUserId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Super Admin is already bootstrapped",
      });
    }

    const targetEmail = "soultyou@outlook.sa";
    
    // Check if user record exists by email or clerkUserId or authUser id
    let userToPromote = await db.query.users.findFirst({
      where: or(
        eq(users.email, targetEmail),
        eq(users.email, "soultyou@outlook.com"),
        authUser?.id ? eq(users.id, authUser.id) : undefined,
        clerkUserId ? eq(users.clerkUserId, clerkUserId) : undefined
      ),
    });

    if (!userToPromote) {
      const [createdUser] = await db
        .insert(users)
        .values({
          id: authUser?.id || `usr_superadmin_${Date.now()}`,
          clerkUserId: clerkUserId || null,
          email: targetEmail,
          fullName: "ELFA7L kholio",
          role: "super_admin",
          isVerified: true,
          nationalId: "00000000000000",
          phoneNumber: "01000000000",
          university: "الإدارة المركزية",
        })
        .returning();
      userToPromote = createdUser;
    } else {
      const [updatedUser] = await db
        .update(users)
        .set({
          role: "super_admin",
          isVerified: true,
          fullName: "ELFA7L kholio",
          email: targetEmail,
          clerkUserId: clerkUserId || userToPromote.clerkUserId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userToPromote.id))
        .returning();
      userToPromote = updatedUser;
    }

    req.log.info({ userId: userToPromote.id, email: userToPromote.email }, "Bootstrapped first Super Admin");

    return res.json({
      success: true,
      message: "Super Admin bootstrapped successfully",
      user: userToPromote,
    });
  } catch (error) {
    req.log.error({ error }, "Failed to bootstrap super admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export function maskPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "—";
  const trimmed = phone.trim();
  if (trimmed.length < 6) return "****";
  return trimmed.slice(0, 4) + "****" + trimmed.slice(-3);
}

/**
 * GET /api/admin/admins
 * List all users with role 'admin' or 'super_admin'
 */
adminRouter.get("/admins", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const list = await db.query.users.findMany({
      where: inArray(users.role, ["admin", "super_admin"]),
      columns: {
        id: true,
        clerkUserId: true,
        fullName: true,
        email: true,
        role: true,
        phoneNumber: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [desc(users.createdAt)],
    });

    const sanitizedList = list.map((user: any) => ({
      ...user,
      phoneNumber: maskPhoneNumber(user.phoneNumber),
    }));

    return res.json(sanitizedList);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin list");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/admin/admins
 * Create/Pre-provision a new regular admin or super admin
 */
adminRouter.post("/admins", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { fullName, email, role, phoneNumber, nationalId, university } = req.body;

    if (!fullName || !email || !role) {
      return res.status(400).json({ error: "Bad Request", message: "fullName, email, and role are required" });
    }

    if (role !== "admin" && role !== "super_admin") {
      return res.status(400).json({ error: "Bad Request", message: "Invalid role specified" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existing) {
      return res.status(400).json({ error: "Conflict", message: "A user with this email already exists" });
    }

    const newId = `usr_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const [created] = await db
      .insert(users)
      .values({
        id: newId,
        clerkUserId: null, // Will be linked on first JIT login
        fullName,
        email: normalizedEmail,
        role,
        isVerified: true,
        phoneNumber: phoneNumber || "01000000000",
        nationalId: nationalId || "00000000000000",
        university: university || "الإدارة المركزية",
      })
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const sanitizedCreated = {
      ...created,
      phoneNumber: maskPhoneNumber(created.phoneNumber),
    };

    req.log.info({ createdBy: req.dbUser?.id, createdId: created.id }, "Created new admin");
    return res.status(201).json(sanitizedCreated);
  } catch (error) {
    req.log.error({ error }, "Failed to create admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/admin/admins/:id
 * Update an admin's role, name, or verification status
 */
adminRouter.patch("/admins/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role, fullName, isVerified } = req.body;

    const userToUpdate = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!userToUpdate) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    // Security block: Prevent demoting or changing role of the permanent Super Admin
    if (isPermanentSuperAdmin(userToUpdate.email)) {
      if (role && role !== "super_admin") {
        return res.status(403).json({ error: "Forbidden", message: "The permanent Super Admin cannot be demoted" });
      }
    }

    // Build update object
    const updateData: any = {};
    if (role !== undefined) {
      if (role !== "admin" && role !== "super_admin" && role !== "student" && role !== "owner") {
        return res.status(400).json({ error: "Bad Request", message: "Invalid role specified" });
      }
      updateData.role = role;
    }
    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }
    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
    }

    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        clerkUserId: users.clerkUserId,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phoneNumber: users.phoneNumber,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const sanitizedUpdated = {
      ...updated,
      phoneNumber: maskPhoneNumber(updated.phoneNumber),
    };

    req.log.info({ updatedBy: req.dbUser?.id, targetId: id }, "Updated admin details");
    return res.json(sanitizedUpdated);
  } catch (error) {
    req.log.error({ error }, "Failed to update admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete a regular admin
 */
adminRouter.delete("/admins/:id", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!userToDelete) {
      return res.status(404).json({ error: "Not Found", message: "User not found" });
    }

    // Security block: Prevent deleting the permanent Super Admin
    if (isPermanentSuperAdmin(userToDelete.email)) {
      return res.status(403).json({ error: "Forbidden", message: "The permanent Super Admin cannot be deleted" });
    }

    await db.delete(users).where(eq(users.id, id));

    req.log.info({ deletedBy: req.dbUser?.id, targetId: id }, "Deleted admin");
    return res.json({ success: true, message: "Admin user deleted successfully" });
  } catch (error) {
    req.log.error({ error }, "Failed to delete admin");
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default adminRouter;
