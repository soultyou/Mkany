import { pgTable, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * جدول المستخدمين والطلاب (users) في مكاني
 * يشمل بيانات الطالب الكاملة المطلوبة:
 * - اسم الطالب (fullName)
 * - الرقم القومي (nationalId - 14 رقم)
 * - رقم التليفون (phoneNumber)
 * - البريد الإلكتروني (email)
 * - كلمة المرور / الباسورد (password)
 * - الجامعة (university)
 */
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 128 }),
  fullName: text("full_name").notNull(),
  nationalId: varchar("national_id", { length: 14 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  university: varchar("university", { length: 150 }).notNull(),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 50 }).default("student").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod validation schemas
export const insertUserSchema = createInsertSchema(users, {
  fullName: z.string().min(3, "يجب أن يكون اسم الطالب 3 أحرف على الأقل"),
  nationalId: z.string().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً"),
  phoneNumber: z.string().regex(/^(01[0125]\d{8}|\+201[0125]\d{8})$/, "رقم التليفون يجب أن يكون رقم مصري صالح (مثال: 01012345678)"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف/أرقام على الأقل"),
  university: z.string().min(2, "يرجى اختيار أو كتابة الجامعة"),
});

export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
