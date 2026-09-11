import { Router } from "express";
import { requireAuth, requireOwner } from "../middlewares/auth";
import { db, apartments, apartmentPhotos } from "@workspace/db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { insertApartmentSchema } from "@workspace/db/schema";

const router = Router();

// Browse apartments (public or student)
router.get("/", async (req, res) => {
  try {
    const { city, university, minPrice, maxPrice, bedrooms, page = "1", limit = "10" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (city) conditions.push(eq(apartments.city, city as string));
    if (university) conditions.push(eq(apartments.university, university as string));
    if (minPrice) conditions.push(sql`${apartments.pricePerMonth} >= ${parseInt(minPrice as string, 10)}`);
    if (maxPrice) conditions.push(sql`${apartments.pricePerMonth} <= ${parseInt(maxPrice as string, 10)}`);
    if (bedrooms) conditions.push(eq(apartments.bedrooms, parseInt(bedrooms as string, 10)));
    
    // Only show available apartments when browsing
    conditions.push(eq(apartments.status, "متاح"));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db.query.apartments.findMany({
      where: whereClause,
      limit: limitNum,
      offset,
      orderBy: [desc(apartments.createdAt)],
      with: {
        photos: true,
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true
          }
        }
      }
    });

    return res.json(data);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

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
          orderBy: [asc(apartmentPhotos.displayOrder)]
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            phoneNumber: true,
            isVerified: true
          }
        }
      }
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

// Protected routes for owner
router.post("/", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  
  const result = insertApartmentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }
  
  try {
    const [apartment] = await db.insert(apartments).values({
      ...result.data,
      ownerId: dbUser.id
    }).returning();
    
    return res.status(201).json(apartment);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }
  
  const result = insertApartmentSchema.partial().safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: "Bad Request", issues: result.error.format() });
  }
  
  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId)
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden: You do not own this apartment" });
    }
    
    const [updated] = await db.update(apartments)
      .set({
        ...result.data,
        updatedAt: new Date()
      })
      .where(eq(apartments.id, apartmentId))
      .returning();
      
    return res.json(updated);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }
  
  try {
    // Check ownership or admin
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId)
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

// Photo management
router.post("/:id/photos", requireAuth, requireOwner, async (req, res) => {
  const dbUser = req.dbUser!;
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }
  const { url, isCover, displayOrder } = req.body;
  
  if (typeof url !== 'string' || !url.startsWith('http')) {
    return res.status(400).json({ error: "Bad Request: invalid url" });
  }
  
  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId)
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    const [photo] = await db.insert(apartmentPhotos).values({
      apartmentId,
      url,
      isCover: Boolean(isCover),
      displayOrder: typeof displayOrder === "number" ? displayOrder : 0
    }).returning();
    
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
      where: eq(apartments.id, apartmentId)
    });
    
    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    if (dbUser.role !== "admin" && existing.ownerId !== dbUser.id && existing.ownerId !== dbUser.clerkUserId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    await db.delete(apartmentPhotos).where(and(
      eq(apartmentPhotos.id, photoId),
      eq(apartmentPhotos.apartmentId, apartmentId)
    ));
    
    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
