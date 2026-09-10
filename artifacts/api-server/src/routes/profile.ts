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

  try {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...result.data,
        updatedAt: new Date(),
      })
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
