import { Router } from "express";
import { requireAuth, requireOwner } from "../middlewares/auth";
import { db, apartments, apartmentPhotos } from "@workspace/db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { insertApartmentSchema } from "@workspace/db/schema";

const router = Router();

// Browse apartments (public or student or filtering by query parameters)
router.get("/", async (req, res) => {
  try {
    const { city, university, minPrice, maxPrice, bedrooms, status, ownerId, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (city) conditions.push(eq(apartments.city, city as string));
    if (university) conditions.push(eq(apartments.university, university as string));
    if (minPrice) conditions.push(sql`${apartments.pricePerMonth} >= ${parseInt(minPrice as string, 10)}`);
    if (maxPrice) conditions.push(sql`${apartments.pricePerMonth} <= ${parseInt(maxPrice as string, 10)}`);
    if (bedrooms) conditions.push(eq(apartments.bedrooms, parseInt(bedrooms as string, 10)));
    if (ownerId) conditions.push(eq(apartments.ownerId, ownerId as string));

    if (status && status !== "all") {
      conditions.push(eq(apartments.status, status as string));
    } else if (!status && !ownerId) {
      // Default to showing available apartments when public browsing
      conditions.push(eq(apartments.status, "متاح"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.apartments.findMany({
      where: whereClause,
      limit: limitNum,
      offset,
      orderBy: [desc(apartments.createdAt)],
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    });

    return res.json(data);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Authenticated Owner endpoint to retrieve all their apartments (all statuses)
router.get("/mine", requireAuth, requireOwner, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    
    // Support filtering by ownerId (or clerkUserId)
    const userConditions = [eq(apartments.ownerId, dbUser.id)];
    if (dbUser.clerkUserId) {
      userConditions.push(eq(apartments.ownerId, dbUser.clerkUserId));
    }

    const data = await db.query.apartments.findMany({
      where: or(...userConditions),
      orderBy: [desc(apartments.createdAt)],
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    });

    return res.json(data);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get single apartment details by ID
router.get("/:id", async (req, res) => {
  try {
    const apartmentId = parseInt(req.params.id as string, 10);
    if (Number.isNaN(apartmentId)) {
      return res.status(400).json({ error: "Invalid apartment ID" });
    }

    const data = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            isVerified: true,
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.json(data);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Protected routes for owner: Create apartment
router.post("/", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const { photos, ...bodyData } = req.body;

  const result = insertApartmentSchema.safeParse(bodyData);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }

  try {
    // Extract images list from photos or images array
    const photoUrls: string[] = Array.isArray(photos) && photos.length > 0
      ? photos
      : (Array.isArray(result.data.images) ? result.data.images : []);

    const [apartment] = await db
      .insert(apartments)
      .values({
        ...result.data,
        images: photoUrls,
        ownerId: dbUser.id,
      })
      .returning();

    // Persist photos into apartment_photos table
    let savedPhotos: any[] = [];
    if (photoUrls.length > 0) {
      const photoInserts = photoUrls.map((url, index) => ({
        apartmentId: apartment.id,
        url,
        displayOrder: index,
        isCover: index === 0,
      }));

      savedPhotos = await db.insert(apartmentPhotos).values(photoInserts).returning();
    }

    return res.status(201).json({
      ...apartment,
      photos: savedPhotos,
    });
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Update apartment
router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  const { photos, ...bodyData } = req.body;
  const result = insertApartmentSchema.partial().safeParse(bodyData);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }

  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
      with: { photos: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You do not own this apartment" });
    }

    const updatePayload: any = {
      ...result.data,
      updatedAt: new Date(),
    };

    if (Array.isArray(photos)) {
      updatePayload.images = photos;
      // Replace or update apartmentPhotos if a new list is explicitly provided
      await db.delete(apartmentPhotos).where(eq(apartmentPhotos.apartmentId, apartmentId));
      if (photos.length > 0) {
        await db.insert(apartmentPhotos).values(
          photos.map((url: string, index: number) => ({
            apartmentId,
            url,
            displayOrder: index,
            isCover: index === 0,
          }))
        );
      }
    }

    const [updated] = await db
      .update(apartments)
      .set(updatePayload)
      .where(eq(apartments.id, apartmentId))
      .returning();

    const currentPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });

    return res.json({
      ...updated,
      photos: currentPhotos,
    });
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete apartment
router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You do not own this apartment" });
    }

    await db.delete(apartments).where(eq(apartments.id, apartmentId));
    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Photo management endpoints
router.post("/:id/photos", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }
  const { url, isCover, displayOrder } = req.body;

  if (typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ error: "Bad Request: invalid url" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [photo] = await db
      .insert(apartmentPhotos)
      .values({
        apartmentId,
        url,
        isCover: Boolean(isCover),
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
      })
      .returning();

    // Update images array in apartment
    const allPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });
    await db
      .update(apartments)
      .set({ images: allPhotos.map((p) => p.url) })
      .where(eq(apartments.id, apartmentId));

    return res.status(201).json(photo);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id/photos/:photoId", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  const photoId = req.params.photoId as string;
  if (Number.isNaN(apartmentId) || !photoId) {
    return res.status(400).json({ error: "Invalid apartment ID or photo ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(apartmentPhotos).where(
      and(
        eq(apartmentPhotos.id, photoId),
        eq(apartmentPhotos.apartmentId, apartmentId)
      )
    );

    // Update images array in apartment
    const remainingPhotos = await db.query.apartmentPhotos.findMany({
      where: eq(apartmentPhotos.apartmentId, apartmentId),
      orderBy: [asc(apartmentPhotos.displayOrder)],
    });
    await db
      .update(apartments)
      .set({ images: remainingPhotos.map((p) => p.url) })
      .where(eq(apartments.id, apartmentId));

    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
