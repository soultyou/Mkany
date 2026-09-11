import { Router } from "express";
import { db, inspections, apartments, apartmentPhotos } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

// GET /api/inspections - List inspections with role-aware data isolation (Requires Auth)
router.get("/", requireAuth, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    const auth = getAuth(req);
    const { ownerId, status } = req.query;
    const conditions = [];

    // Admins can see all inspections or filter by ownerId
    if (dbUser.role === "admin") {
      if (ownerId && typeof ownerId === "string") {
        conditions.push(eq(inspections.ownerId, ownerId));
      }
    } else {
      // Non-admins (owners, students) can ONLY see their own inspections
      const myIds: string[] = [dbUser.id];
      if (dbUser.clerkUserId && !myIds.includes(dbUser.clerkUserId)) {
        myIds.push(dbUser.clerkUserId);
      }
      if (auth.userId && !myIds.includes(auth.userId)) {
        myIds.push(auth.userId);
      }

      conditions.push(
        or(...myIds.map((idVal) => eq(inspections.ownerId, idVal)))
      );
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

// GET /api/inspections/:id - Get single inspection with strict privacy check (Requires Auth)
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dbUser = req.dbUser!;
    const auth = getAuth(req);

    const item = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!item) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    // Role-based privacy: Admin can view all; Non-admin can only view their own
    const isAdmin = dbUser.role === "admin";
    const isOwner =
      item.ownerId === dbUser.id ||
      item.ownerId === auth.userId ||
      (dbUser.clerkUserId !== null && dbUser.clerkUserId !== undefined && item.ownerId === dbUser.clerkUserId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Cannot access inspection belonging to another user",
      });
    }

    return res.json(item);
  } catch (error) {
    req.log.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/inspections - Create inspection request with verified identity (Requires Auth)
router.post("/", requireAuth, async (req, res) => {
  try {
    const dbUser = req.dbUser!;
    const auth = getAuth(req);
    const body = req.body;

    // Derive owner identity strictly from authenticated user context
    const ownerId = dbUser.id || auth.userId!;
    const ownerName = dbUser.fullName || body.ownerName || "مالك عقار";
    const ownerEmail = dbUser.email || body.ownerEmail || `${ownerId}@mkany.eg`;
    const ownerPhone = dbUser.phoneNumber || body.ownerPhone || "01000000000";
    const university = body.university || dbUser.university || "جامعة كفر الشيخ";

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
        university,
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

// PATCH /api/inspections/:id - Update inspection with strict role authorization (Requires Auth)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body;
    const dbUser = req.dbUser!;
    const auth = getAuth(req);

    const existing = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    const isAdmin = dbUser.role === "admin";
    const isOwner =
      dbUser.id === existing.ownerId ||
      auth.userId === existing.ownerId ||
      (dbUser.clerkUserId !== null && dbUser.clerkUserId !== undefined && dbUser.clerkUserId === existing.ownerId);

    // Only the verified owner or an admin can modify
    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You are not authorized to modify this inspection record.",
      });
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (isAdmin) {
      // Admin fields (scheduling, inspector assignment, scoring, approving/rejecting, 360 tour, final images)
      if (body.status !== undefined) updateData.status = body.status;
      if (body.scheduledDate !== undefined) updateData.scheduledDate = body.scheduledDate;
      if (body.inspectorName !== undefined) updateData.inspectorName = body.inspectorName;
      if (body.inspectorReport !== undefined) updateData.inspectorReport = body.inspectorReport;
      if (body.livabilityScore !== undefined) updateData.livabilityScore = Number(body.livabilityScore);
      if (body.rejectionReason !== undefined) updateData.rejectionReason = body.rejectionReason;
      if (body.video360Url !== undefined) updateData.video360Url = body.video360Url;
      if (body.finalImages !== undefined) updateData.finalImages = body.finalImages;
      if (body.title !== undefined) updateData.title = body.title;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.preferredInspectionDate !== undefined) updateData.preferredInspectionDate = body.preferredInspectionDate;
    } else if (isOwner) {
      // Owner-restricted updates (can only update pre-inspection details, notes, preferred date, initial photos)
      if (body.title !== undefined) updateData.title = body.title;
      if (body.notes !== undefined) updateData.notes = body.notes;
      if (body.preferredInspectionDate !== undefined) updateData.preferredInspectionDate = body.preferredInspectionDate;
      if (body.initialPhotos !== undefined) updateData.initialPhotos = body.initialPhotos;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.university !== undefined) updateData.university = body.university;
      if (body.roomType !== undefined) updateData.roomType = body.roomType;
      if (body.pricePerMonth !== undefined) updateData.pricePerMonth = Number(body.pricePerMonth);
      if (body.areaSqm !== undefined) updateData.areaSqm = Number(body.areaSqm);
      if (body.bedrooms !== undefined) updateData.bedrooms = Number(body.bedrooms);
      if (body.bathrooms !== undefined) updateData.bathrooms = Number(body.bathrooms);
      if (body.floor !== undefined) updateData.floor = body.floor;
      if (body.furnishing !== undefined) updateData.furnishing = body.furnishing;
      if (body.lat !== undefined) updateData.lat = Number(body.lat);
      if (body.lng !== undefined) updateData.lng = Number(body.lng);
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

// POST /api/inspections/:id/publish - Strict Admin-only endpoint to approve inspection & publish property
router.post("/:id/publish", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = req.body;

    const inspection = await db.query.inspections.findFirst({
      where: eq(inspections.id, id),
    });

    if (!inspection) {
      return res.status(404).json({ error: "Inspection not found" });
    }

    const now = new Date();

    // 1. Determine images to persist
    const imagesToPersist: string[] =
      body.finalImages && body.finalImages.length > 0
        ? body.finalImages
        : inspection.finalImages && inspection.finalImages.length > 0
        ? (inspection.finalImages as string[])
        : (inspection.initialPhotos as string[]) || [];

    // 2. Create Apartment record in PostgreSQL
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

    // 3. Persist Apartment Photos in apartment_photos table
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

    // 4. Update Inspection Status to Approved
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
