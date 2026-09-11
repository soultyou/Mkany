import { Router, type Request, type Response } from "express";
import { db, bookings, apartments, pool } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

// Ensure bookings table exists in PostgreSQL at startup
if (pool) {
  pool.query(`
    CREATE TABLE IF NOT EXISTS "bookings" (
      "id" varchar(128) PRIMARY KEY NOT NULL,
      "booking_code" varchar(64) NOT NULL UNIQUE,
      "property_id" integer NOT NULL REFERENCES "apartments"("id") ON DELETE cascade,
      "student_id" varchar(128) NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "payment_method" varchar(50) NOT NULL,
      "payment_amount" integer NOT NULL,
      "receipt_image_url" text,
      "sender_phone" varchar(50),
      "reference_number" varchar(100),
      "status" varchar(50) DEFAULT 'pending_review' NOT NULL,
      "admin_notes" text,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "bookings_student_idx" ON "bookings" ("student_id");
    CREATE INDEX IF NOT EXISTS "bookings_property_idx" ON "bookings" ("property_id");
    CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings" ("status");
    CREATE INDEX IF NOT EXISTS "bookings_code_idx" ON "bookings" ("booking_code");
  `).catch((err: any) => {
    console.warn("[BookingsInit] Table ensure error (ignored if exists):", err?.message);
  });
}

/**
 * POST /api/bookings
 * Create a new booking for the authenticated student.
 * Never accepts studentId from client; uses req.dbUser.id.
 */
router.post("/", requireAuth, requireRole(["student"]), async (req: Request, res: Response) => {
  try {
    const studentId = req.dbUser!.id;
    const { propertyId, paymentMethod, paymentAmount, receiptImageUrl, senderPhone, referenceNumber } = req.body;

    const parsedPropertyId = Number(propertyId);
    if (!parsedPropertyId || isNaN(parsedPropertyId)) {
      res.status(400).json({ error: "Bad Request", message: "Valid propertyId is required" });
      return;
    }

    // Verify property exists
    const property = await db.query.apartments.findFirst({
      where: eq(apartments.id, parsedPropertyId),
    });

    if (!property) {
      res.status(404).json({ error: "Not Found", message: "Property not found" });
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
      paymentMethod: paymentMethod || "vodafone_cash",
      paymentAmount: Number(paymentAmount) || property.pricePerMonth || 500,
      receiptImageUrl: receiptImageUrl || null,
      senderPhone: senderPhone || req.dbUser!.phoneNumber || null,
      referenceNumber: referenceNumber || null,
      status: "pending_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    res.status(201).json(newBooking);
  } catch (error) {
    req.log.error({ error }, "Failed to create booking");
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create booking" });
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
      },
      orderBy: [desc(bookings.createdAt)],
    });

    res.json(studentBookings);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch student bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/bookings/owner-bookings
 * Get bookings for properties owned by the authenticated owner.
 * Admins receive all bookings.
 */
router.get("/owner-bookings", requireAuth, requireRole(["owner", "admin"]), async (req: Request, res: Response) => {
  try {
    if (req.dbUser!.role === "admin") {
      const allBookings = await db.query.bookings.findMany({
        with: { property: true, student: true },
        orderBy: [desc(bookings.createdAt)],
      });
      res.json(allBookings);
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

    res.json(ownerBookings);
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

    res.json(adminBookings);
  } catch (error) {
    req.log.error({ error }, "Failed to fetch admin bookings");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PATCH /api/bookings/:id/status
 * Admin endpoint to update booking status and notes.
 */
router.patch("/:id/status", requireAuth, requireRole(["admin"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

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

    const [updated] = await db.update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    req.log.error({ error }, "Failed to update booking status");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
