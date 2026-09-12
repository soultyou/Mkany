import { Router } from "express";
import { requireAuth, requireOwner, requireAdmin } from "../middlewares/auth";
import { db, apartments, apartmentPhotos, users, bookings } from "@workspace/db";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { insertApartmentSchema } from "@workspace/db/schema";
import { getAuth } from "@clerk/express";
import { ensureSeedApartments } from "../lib/seed-apartments";

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

    // CRITICAL SECURITY RULE: Students and public users MUST ONLY see "متاح" (approved & available) properties.
    // Pending ("قيد المراجعة") or rejected ("مرفوض") properties are never returned to students/public.
    const auth = getAuth(req);
    let isRequesterAdmin = false;
    let requesterId: string | null = null;
    let requesterClerkId: string | null = null;

    if (auth?.userId) {
      const authUser = await db.query.users.findFirst({
        where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
      });
      if (authUser) {
        if (authUser.role === "admin") isRequesterAdmin = true;
        requesterId = authUser.id;
        requesterClerkId = authUser.clerkUserId;
      }
    }

    if (isRequesterAdmin) {
      // Admins can see all or filter by requested status
      if (status && status !== "all") {
        conditions.push(eq(apartments.status, status as string));
      }
    } else if (ownerId && requesterId && (ownerId === requesterId || (requesterClerkId && ownerId === requesterClerkId))) {
      // The owner themselves querying their own apartments can see their pending/rejected units
      if (status && status !== "all") {
        conditions.push(eq(apartments.status, status as string));
      }
    } else {
      // For general student/public browsing or other owners, strictly restrict to "متاح"
      conditions.push(eq(apartments.status, "متاح"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let data = await db.query.apartments.findMany({
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
            isVerified: true,
          },
        },
      },
    });

    if (data.length === 0 && !city && !university && !ownerId) {
      await ensureSeedApartments();
      data = await db.query.apartments.findMany({
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
              isVerified: true,
            },
          },
        },
      });
    }

    // Recalculate dynamic availablePlaces and append activeBookings
    const aptIds = data.map((a: any) => a.id);
    let allActiveBookings: any[] = [];
    if (aptIds.length > 0) {
      allActiveBookings = await db.query.bookings.findMany({
        where: and(
          or(...aptIds.map((id: number) => eq(bookings.propertyId, id))),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
        ),
        columns: {
          id: true,
          propertyId: true,
          appointmentDate: true,
          status: true,
        }
      });
    }

    const enhancedData = data.map((apt: any) => {
      const aptBookings = allActiveBookings.filter((b: any) => b.propertyId === apt.id);
      const capacity = apt.bedrooms || 0;
      const currentRoommates = apt.currentRoommates || 0;
      const occupiedPlaces = currentRoommates + aptBookings.length;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      return {
        ...apt,
        activeBookings: aptBookings,
        availablePlaces,
      };
    });

    return res.json(enhancedData);
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

    // Recalculate dynamic availablePlaces and append activeBookings
    const aptIds = data.map((a: any) => a.id);
    let allActiveBookings: any[] = [];
    if (aptIds.length > 0) {
      allActiveBookings = await db.query.bookings.findMany({
        where: and(
          or(...aptIds.map((id: number) => eq(bookings.propertyId, id))),
          or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
        ),
        columns: {
          id: true,
          propertyId: true,
          appointmentDate: true,
          status: true,
        }
      });
    }

    const enhancedData = data.map((apt: any) => {
      const aptBookings = allActiveBookings.filter((b: any) => b.propertyId === apt.id);
      const capacity = apt.bedrooms || 0;
      const currentRoommates = apt.currentRoommates || 0;
      const occupiedPlaces = currentRoommates + aptBookings.length;
      const availablePlaces = Math.max(0, capacity - occupiedPlaces);
      return {
        ...apt,
        activeBookings: aptBookings,
        availablePlaces,
      };
    });

    return res.json(enhancedData);
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

    let data = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
      with: {
        photos: {
          orderBy: [asc(apartmentPhotos.displayOrder)],
        },
        owner: {
          columns: {
            fullName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    if (!data) {
      await ensureSeedApartments();
      data = await db.query.apartments.findFirst({
        where: eq(apartments.id, apartmentId),
        with: {
          photos: {
            orderBy: [asc(apartmentPhotos.displayOrder)],
          },
          owner: {
            columns: {
              fullName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      });
    }

    if (!data) {
      return res.status(404).json({ error: "Not found", message: "الوحدة السكنية غير موجودة" });
    }

    // Strict privacy: if property is not approved/available ("متاح"), only Admin or the property Owner can view it
    if (data.status !== "متاح") {
      const auth = getAuth(req);
      let canViewUnapproved = false;
      if (auth?.userId) {
        const authUser = await db.query.users.findFirst({
          where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
        });
        if (authUser) {
          if (authUser.role === "admin" || authUser.role === "super_admin" || authUser.id === data.ownerId || authUser.clerkUserId === data.ownerId) {
            canViewUnapproved = true;
          }
        }
      }
      if (!canViewUnapproved) {
        return res.status(404).json({ error: "Not found", message: "الوحدة السكنية غير متاحة أو قيد مراجعة الإدارة" });
      }
    }

    // Fetch active bookings for this apartment
    const activeBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.propertyId, data.id),
        or(eq(bookings.status, "confirmed"), eq(bookings.status, "pending_review"))
      ),
      columns: {
        id: true,
        propertyId: true,
        appointmentDate: true,
        status: true,
      }
    });

    const capacity = data.bedrooms || 0;
    const currentRoommates = data.currentRoommates || 0;
    const occupiedPlaces = currentRoommates + activeBookings.length;
    const availablePlaces = Math.max(0, capacity - occupiedPlaces);

    const enhancedData = {
      ...data,
      activeBookings,
      availablePlaces,
    };

    return res.json(enhancedData);
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

    // WORKFLOW RULE: If created by an Owner (non-admin), property starts in "قيد المراجعة" (Pending Review) and unverified.
    // Admin submissions can immediately be "متاح" and verified.
    const initialStatus = dbUser.role === "admin" 
      ? (result.data.status || "متاح") 
      : "قيد المراجعة";

    const initialVerified = dbUser.role === "admin" 
      ? (result.data.verified ?? true) 
      : false;

    const [apartment] = await db
      .insert(apartments)
      .values({
        ...result.data,
        images: photoUrls,
        ownerId: dbUser.id,
        status: initialStatus,
        verified: initialVerified,
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

    // If non-admin user (Owner), prevent self-verification and self-approval
    if (dbUser.role !== "admin") {
      if ("verified" in req.body) {
        return res.status(403).json({
          error: "Forbidden",
          message: "لا يمكن للمالك تعديل حالة توثيق العقار - التوثيق والاعتماد حصري لإدارة مكاني",
        });
      }

      delete updatePayload.ownerId; // Owners cannot transfer ownership

      // Critical Status Transition Security for Owners:
      // Rejection and approval are strictly administrative powers.
      if (req.body.status && req.body.status !== existing.status) {
        // 1. Owner can never set status to "مرفوض" (admin rejection only)
        if (req.body.status === "مرفوض") {
          return res.status(403).json({
            error: "Forbidden",
            message: "رفض العقار قرار حصري لإدارة مكاني",
          });
        }

        // 2. Owner cannot change status if currently "قيد المراجعة" or "مرفوض"
        // Specifically blocks "قيد المراجعة" -> "متاح" and "قيد المراجعة" -> "مرفوض"
        if (existing.status === "قيد المراجعة" || existing.status === "مرفوض") {
          return res.status(403).json({
            error: "Forbidden",
            message: "لا يمكن للمالك تغيير حالة العقار عندما يكون قيد المراجعة أو مرفوضاً - القرار حصري لإدارة مكاني",
          });
        }

        // 3. For approved properties, owner can only toggle between "متاح" and "مشغول"
        if (req.body.status !== "متاح" && req.body.status !== "مشغول") {
          return res.status(403).json({
            error: "Forbidden",
            message: "يمكن للمالك فقط تبديل الحالة بين متاح ومشغول للوحدات المعتمدة",
          });
        }
      }
    }

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

// POST /api/apartments/:id/approve - Strict Admin-only endpoint to approve property
router.post("/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const [updated] = await db
      .update(apartments)
      .set({
        status: "متاح",
        verified: true,
        updatedAt: new Date(),
      })
      .where(eq(apartments.id, apartmentId))
      .returning();

    req.log.info({ adminId: req.dbUser!.id, apartmentId }, "Admin approved apartment for listing");
    return res.json(updated);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/apartments/:id/reject - Strict Admin-only endpoint to reject property
router.post("/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const apartmentId = parseInt(req.params.id as string, 10);
  if (Number.isNaN(apartmentId)) {
    return res.status(400).json({ error: "Invalid apartment ID" });
  }

  try {
    const existing = await db.query.apartments.findFirst({
      where: eq(apartments.id, apartmentId),
    });

    if (!existing) {
      return res.status(404).json({ error: "Apartment not found" });
    }

    const [updated] = await db
      .update(apartments)
      .set({
        status: "مرفوض",
        verified: false,
        updatedAt: new Date(),
      })
      .where(eq(apartments.id, apartmentId))
      .returning();

    req.log.info({ adminId: req.dbUser!.id, apartmentId }, "Admin rejected apartment");
    return res.json(updated);
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
      .set({ images: allPhotos.map((p: any) => p.url) })
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
      .set({ images: remainingPhotos.map((p: any) => p.url) })
      .where(eq(apartments.id, apartmentId));

    return res.status(204).send();
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
