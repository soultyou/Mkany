/**
 * مخزن حجوزات الطلاب وإيصالات الدفع (Student Bookings & Receipts Store)
 * متصل بقاعدة بيانات PostgreSQL عبر API السيرفر
 */

export interface StudentBooking {
  id: string;
  bookingCode: string;
  propertyId: number;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyImage?: string;
  propertyPrice?: number;
  propertyUniversity?: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  studentNationalId?: string;
  studentUniversity?: string;
  studentEmail?: string;
  paymentMethod: "vodafone_cash" | "instapay" | "bank_transfer";
  paymentAmount: number;
  receiptImageUrl?: string;
  senderPhone?: string;
  referenceNumber?: string;
  status: "pending_review" | "confirmed" | "rejected";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  property?: any;
  student?: any;
}

/**
 * جلب حجوزات الطالب الحالي من قاعدة البيانات
 */
export async function getStudentBookingsApi(): Promise<StudentBooking[]> {
  try {
    const res = await fetch("/api/bookings/my-bookings");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch student bookings:", err);
    return [];
  }
}

/**
 * إنشاء حجز جديد في قاعدة البيانات (PostgreSQL)
 */
export async function createBookingApi(data: {
  propertyId: number;
  paymentMethod: string;
  paymentAmount: number;
  receiptImageUrl?: string;
  senderPhone?: string;
  referenceNumber?: string;
}): Promise<StudentBooking> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "فشل تسجيل الحجز في قاعدة البيانات");
  }

  return await res.json();
}

/**
 * جلب حجوزات المالك للوحدات التي يملكها فقط
 */
export async function getOwnerBookingsApi(): Promise<StudentBooking[]> {
  try {
    const res = await fetch("/api/bookings/owner-bookings");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch owner bookings:", err);
    return [];
  }
}

/**
 * جلب كافة الحجوزات للآدمن
 */
export async function getAdminBookingsApi(): Promise<StudentBooking[]> {
  try {
    const res = await fetch("/api/bookings/admin");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Failed to fetch admin bookings:", err);
    return [];
  }
}

/**
 * تحديث حالة الحجز بواسطة الآدمن
 */
export async function updateBookingStatusApi(
  bookingId: string,
  status: "pending_review" | "confirmed" | "rejected",
  adminNotes?: string
): Promise<StudentBooking | null> {
  try {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNotes }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Failed to update booking status:", err);
    return null;
  }
}

// Fallback synchronous methods kept for backward compatibility where needed
export function getAllBookings(): StudentBooking[] {
  return [];
}

export function getStudentBookings(_studentIdOrEmail?: string): StudentBooking[] {
  return [];
}

export function updateBookingStatus(_bookingId: string, _status: any, _notes?: string): StudentBooking | null {
  return null;
}

export function createBooking(_data: any): StudentBooking {
  throw new Error("Use createBookingApi for PostgreSQL persistence");
}

/**
 * تجهيز رابط الواتساب المباشر للإدارة: 01055332242
 */
export function buildWhatsAppBookingUrl(booking: StudentBooking): string {
  const adminWhatsAppNumber = "201055332242"; // رقم الواتساب المخصص للإدارة
  
  const title = booking.propertyTitle || booking.property?.title || "شقة سكنية طلابية";
  const address = booking.propertyAddress || booking.property?.address || "كفر الشيخ";
  const price = booking.propertyPrice || booking.property?.pricePerMonth || booking.paymentAmount;
  const sName = booking.studentName || booking.student?.fullName || "طالب محجوز";
  const sNationalId = booking.studentNationalId || booking.student?.nationalId || "14 رقم قومي";
  const sPhone = booking.studentPhone || booking.student?.phoneNumber || "";
  const sUni = booking.studentUniversity || booking.student?.university || "";

  const text = `السلام عليكم ورحمة الله،
لقد قمت بحجز وحدة سكنية عبر منصة مكاني (MKANY Student Housing) ورفعت إيصال الدفع اليدوي:

📋 *بيانات الحجز:*
- كود الحجز: ${booking.bookingCode}
- اسم الطالب: ${sName}
- الرقم القومي: ${sNationalId}
- رقم هاتف الطالب: ${sPhone}
- الجامعة: ${sUni}

🏠 *بيانات السكن:*
- الوحدة: ${title}
- العنوان: ${address}
- الإيجار: ${price} جنيه/شهر
- طريقة التحويل: ${booking.paymentMethod === "vodafone_cash" ? "فودافون كاش" : booking.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}
- رقم المحول منه: ${booking.senderPhone || sPhone}
- رقم المرجع: ${booking.referenceNumber || "مرفق بالإيصال"}

مرفق سكرين شات الإيصال عبر المنصة. أرجو المراجعة وتأكيد الحجز. شكراً جزيلاً!`;

  return `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(text)}`;
}
