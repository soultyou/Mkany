import React, { useState } from "react";
import { 
  GraduationCap, 
  CreditCard, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Home, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  MessageCircle, 
  User, 
  Building2, 
  AlertCircle, 
  Eye, 
  Sparkles, 
  ArrowLeft,
  X,
  ChevronRight,
  BookOpen,
  Image as ImageIcon
} from "lucide-react";
import { useAuth, EGYPTIAN_UNIVERSITIES } from "@/components/auth/clerk-auth";
import { getStudentBookings, StudentBooking, buildWhatsAppBookingUrl } from "@/lib/bookings-store";
import { StandardModal } from "@/components/ui/StandardModal";

interface StudentDashboardProps {
  openToast: (msg: string) => void;
  onExploreProperties: () => void;
  onViewPropertyModal?: (property: any) => void;
  onGoToOwnerDashboard?: () => void;
}

export function StudentDashboard({ openToast, onExploreProperties, onViewPropertyModal, onGoToOwnerDashboard }: StudentDashboardProps) {
  const { user, isSignedIn, openSignIn, updateUserProfile, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"bookings" | "profile">("bookings");
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  // حقول الملف الشخصي القابلة للتعديل
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [university, setUniversity] = useState(user?.university || EGYPTIAN_UNIVERSITIES[0]);
  const [faculty, setFaculty] = useState("كلية الهندسة / الحاسبات");
  const [academicYear, setAcademicYear] = useState("الفرقة الثالثة");
  const [isSaved, setIsSaved] = useState(false);

  // 1. حماية البوابة: إذا كان المستخدم غير مسجل دخول
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="student-gate-not-signed-in">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <GraduationCap size={36} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            بوابة الطلاب المعتمدين 🎓
          </span>

          <h2 className="text-2xl font-extrabold text-foreground">تسجيل الدخول لمتابعة حجوزاتك</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            يرجى تسجيل الدخول أو إنشاء حساب طالب لمشاهدة إيصالات الدفع المرفوعة، ومتابعة حالة السكن، وإدارة بياناتك الجامعية الموثقة.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={openSignIn}
              className="rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
            >
              تسجيل الدخول كطالب 🎓
            </button>
            <button
              onClick={onExploreProperties}
              className="rounded-xl border border-border bg-background px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              تصفح الوحدات المتاحة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. التحقق من العزل الصارم بين الأدوار: إذا كان المستخدم مسجل كمالك عقار
  if (user?.role === "owner") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="owner-in-student-barrier">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Building2 size={36} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground mb-3">
            حساب مالك عقار نشط 🏢
          </span>

          <h2 className="text-2xl font-extrabold text-foreground">أنت مسجل حالياً كـ "مالك عقار" ({user.fullName})</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            لوحة حجوزات الطلاب مخصصة للطلاب الجامعيين. حرصاً على عزل الحسابات والبيانات، يمكنك الانتقال إلى لوحة تحكم المالك أو التبديل إلى حساب طالب للبحث عن سكن وحجزه.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {onGoToOwnerDashboard && (
              <button
                onClick={onGoToOwnerDashboard}
                className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
              >
                الذهاب إلى لوحة تحكم المالك 🏢
              </button>
            )}

            <button
              onClick={() => {
                switchRole("student");
                openToast(`تم التبديل بنجاح إلى حساب الطالب 🎓`);
              }}
              className="rounded-xl border border-primary/30 bg-primary/5 px-6 py-3.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              التبديل إلى حساب طالب 🎓 (Airbnb Mode)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. جلب حجوزات هذا الطالب حصرياً (Strict Student Isolation)
  const studentIdentifier = user ? (user.id || user.email) : "";
  const bookings: StudentBooking[] = studentIdentifier ? getStudentBookings(studentIdentifier) : [];

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nationalId && nationalId.length !== 14) {
      openToast("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
      return;
    }
    updateUserProfile({
      fullName,
      nationalId,
      phoneNumber,
      university,
    });
    setIsSaved(true);
    openToast("تم حفظ وتحديث ملف الطالب بنجاح");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getStatusBadge = (status: StudentBooking["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={13} />
            تم تأكيد الحجز واعتماد الإيصال
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle size={13} />
            إيصال غير مكتمل / مرفوض
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Clock size={13} />
            قيد مراجعة الإيصال
          </span>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-right" data-testid="student-dashboard">
      {/* رأس الداشبورد والترحيب بالطالب */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary text-xl font-black">
              {user?.fullName?.split(" ")[0]?.[0] || "ط"}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold sm:text-3xl text-foreground">
                  مرحباً، {user?.fullName || "طالب مكاني"}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={14} />
                  طالب جامعي موثّق
                </span>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap size={15} className="text-primary" />
                  {user?.university || "جامعة كفر الشيخ"}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <CreditCard size={14} className="text-primary" />
                  الرقم القومي: {user?.nationalId || "30208151234567"}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onExploreProperties}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-xs font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
            data-testid="student-btn-browse-housing"
          >
            <Home size={16} />
            استكشاف سكن جديد
          </button>
        </div>

        {/* بريف مكاني التعريفي */}
        <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs sm:text-sm leading-6 text-foreground/90">
          <strong className="text-primary font-bold block mb-1">نبذة عن منصة مكاني:</strong>
          مكاني هي المنصة الذكية الأولى المتخصصة في تأمين وسكن الطلاب بجامعات مصر، تقدم وحدات موثقة، مطابقة ذكية، وعقود إلكترونية آمنة تضمن حقوق الطرفين.
        </div>
      </div>

      {/* شريط التبويبات للداشبورد */}
      <div className="mb-6 flex border-b border-border text-sm font-bold">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "bookings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-bookings"
        >
          <Calendar size={18} />
          تفاصيل وحالة حجز السكن ({bookings.length})
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 transition-colors ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-student-profile"
        >
          <User size={18} />
          إدارة الملف الشخصي والتوثيق
        </button>
      </div>

      {/* محتوى تبويب الحجوزات */}
      {activeTab === "bookings" && (
        <div className="space-y-6" data-testid="section-student-bookings">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground">سجل حجوزاتك السكنية</h2>
              <p className="text-xs text-muted-foreground">
                تتبع حالة مراجعة الإيصال وتأكيد السكن والتواصل المباشر مع إدارة مكاني
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">
              واتساب المراجعة: <span className="font-mono text-primary font-bold">01055332242</span>
            </span>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <Home size={38} className="mx-auto mb-3 text-muted-foreground/60" />
              <h3 className="text-lg font-bold text-foreground">لا توجد حجوزات نشطة حالياً</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                اختر غرفتك أو شقتك الطلابية الآن، وقم برفع إيصال الدفع اليدوي لتأكيد الحجز فوراً عبر الواتساب.
              </p>
              <button
                onClick={onExploreProperties}
                className="mt-5 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
              >
                تصفح الوحدات المتاحة
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
                  data-testid={`booking-card-${booking.id}`}
                >
                  <div className="grid md:grid-cols-[220px_1fr] gap-6 p-6">
                    <div className="relative h-44 md:h-auto overflow-hidden rounded-2xl border border-border">
                      <img
                        src={booking.propertyImage}
                        alt={booking.propertyTitle}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-2 right-2 rounded-lg bg-background/90 px-2 py-1 text-[10px] font-bold text-foreground">
                        {booking.propertyUniversity}
                      </span>
                    </div>

                    <div className="flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                            {booking.bookingCode}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>

                        <h3 className="text-lg font-bold text-foreground">{booking.propertyTitle}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{booking.propertyAddress}</p>

                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">قيمة الإيجار</span>
                            <strong className="text-foreground text-sm font-bold">
                              {booking.propertyPrice} <small className="text-[10px]">جنيه / شهر</small>
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">طريقة التحويل</span>
                            <strong className="text-foreground text-xs font-semibold">
                              {booking.paymentMethod === "vodafone_cash" ? "فودافون كاش" : booking.paymentMethod === "instapay" ? "إنستاباي" : "تحويل بنكي"}
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">المحول منه</span>
                            <strong className="text-foreground font-mono text-xs">
                              {booking.senderPhone || booking.studentPhone}
                            </strong>
                          </div>
                          <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                            <span className="text-[10px] text-muted-foreground block">تاريخ الحجز</span>
                            <strong className="text-foreground text-xs">
                              {new Date(booking.createdAt).toLocaleDateString("ar-EG")}
                            </strong>
                          </div>
                        </div>

                        {booking.adminNotes && (
                          <div className="mt-3 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                            <strong>ملاحظة الإدارة: </strong> {booking.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* أزرار الإجراءات على الحجز */}
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                        {booking.receiptImageUrl && (
                          <button
                            onClick={() => setSelectedReceipt(booking.receiptImageUrl)}
                            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                            data-testid={`btn-view-receipt-${booking.id}`}
                          >
                            <ImageIcon size={14} className="text-primary" />
                            معاينة إيصال الدفع
                          </button>
                        )}

                        <a
                          href={buildWhatsAppBookingUrl(booking)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                          data-testid={`btn-whatsapp-booking-${booking.id}`}
                        >
                          <MessageCircle size={14} />
                          تواصل مع إدارة مكاني على واتساب (01055332242)
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* محتوى تبويب إدارة الملف الشخصي */}
      {activeTab === "profile" && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]" data-testid="section-student-profile">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">بيانات الطالب الجامعي</h2>
                <p className="text-xs text-muted-foreground">
                  البيانات المطلوبة لتوثيق عقود السكن وضمان الحقوق القانونية
                </p>
              </div>
              <span className="rounded-full bg-primary/10 p-2.5 text-primary">
                <User size={20} />
              </span>
            </div>

            {isSaved && (
              <div className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-500/15 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={16} />
                تم حفظ التعديلات بنجاح ومزامنتها في جدول users!
              </div>
            )}

            <form onSubmit={handleProfileSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">
                  الاسم الرباعي الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  data-testid="input-profile-name"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">
                  الرقم القومي (14 رقماً) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  required
                  pattern="^\d{14}$"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="30208151234567"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm tracking-wider text-foreground outline-none focus:border-primary"
                  data-testid="input-profile-national-id"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  مطابق لبطاقة الرقم القومي لتوثيق العقد الإلكتروني وحفظ حقوقك
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">
                    رقم التليفون / واتساب <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm text-foreground outline-none focus:border-primary"
                    data-testid="input-profile-phone"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">
                    الجامعة المقيد بها <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                    data-testid="select-profile-university"
                  >
                    {EGYPTIAN_UNIVERSITIES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block font-bold text-foreground mb-1">الكلية / التخصص</label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    placeholder="مثال: كلية الطب البشري"
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold text-foreground mb-1">الفرقة الدراسية</label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none focus:border-primary"
                  >
                    <option>الفرقة الأولى</option>
                    <option>الفرقة الثانية</option>
                    <option>الفرقة الثالثة</option>
                    <option>الفرقة الرابعة</option>
                    <option>الفرقة الخامسة / السادسة</option>
                    <option>سنة الامتياز</option>
                    <option>دراسات عليا / ماجستير</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || "student@kfs.edu.eg"}
                  className="w-full rounded-xl border border-border bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground cursor-not-allowed"
                />
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  البريد الإلكتروني المعتمد لتسجيل الدخول وإشعارات الحجز
                </span>
              </div>

              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
                data-testid="btn-save-profile"
              >
                حفظ ومزامنة بيانات الطالب
              </button>
            </form>
          </div>

          {/* بطاقة وضع التفعيل وحالة التوثيق */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">وضع التفعيل (Verification)</h3>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    حساب طالب مفعل وموثق بنجاح ✓
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-6">
                توثيق حسابك الجامعي يمنحك الأولوية في حجز الشقق المميزة، والاستفادة من ضمان عقود مكاني الموثقة بدون أي عمولة سماسرة.
              </p>

              <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الرقم القومي (١٤ رقماً):</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    تم التحقق
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">القيد بالجامعة المصرية:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    معتمد
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">رقم الهاتف وواتساب:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    نشط
                  </span>
                </div>
              </div>
            </div>

            {/* بطاقة الدعم السريع عبر واتساب */}
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <MessageCircle size={18} />
                دعم الطلاب والإيصالات
              </div>
              <p className="text-xs text-muted-foreground leading-6">
                إذا قمت بتحويل بنكي أو إنستاباي وتريد الاستفسار عن اعتماد حجزك فوراً، يمكنك مراسلة خدمة عملاء مكاني مباشرة.
              </p>
              <a
                href="https://wa.me/201055332242"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
                data-testid="student-direct-whatsapp"
              >
                تواصل مع الإدارة: 01055332242 💬
              </a>
            </div>
          </div>
        </div>
      )}

      {/* نافذة معاينة صورة الإيصال */}
      <StandardModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        maxWidthClassName="max-w-lg"
        title="صورة إيصال الدفع اليدوي المرفوع"
        testId="student-receipt-modal"
        closeButtonAriaLabel="إغلاق صورة الإيصال"
      >
        <div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
            {selectedReceipt && (
              <img
                src={selectedReceipt}
                alt="إيصال الدفع"
                className="w-full object-contain"
              />
            )}
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
