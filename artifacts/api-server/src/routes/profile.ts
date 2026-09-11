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

export default profileRouter;
