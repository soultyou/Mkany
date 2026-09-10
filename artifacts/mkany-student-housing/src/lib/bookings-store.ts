/**
 * مخزن حجوزات الطلاب وإيصالات الدفع اليدوي (Student Bookings & Receipts Store)
 * يدير دورة حجز السكن الطلابي:
 * 1. حجز الطالب للوحدة ورفع سكرين شات / إيصال الدفع اليدوي (إنستاباي / فودافون كاش)
 * 2. التوجيه الفوري للواتساب المخصص للإدارة: 01055332242
 * 3. حفظ بيانات الحجز في الداشبورد الخاصة بالطالب
 * 4. إمكانية مراجعة الحجز واعتماده في غرفة تحكم الآدمن الشبح
 */

export interface StudentBooking {
  id: string;
  bookingCode: string;
  propertyId: number;
  propertyTitle: string;
  propertyAddress: string;
  propertyImage: string;
  propertyPrice: number;
  propertyUniversity: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentNationalId: string;
  studentUniversity: string;
  studentEmail: string;
  paymentMethod: "vodafone_cash" | "instapay" | "bank_transfer";
  paymentAmount: number;
  receiptImageUrl: string;
  senderPhone?: string;
  referenceNumber?: string;
  status: "pending_review" | "confirmed" | "rejected";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_BOOKINGS_KEY = "mkany_student_bookings_v1";

// عينات أولية للحجوزات لإثراء التجربة فوراً
const INITIAL_BOOKINGS: StudentBooking[] = [
  {
    id: "book_101",
    bookingCode: "MKN-KFS-9482",
    propertyId: 1,
    propertyTitle: "غرفة مضيئة قرب الجلاء",
    propertyAddress: "شارع الجلاء، كفر الشيخ",
    propertyImage: "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
    propertyPrice: 950,
    propertyUniversity: "جامعة كفر الشيخ",
    studentId: "usr_student_01",
    studentName: "أحمد محمد كمال",
    studentPhone: "01098765432",
    studentNationalId: "30208151234567",
    studentUniversity: "جامعة كفر الشيخ",
    studentEmail: "ahmed.kamal@kfs.edu.eg",
    paymentMethod: "vodafone_cash",
    paymentAmount: 950,
    receiptImageUrl: "https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg?auto=compress&cs=tinysrgb&w=800",
    senderPhone: "01098765432",
    referenceNumber: "VF-98432176",
    status: "confirmed",
    adminNotes: "تم التحقق من إيصال فودافون كاش وتأكيد الحجز بنجاح مع مالك العقار.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

export function getAllBookings(): StudentBooking[] {
  if (typeof window === "undefined") return INITIAL_BOOKINGS;
  try {
    const raw = localStorage.getItem(STORAGE_BOOKINGS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_BOOKINGS;
  } catch (e) {
    return INITIAL_BOOKINGS;
  }
}

export function saveBookings(list: StudentBooking[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_BOOKINGS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save bookings to localStorage:", e);
  }
}

export function createBooking(data: Omit<StudentBooking, "id" | "bookingCode" | "status" | "createdAt" | "updatedAt">): StudentBooking {
  const current = getAllBookings();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const now = new Date().toISOString();

  const newBooking: StudentBooking = {
    ...data,
    id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    bookingCode: `MKN-2024-${randomSuffix}`,
    status: "pending_review",
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newBooking, ...current];
  saveBookings(updated);
  return newBooking;
}

export function updateBookingStatus(
  bookingId: string, 
  status: "pending_review" | "confirmed" | "rejected",
  adminNotes?: string
): StudentBooking | null {
  const list = getAllBookings();
  const index = list.findIndex((b) => b.id === bookingId);
  if (index === -1) return null;

  const updated: StudentBooking = {
    ...list[index],
    status,
    adminNotes: adminNotes || list[index].adminNotes,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveBookings(list);
  return updated;
}

export function getStudentBookings(studentIdOrEmail?: string): StudentBooking[] {
  if (!studentIdOrEmail || !studentIdOrEmail.trim()) return [];
  const all = getAllBookings();
  const normalized = studentIdOrEmail.trim().toLowerCase();
  return all.filter((b) => 
    b.studentId === studentIdOrEmail.trim() || 
    (b.studentEmail && b.studentEmail.toLowerCase() === normalized)
  );
}

/**
 * تجهيز رابط الواتساب المباشر للإدارة: 01055332242
 */
export function buildWhatsAppBookingUrl(booking: StudentBooking): string {
  const adminWhatsAppNumber = "201055332242"; // رقم الواتساب المخصص للإدارة
  
  const text = `السلام عليكم ورحمة الله،
لقد قمت بحجز وحدة سكنية عبر منصة مكاني (MKANY Student Housing) ورفعت إيصال الدفع اليدوي:

📋 *بيانات الحجز:*
- كود الحجز: ${booking.bookingCode}
- اسم الطالب: ${booking.studentName}
- الرقم القومي: ${booking.studentNationalId}
- رقم هاتف الطالب: ${booking.studentPhone}
- الجامعة: ${booking.studentUniversity}

🏠 *بيانات السكن:*
- الوحدة: ${booking.propertyTitle}
- العنوان: ${booking.propertyAddress}
- الإيجار: ${booking.propertyPrice} جنيه/شهر
- طريقة التحويل: ${booking.paymentMethod === "vodafone_cash" ? "فودافون كاش" : booking.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}
- رقم المحول منه: ${booking.senderPhone || booking.studentPhone}
- رقم المرجع: ${booking.referenceNumber || "مرفق بالإيصال"}

مرفق سكرين شات الإيصال عبر المنصة. أرجو المراجعة وتأكيد الحجز. شكراً جزيلاً!`;

  return `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent(text)}`;
}
