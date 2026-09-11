import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateProfileBody } from "@workspace/api-zod";

const profileRouter = Router();

// Secure all profile routes
profileRouter.use(requireAuth);

profileRouter.get("/", (req, res) => {
  // Return current user's profile
  res.json(req.dbUser);
});

profileRouter.patch("/", async (req, res) => {
  const dbUser = req.dbUser;
  if (!dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = UpdateProfileBody.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Bad Request", issues: result.error.format() });
    return;
  }

  // Explicitly sanitize update payload to prevent any possibility of role/isVerified/id manipulation
  const { fullName, nationalId, phoneNumber, university, avatarUrl } = result.data;
  const updateData: Record<string, any> = { updatedAt: new Date() };
  if (fullName !== undefined) updateData.fullName = fullName;
  if (nationalId !== undefined) updateData.nationalId = nationalId;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (university !== undefined) updateData.university = university;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  try {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(updatedUser);
  } catch (error) {
    req.log.error({ error, clerkUserId: dbUser.clerkUserId }, "Failed to update profile");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

profileRouter.post("/onboarding", async (req, res) => {
  const dbUser = req.dbUser;
  if (!dbUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Security check: Only allow onboarding for users who have not completed onboarding
  // Admin, Owner, or Student with real completed data cannot re-run onboarding to alter roles.
  const isStudentCompleted = dbUser.role === "student" && dbUser.nationalId !== "00000000000000" && dbUser.phoneNumber !== "01000000000";
  if (dbUser.role === "admin" || dbUser.role === "owner" || isStudentCompleted) {
    res.status(403).json({ error: "Onboarding already completed for this account" });
    return;
  }

  const { accountType, fullName, nationalId, phoneNumber, university, avatarUrl } = req.body || {};

  if (!accountType || (accountType !== "student" && accountType !== "owner")) {
    res.status(400).json({ error: "Invalid account type. Must be 'student' or 'owner'." });
    return;
  }

  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 3) {
    res.status(400).json({ error: "Full name must be at least 3 characters." });
    return;
  }

  if (!phoneNumber || typeof phoneNumber !== "string" || !/^(01[0125]\d{8}|\+201[0125]\d{8})$/.test(phoneNumber.trim())) {
    res.status(400).json({ error: "Invalid Egyptian phone number format (e.g., 01012345678)." });
    return;
  }

  const updateData: Record<string, any> = {
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
    updatedAt: new Date(),
  };

  if (avatarUrl && typeof avatarUrl === "string") {
    updateData.avatarUrl = avatarUrl;
  }

  if (accountType === "student") {
    if (!nationalId || typeof nationalId !== "string" || !/^\d{14}$/.test(nationalId.trim())) {
      res.status(400).json({ error: "National ID must be exactly 14 digits." });
      return;
    }
    if (!university || typeof university !== "string" || university.trim().length < 2) {
      res.status(400).json({ error: "University name is required for student accounts." });
      return;
    }
    updateData.nationalId = nationalId.trim();
    updateData.university = university.trim();
    updateData.role = "student";
  } else if (accountType === "owner") {
    updateData.university = "مالك عقار سكن طلابي";
    updateData.nationalId = nationalId && /^\d{14}$/.test(nationalId.trim()) ? nationalId.trim() : "00000000000000";
    updateData.role = "owner";
  }

  try {
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, dbUser.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.log.info({ userId: updatedUser.id, role: updatedUser.role }, "Completed user onboarding successfully");
    res.json(updatedUser);
  } catch (error) {
    req.log.error({ error, userId: dbUser.id }, "Failed to complete onboarding");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default profileRouter;
