import { Router, type Request, type Response } from "express";
import { db, bookings, apartments } from "@workspace/db";
import { eq, inArray, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { ensureSeedApartments } from "../lib/seed-apartments";

const router = Router();

/**
 * Format booking for Student and Admin views (full details including relations)
 */
function formatBooking(b: any) {
  if (!b) return b;
  const images = Array.isArray(b.property?.images) ? b.property.images : [];
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    propertyId: b.propertyId,
    propertyTitle: b.property?.title || "وحدة سكنية",
    propertyAddress: b.property?.address || "",
    propertyImage: images[0] || "/images/placeholder.jpg",
    propertyPrice: b.property?.pricePerMonth || b.paymentAmount,
    propertyUniversity: b.property?.university || "",
    studentId: b.studentId,
    studentName: b.student?.fullName || "",
    studentPhone: b.student?.phoneNumber || b.senderPhone || "",
    studentNationalId: b.student?.nationalId || "",
    studentUniversity: b.student?.university || "",
    studentEmail: b.student?.email || "",
    paymentMethod: b.paymentMethod,
    paymentAmount: b.paymentAmount,
    receiptImageUrl: b.receiptImageUrl,
    senderPhone: b.senderPhone,
    referenceNumber: b.referenceNumber,
    status: b.status,
    adminNotes: b.adminNotes,
    appointmentDate: b.appointmentDate,
    appointmentTime: b.appointmentTime,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    property: b.property,
    student: b.student,
  };
}

/**
 * Format booking for Owner view (sanitized to preserve student privacy and prevent direct contact)
 */
function formatOwnerBooking(b: any) {
  if (!b) return b;
  const images = Array.isArray(b.property?.images) ? b.property.images : [];
  return {
    id: b.id,
    bookingCode: b.bookingCode,
    propertyId: b.propertyId,
    propertyTitle: b.property?.title || "وحدة سكنية",
    propertyAddress: b.property?.address || "",
    propertyImage: images[0] || "/images/placeholder.jpg",
    propertyPrice: b.property?.pricePerMonth || b.paymentAmount,
    propertyUniversity: b.property?.university || "",
    paymentMethod: b.paymentMethod,
    paymentAmount: b.paymentAmount,
    status: b.status,
    adminNotes: b.adminNotes,
    appointmentDate: b.appointmentDate,
    appointmentTime: b.appointmentTime,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    // Sensitive personal data masked for privacy - direct Student <-> Owner communication is forbidden
    receiptImageUrl: null,
    senderPhone: null,
    referenceNumber: null,
    student: {
      fullName: b.student?.fullName || "طالب مكاني",
      university: b.student?.university || "",
    },
    property: b.property,
  };
}

/**
 * POST /api/bookings
 * Create a new booking for the authenticated student.
 * Never accepts studentId, status, or adminNotes from client; uses req.dbUser.id.
 * Derives paymentAmount server-side from property.pricePerMonth.
 * Requires valid receipt and approved + available property.
 */
router.post("/", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const { propertyId, paymentMethod, receiptImageUrl, senderPhone, referenceNumber, appointmentDate, appointmentTime } = req.body;

    const parsedPropertyId = Number(propertyId);
    if (!parsedPropertyId || isNaN(parsedPropertyId) || parsedPropertyId <= 0) {
      res.status(400).json({ error: "Bad Request", message: "معرّف العقار مطلوب وغير صالح" });
      return;
    }

    // Verify property exists
    let property = await db.query.apartments.findFirst({
      where: eq(apartments.id, parsedPropertyId),
    });

    if (!property) {
      await ensureSeedApartments();
      property = await db.query.apartments.findFirst({
        where: eq(apartments.id, parsedPropertyId),
      });
    }

    if (!property) {
      res.status(404).json({ error: "Not Found", message: "الوحدة السكنية غير موجودة" });
      return;
    }

    // Strict approval and availability validation:
    // Only approved ("متاح" or "approved") and available properties can be booked
    const isApproved = property.status === "متاح" || property.status === "approved";
    if (!isApproved) {
      res.status(400).json({ error: "Bad Request", message: "لا يمكن حجز عقار لم يتم اعتماده ونشره من الإدارة بعد" });
      return;
    }

    // Validate receipt screenshot / URL
    if (!receiptImageUrl || typeof receiptImageUrl !== "string" || !receiptImageUrl.trim()) {
      res.status(400).json({ error: "Bad Request", message: "صورة أو رابط إيصال التحويل مطلوب لإتمام طلب الحجز" });
      return;
    }

    // Check for existing pending booking for the same student and property to prevent duplicates
    const existingPending = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.studentId, studentId),
        eq(bookings.propertyId, parsedPropertyId),
        eq(bookings.status, "pending_review")
      ),
    });

    if (existingPending) {
      res.status(409).json({ 
        error: "Conflict", 
        message: "لديك بالفعل طلب حجز قيد المراجعة لهذه الوحدة السكنية." 
      });
      return;
    }

    // Validate payment method
    const validPaymentMethods = ["vodafone_cash", "instapay", "bank_transfer"];
    const finalPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "vodafone_cash";

    // Server determines payment amount from property pricePerMonth to prevent price manipulation
    const finalPaymentAmount = property.pricePerMonth && property.pricePerMonth > 0 ? property.pricePerMonth : 0;
    if (finalPaymentAmount <= 0) {
      res.status(400).json({ error: "Bad Request", message: "قيمة إيجار العقار غير صالحة للحجز" });
      return;
    }

    const newId = `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `MKN-${new Date().getFullYear()}-${randomSuffix}`;

    const [newBooking] = await db.insert(bookings).values({
      id: newId,
      bookingCode,
      propertyId: parsedPropertyId,
      studentId,
      paymentMethod: finalPaymentMethod,
      paymentAmount: finalPaymentAmount,
      receiptImageUrl: receiptImageUrl.trim(),
      senderPhone: typeof senderPhone === "string" && senderPhone.trim() ? senderPhone.trim() : (req.dbUser!.phoneNumber || null),
      referenceNumber: typeof referenceNumber === "string" && referenceNumber.trim() ? referenceNumber.trim() : null,
      appointmentDate: typeof appointmentDate === "string" && appointmentDate.trim() ? appointmentDate.trim() : null,
      appointmentTime: typeof appointmentTime === "string" && appointmentTime.trim() ? appointmentTime.trim() : null,
      status: "pending_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const fullBooking = await db.query.bookings.findFirst({
      where: eq(bookings.id, newBooking.id),
      with: { property: true, student: true },
    });

    res.status(201).json(formatBooking(fullBooking || newBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to create booking");
    res.status(500).json({ error: "Internal Server Error", message: "فشل في تسجيل طلب الحجز" });
  }
});

/**
 * GET /api/bookings/my-bookings
 * Get bookings created by the authenticated student.
 */
router.get("/my-bookings", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const studentBookings = await db.query.bookings.findMany({
      where: eq(bookings.studentId, studentId),
      with: {
        property: true,
        student: true,
      },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(studentBookings.map(formatBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch student bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/owner-bookings
 * Get bookings for properties owned by the authenticated owner.
 * Admins receive all bookings.
 * Owner responses are sanitized to protect student privacy and prevent direct contact.
 */
router.get("/owner-bookings", requireAuth, requireRole(["owner", "admin"]), async (req: Request, res: Response) => {
  try {
    if (req.dbUser!.role === "admin") {
      const allBookings = await db.query.bookings.findMany({
        with: { property: true, student: true },
        orderBy: [desc(bookings.createdAt)],
      });
      res.json(allBookings.map(formatBooking));
      return;
    }

    const ownerApartments = await db.query.apartments.findMany({
      where: eq(apartments.ownerId, req.dbUser!.id),
    });

    const propertyIds = ownerApartments.map((a: any) => a.id);
    if (propertyIds.length === 0) {
      res.json([]);
      return;
    }

    const ownerBookings = await db.query.bookings.findMany({
      where: inArray(bookings.propertyId, propertyIds),
      with: { property: true, student: true },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(ownerBookings.map(formatOwnerBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch owner bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/admin
 * Admin endpoint to list all bookings for review.
 */
router.get("/admin", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  try {
    const adminBookings = await db.query.bookings.findMany({
      with: { property: true, student: true },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(adminBookings.map(formatBooking));
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/:id
 * Retrieve a single booking by ID with strict IDOR protection:
 * - Admin can view any booking.
 * - Student can ONLY view their own booking.
 * - Owner can ONLY view bookings for properties they own (with sanitized student contact info).
 * - Others receive 403 Forbidden.
 */
router.get("/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.dbUser!;

    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { property: true, student: true },
    });

    if (!booking) {
      res.status(404).json({ error: "Not Found", message: "طلب الحجز غير موجود" });
      return;
    }

    // Admin authorization
    if (user.role === "admin") {
      res.json(formatBooking(booking));
      return;
    }

    // Student authorization
    if (user.role === "student") {
      if (booking.studentId !== user.id) {
        res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول إلى هذا الحجز" });
        return;
      }
      res.json(formatBooking(booking));
      return;
    }

    // Owner authorization
    if (user.role === "owner") {
      if (booking.property?.ownerId !== user.id) {
        res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول إلى هذا الحجز" });
        return;
      }
      res.json(formatOwnerBooking(booking));
      return;
    }

    res.status(403).json({ error: "Forbidden", message: "غير مصرح لك بالوصول" });
  } catch (error) {
    req.log.error({ error }, "Failed to fetch booking by id");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Admin endpoint to update booking status and notes.
 * Strictly restricted to admin role.
 */
router.patch("/:id/status", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status, adminNotes, appointmentDate, appointmentTime } = req.body;

    if (!["pending_review", "confirmed", "rejected"].includes(status)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid booking status" });
      return;
    }

    const existing = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
    });

    if (!existing) {
      res.status(404).json({ error: "Not Found", message: "Booking not found" });
      return;
    }

    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (typeof adminNotes === "string") {
      updateData.adminNotes = adminNotes;
    }

    if (typeof appointmentDate === "string") {
      updateData.appointmentDate = appointmentDate.trim() || null;
    }

    if (typeof appointmentTime === "string") {
      updateData.appointmentTime = appointmentTime.trim() || null;
    }

    await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id));

    const updated = await db.query.bookings.findFirst({
      where: eq(bookings.id, id),
      with: { property: true, student: true },
    });

    res.json(formatBooking(updated || existing));
  } catch (error) {
    req.log.error({ error }, "Failed to update booking status");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
