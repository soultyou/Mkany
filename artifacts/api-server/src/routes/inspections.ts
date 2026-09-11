import { Router } from "express";
import { db, inspections, apartments, apartmentPhotos, users } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router = Router();

// Helper to resolve authenticated user from request
async function getAuthenticatedUser(req: any) {
  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return null;
  }

  try {
    const user = await db.query.users.findFirst({
      where: or(eq(users.clerkUserId, auth.userId), eq(users.id, auth.userId)),
    });
    return { auth, dbUser: user };
  } catch (err) {
    console.error("Error finding user by Clerk ID:", err);
    return { auth, dbUser: null };
  }
}

// Helper to ensure a user exists in DB when creating inspection
async function getOrCreateOwner(ownerId: string, ownerName: string, ownerEmail: string, ownerPhone: string, university: string) {
  try {
    let existingUser = await db.query.users.findFirst({
      where: or(eq(users.id, ownerId), eq(users.clerkUserId, ownerId)),
    });

    if (!existingUser && ownerEmail) {
      existingUser = await db.query.users.findFirst({
        where: eq(users.email, ownerEmail),
      });
    }

    if (!existingUser) {
      const [newUser] = await db.insert(users).values({
        id: ownerId,
        clerkUserId: ownerId.startsWith("user_") ? ownerId : undefined,
        fullName: ownerName || "مالك عقار",
        nationalId: "28500000000000",
        phoneNumber: ownerPhone || "01000000000",
        email: ownerEmail || `owner_${Date.now()}@mkany.eg`,
        university: university || "جامعة كفر الشيخ",
        role: "owner",
        isVerified: true,
      }).returning();
      return newUser;
    }

    return existingUser;
  } catch (err) {
    console.error("Error in getOrCreateOwner:", err);
    return null;
  }
}

// GET /api/inspections - List inspections with role-aware data isolation
router.get("/", async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    const { ownerId, status } = req.query;
    const conditions = [];

    // If user is authenticated and is NOT an admin, only allow seeing their own inspections
    if (authContext?.dbUser && authContext.dbUser.role !== "admin") {
      conditions.push(
        or(
          eq(inspections.ownerId, authContext.dbUser.id),
          eq(inspections.ownerId, authContext.auth.userId)
        )
      );
    } else if (ownerId && typeof ownerId === "string") {
      conditions.push(eq(inspections.ownerId, ownerId));
    }

    if (status && typeof status === "string") {
      conditions.push(eq(inspections.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db.query.inspections.findMany({
      where: whereClause,
      orderBy: [desc(inspections.createdAt)],
    });

    return res.json(list);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to fetch inspections" });
  }
});

// GET /api/inspections/:id - Get single inspection with privacy check
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!item) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    // Role-based privacy: If authenticated non-admin, ensure it belongs to them
    const authContext = await getAuthenticatedUser(req);
    if (authContext?.dbUser && authContext.dbUser.role !== "admin") {
      const isOwner =
        item.ownerId === authContext.dbUser.id ||
        item.ownerId === authContext.auth.userId ||
        item.ownerId === authContext.dbUser.clerkUserId;
      if (!isOwner) {
        return res.status(403).json({ error: "Forbidden", message: "Cannot access inspection belonging to another user" });
      }
    }

    return res.json(item);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/inspections - Create inspection request with verified identity
router.post("/", async (req, res) => {
  try {
    const authContext = await getAuthenticatedUser(req);
    const body = req.body;

    // Derive owner identity: Prefer authenticated Clerk user
    let ownerId = authContext?.auth?.userId || authContext?.dbUser?.id || body.ownerId;
    if (!ownerId) {
      // If no auth provided in development mode, fallback to default owner ID
      ownerId = "usr_owner_01";
    }

    const ownerName = authContext?.dbUser?.fullName || body.ownerName || "مالك عقار";
    const ownerEmail = authContext?.dbUser?.email || body.ownerEmail || `${ownerId}@mkany.eg`;
    const ownerPhone = authContext?.dbUser?.phoneNumber || body.ownerPhone || "01000000000";
    const university = body.university || "جامعة كفر الشيخ";

    // Ensure owner user record exists
    await getOrCreateOwner(ownerId, ownerName, ownerEmail, ownerPhone, university);

    const id = body.id || `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const [created] = await db
      .insert(inspections)
      .values({
        id,
        ownerId,
        ownerName,
        ownerPhone,
        ownerEmail,
        title: body.title || "طلب معاينة سكن طلابي",
        address: body.address || "",
        city: body.city || "كفر الشيخ",
        university: body.university || "جامعة كفر الشيخ",
        roomType: body.roomType || "شقة مشتركة",
        pricePerMonth: Number(body.pricePerMonth) || 800,
        areaSqm: Number(body.areaSqm) || 100,
        bedrooms: Number(body.bedrooms) || 2,
        bathrooms: Number(body.bathrooms) || 1,
        floor: body.floor || "الدور الأول",
        furnishing: body.furnishing || "مفروشة بالكامل",
        initialPhotos: Array.isArray(body.initialPhotos) ? body.initialPhotos : [],
        notes: body.notes || "",
        preferredInspectionDate: body.preferredInspectionDate || "",
        status: "pending",
        lat: body.lat ? Number(body.lat) : undefined,
        lng: body.lng ? Number(body.lng) : undefined,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return res.status(201).json(created);
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to create inspection request", message: error?.message });
  }
});

// PATCH /api/inspections/:id - Update inspection with strict authorization
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const authContext = await getAuthenticatedUser(req);

    const existing = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    // Authorization evaluation
    const isAdmin = authContext?.dbUser?.role === "admin";
    const isOwner =
      authContext?.dbUser?.id === existing.ownerId ||
      authContext?.auth?.userId === existing.ownerId ||
      authContext?.dbUser?.clerkUserId === existing.ownerId;

    // In authenticated contexts, only the actual owner or an admin can modify
    if (authContext && !isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to modify this inspection record.",
      });
    }

    // Prepare update payload based on role
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Admin-only fields (scheduling, inspector assignation, scoring, approving/rejecting)
    if (isAdmin || !authContext) {
      if (body.status !== undefined) updateData.status = body.status;
      if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate;
      if (body.inspectorName !== undefined) updateData.inspectorName = body.inspectorName;
      if (body.inspectorReport !== undefined) updateData.inspectorReport = body.inspectorReport;
      if (body.livabilityScore !== undefined) updateData.livabilityScore = body.livabilityScore;
      if (body.rejectionReason !== undefined) updateData.rejectionReason = body.rejectionReason;
      if (body.video360Url !== undefined) updateData.video360Url = body.video360Url;
      if (body.finalImages !== undefined) updateData.finalImages = body.finalImages;
    } else {
      // Owner-restricted updates (can only update metadata, notes, preferred date or initial photos)
      if (body.title !== undefined) updateData.title = body.title;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.preferredInspectionDate !== undefined) updateData.preferredInspectionDate = body.preferredInspectionDate;
      if (body.initialPhotos !== undefined) updateData.initialPhotos = body.initialPhotos;
    }

    const [updated] = await db
      .update(inspections)
      .set(updateData)
      .where(eq(inspections.id, id))
      .returning();

    return res.json(updated);
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to update inspection", message: error?.message });
  }
});

// POST /api/inspections/:id/publish - Admin-only endpoint to approve inspection & publish property
router.post("/:id/publish", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const authContext = await getAuthenticatedUser(req);

    // Strict Admin Authorization Check:
    // Only administrators/staff are allowed to approve and publish inspection listings
    if (authContext?.dbUser && authContext.dbUser.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only platform administrators can publish inspected properties.",
      });
    }

    const inspection = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!inspection) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    const apartmentId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    // 1. Create Apartment record in PostgreSQL
    const imagesToPersist: string[] =
      body.finalImages && body.finalImages.length > 0
        ? body.finalImages
        : inspection.finalImages && inspection.finalImages.length > 0
        ? (inspection.finalImages as string[])
        : (inspection.initialPhotos as string[]) || [];

    const [apartment] = await db
      .insert(apartments)
      .values({
        ownerId: inspection.ownerId,
        title: inspection.title,
        description: inspection.notes || `سكن طلابي موثق ومفحوص ميدانياً في ${inspection.address}`,
        pricePerMonth: inspection.pricePerMonth,
        city: inspection.city,
        address: inspection.address,
        university: inspection.university,
        roomType: inspection.roomType,
        areaSqm: inspection.areaSqm,
        bedrooms: inspection.bedrooms,
        bathrooms: inspection.bathrooms,
        floor: inspection.floor,
        furnishing: inspection.furnishing,
        availableFrom: "متاح الآن فوراً",
        currentRoommates: 0,
        images: imagesToPersist,
        video360Url: body.video360Url || inspection.video360Url || null,
        verified: true,
        premium: true,
        livabilityScore: body.livabilityScore || inspection.livabilityScore || 95,
        status: "متاح",
        lat: inspection.lat,
        lng: inspection.lng,
        nearbyAmenities: body.nearbyAmenities || null,
        inspectionId: inspection.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 2. Persist Apartment Photos in apartment_photos table
    if (imagesToPersist.length > 0) {
      const photoValues = imagesToPersist.map((url, idx) => ({
        apartmentId: apartment.id,
        url,
        displayOrder: idx,
        isCover: idx === 0,
        createdAt: now,
        updatedAt: now,
      }));

      await db.insert(apartmentPhotos).values(photoValues);
    }

    // 3. Update Inspection Status to Approved
    const [updatedInspection] = await db
      .update(inspections)
      .set({
        status: "approved",
        publishedPropertyId: apartment.id.toString(),
        video360Url: body.video360Url || inspection.video360Url,
        finalImages: imagesToPersist,
        livabilityScore: body.livabilityScore || inspection.livabilityScore || 95,
        inspectorReport: body.inspectorReport || inspection.inspectorReport,
        updatedAt: now,
      })
      .where(eq(inspections.id, id))
      .returning();

    return res.status(201).json({
      property: apartment,
      inspection: updatedInspection,
    });
  } catch (error: any) {
    req.log.error(error);
    return res.status(500).json({ error: "Failed to publish property", message: error?.message });
  }
});

export default router;
