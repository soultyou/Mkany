import { pgTable, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./users";
import { apartments } from "./apartments";

/**
 * جدول حجوزات الطلاب (bookings) في مكاني
 */
export const bookings = pgTable("bookings", {
  id: varchar("id", { length: 128 }).primaryKey(),
  bookingCode: varchar("booking_code", { length: 64 }).notNull().unique(),
  propertyId: integer("property_id").notNull().references(() => apartments.id, { onDelete: "cascade" }),
  studentId: varchar("student_id", { length: 128 }).notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  paymentAmount: integer("payment_amount").notNull(),
  receiptImageUrl: text("receipt_image_url"),
  senderPhone: varchar("sender_phone", { length: 50 }),
  referenceNumber: varchar("reference_number", { length: 100 }),
  status: varchar("status", { length: 50 }).default("pending_review").notNull(), // pending_review | confirmed | rejected
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    studentIdx: index("bookings_student_idx").on(table.studentId),
    propertyIdx: index("bookings_property_idx").on(table.propertyId),
    statusIdx: index("bookings_status_idx").on(table.status),
    bookingCodeIdx: index("bookings_code_idx").on(table.bookingCode),
  };
});

export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
