import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  Camera, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  Sparkles, 
  Eye, 
  Trash2, 
  X, 
  Check, 
  Filter, 
  Search, 
  Send,
  Video,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3,
  Plus,
  Home,
  MessageCircle,
  FileCheck,
  User,
  CreditCard,
  MapPin,
  Users,
  UserCheck,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import { 
  getAllRegisteredUsers, 
  toggleUserVerification, 
  deleteUserFromDb, 
  RegisteredUser, 
  USERS_CHANGE_EVENT 
} from "@/lib/user-db-sync";
import { 
  getAllInspections, 
  scheduleInspectionVisit, 
  markInspectionCompleted, 
  activateAndPublishProperty, 
  rejectInspectionRequest, 
  PropertyInspection,
  PlatformProperty,
  getAllPlatformProperties,
  updatePlatformProperty,
  deletePlatformProperty,
  addNewPlatformProperty,
  getDefaultAmenities,
  getEffectiveAmenities,
  syncInspectionsFromApi,
  syncPlatformPropertiesFromApi,
  NearbyAmenities
} from "@/lib/inspections-store";
import { NearbyAmenitiesForm } from "./NearbyAmenitiesForm";
import { 
  getAllBookings, 
  updateBookingStatus, 
  StudentBooking 
} from "@/lib/bookings-store";
import { useAuth } from "@/components/auth/clerk-auth";
import { StandardModal } from "@/components/ui/StandardModal";

interface AdminInspectionPortalProps {
  onClose: () => void;
  openToast: (msg: string) => void;
  onViewStudentListings: () => void;
}

export function AdminInspectionPortal({
  onClose,
  openToast,
  onViewStudentListings,
}: AdminInspectionPortalProps) {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"inspections" | "properties" | "bookings" | "users">("inspections");

  // بيانات المستخدمين وقاعدة البيانات (طلاب وملاك ومشرفين)
  const [usersList, setUsersList] = useState<RegisteredUser[]>(() => getAllRegisteredUsers());
  const [userFilter, setUserFilter] = useState<"all" | "student" | "owner" | "admin">("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // الاشتراك في أحداث تحديث قاعدة بيانات المستخدمين
  React.useEffect(() => {
    const handleUsersUpdate = () => {
      setUsersList(getAllRegisteredUsers());
    };
    window.addEventListener(USERS_CHANGE_EVENT, handleUsersUpdate);
    return () => window.removeEventListener(USERS_CHANGE_EVENT, handleUsersUpdate);
  }, []);

  // بيانات المعاينات
  const [inspections, setInspections] = useState<PropertyInspection[]>(getAllInspections());
  const [filter, setFilter] = useState<string>("all");
  const [selectedInspection, setSelectedInspection] = useState<PropertyInspection | null>(null);

  // بيانات العقارات المنشورة
  const [properties, setProperties] = useState<PlatformProperty[]>(getAllPlatformProperties());
  const [editingProperty, setEditingProperty] = useState<PlatformProperty | null>(null);
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);

  // بيانات الحجوزات وإيصالات الدفع
  const [bookings, setBookings] = useState<StudentBooking[]>(getAllBookings());
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // حقول جدولة المعاينة
  const [scheduleDate, setScheduleDate] = useState("غداً، الساعة ١٢:٠٠ ظهراً");
  const [inspectorName, setInspectorName] = useState("م. طارق سالم (فريق المعاينة)");

  // حقول تفعيل العقار بعد المعاينة الفعلية
  const [livabilityScore, setLivabilityScore] = useState<number>(93);
  const [video360Url, setVideo360Url] = useState<string>("https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4");
  const [inspectorReport, setInspectorReport] = useState<string>(
    "تمت المعاينة الميدانية الفعلية على الطبيعة. العقار نظيف، الإضاءة والتهوية ممتازة، الكهرباء والماء مستقران، وننصح باعتماده كسكن طلابي موثق."
  );

  // سبب الرفض
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionModal, setActionModal] = useState<"schedule" | "activate" | "reject" | null>(null);

  // إدارة تفاصيل المنطقة المحيطة للعقار الجديد
  const [newAmenities, setNewAmenities] = useState<NearbyAmenities>(() =>
    getDefaultAmenities("كفر الشيخ", "جامعة كفر الشيخ")
  );

  // تحديث القوائم
  const refreshAll = () => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
    setInspections(getAllInspections());
    setProperties(getAllPlatformProperties());
    setBookings(getAllBookings());
  };

  React.useEffect(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
  }, []);

  const filteredInspections = inspections.filter((i) => {
    if (filter === "all") return true;
    return i.status === filter;
  });

  // تنفيذ جدولة المعاينة
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    const res = scheduleInspectionVisit(selectedInspection.id, scheduleDate, inspectorName);
    if (res) {
      openToast(`تم تحديد موعد المعاينة الميدانية: ${scheduleDate}`);
      refreshAll();
      setActionModal(null);
    }
  };

  // تنفيذ تفعيل العقار ونشره بعد نزول المعاينة الفعلية وتصوير 360°
  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    const res = activateAndPublishProperty(selectedInspection.id, {
      livabilityScore,
      video360Url,
      inspectorReport,
    });

    if (res) {
      openToast(`🎉 تم تفعيل ونشر "${selectedInspection.title}" رسمياً للطلاب مع صور وجولة 360°!`);
      refreshAll();
      setActionModal(null);
    }
  };

  // تنفيذ الرفض
  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInspection) return;

    const res = rejectInspectionRequest(selectedInspection.id, rejectionReason || "لم يستوفِ معايير السكن الطلابي المعتمد");
    if (res) {
      openToast("تم تسجيل رفض الطلب وإبلاغ المالك بالسبب");
      refreshAll();
      setActionModal(null);
    }
  };

  // تعديل بيانات عقار منشور
  const handleSavePropertyEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    updatePlatformProperty(editingProperty.id, editingProperty);
    openToast(`تم تحديث بيانات العقار (#${editingProperty.id}) وستظهر فوراً أمام الطلاب!`);
    refreshAll();
    setEditingProperty(null);
  };

  // حذف عقار من الكتالوج
  const handleDeleteProperty = (id: number, title: string) => {
    if (confirm(`هل أنت متأكد من حذف عقار "${title}" من الكتالوج المتاح للطلاب؟`)) {
      deletePlatformProperty(id);
      openToast(`تم حذف العقار من الكتالوج العام`);
      refreshAll();
    }
  };

  // تغيير حالة حجز الطالب
  const handleChangeBookingStatus = (
    bookingId: string, 
    newStatus: "confirmed" | "rejected" | "pending_review",
    notes?: string
  ) => {
    updateBookingStatus(bookingId, newStatus, notes);
    openToast(newStatus === "confirmed" ? "تم تأكيد الحجز واعتماد الإيصال بنجاح ✓" : "تم تحديث حالة الحجز");
    refreshAll();
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="stealth-admin-portal">
      {/* شريط الإدارة العلوي السري */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/15 text-purple-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-foreground">
                  غرفة التحكم المركزية الشبح (Stealth Admin)
                </span>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600">
                  لوحة إدارة مخفية بالكامل
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                المعاينة الميدانية وتصوير 360° • تحديث ونشر العقارات للطلاب • مراجعة إيصالات الدفع اليدوي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                onClose();
                onViewStudentListings();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
              data-testid="admin-btn-preview-catalog"
            >
              <ExternalLink size={14} />
              معاينة واجهة الطلاب
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
              data-testid="admin-btn-exit"
            >
              <X size={15} />
              خروج من اللوحة
            </button>
          </div>
        </div>
      </header>

      {/* شريط التبويبات الثلاثة الرئيسية للآدمن */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl px-4 text-xs font-bold sm:px-6 lg:px-8">
          <button
            onClick={() => setMainTab("inspections")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 transition-colors ${
              mainTab === "inspections"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-inspections"
          >
            <Camera size={16} />
            طلبات المعاينة وتصوير 360° ({inspections.filter((i) => i.status === "pending").length} بانتظار الفحص)
          </button>

          <button
            onClick={() => setMainTab("properties")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 transition-colors ${
              mainTab === "properties"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-properties"
          >
            <Home size={16} />
            إدارة وتحديث العقارات المنشورة للطلاب ({properties.length})
          </button>

          <button
            onClick={() => setMainTab("bookings")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 transition-colors ${
              mainTab === "bookings"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-bookings"
          >
            <CreditCard size={16} />
            حجوزات الطلاب ومراجعة الإيصالات ({bookings.length})
          </button>

          <button
            onClick={() => setMainTab("users")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3.5 transition-colors ${
              mainTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-admin-users"
          >
            <Users size={16} />
            قاعدة بيانات المستخدمين والتوثيق ({usersList.length} مستخدم: طلاب وملاك)
          </button>
        </div>
      </div>

      {/* مساحة العمل */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 text-right">
        
        {/* التبويب 1: طلبات المعاينة وتصوير 360° */}
        {mainTab === "inspections" && (
          <div className="space-y-6" data-testid="section-admin-inspections">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">طلبات المعاينة الميدانية من الملاك</h2>
                <p className="text-xs text-muted-foreground">
                  جدولة زيارات مهندسي الفحص، تصوير الجولات الافتراضية 360°، واعتماد نشر العقار للطلاب
                </p>
              </div>

              <div className="flex items-center gap-2">
                {["all", "pending", "scheduled", "inspected", "approved", "rejected"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" && "الكل"}
                    {f === "pending" && "جديدة"}
                    {f === "scheduled" && "مجدولة"}
                    {f === "inspected" && "تم الفحص"}
                    {f === "approved" && "معتمدة ونُشرت"}
                    {f === "rejected" && "مرفوضة"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {filteredInspections.map((insp) => (
                <div
                  key={insp.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-24 overflow-hidden rounded-xl border border-border">
                        <img
                          src={insp.initialPhotos?.[0] || insp.finalImages?.[0] || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg"}
                          alt={insp.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-primary">#{insp.id}</span>
                          <h3 className="font-bold text-foreground text-base">{insp.title}</h3>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {insp.status === "pending" ? "بانتظار الجدولة" : insp.status === "scheduled" ? "تمت الجدولة" : insp.status === "approved" ? "منشور للطلاب" : "مرفوض"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{insp.address} • المالك: {insp.ownerName} ({insp.ownerPhone})</p>
                        <p className="text-xs text-primary font-bold mt-1">المطلوب: {insp.pricePerMonth} جنيه/شهر • {insp.bedrooms} غرف</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {insp.status === "pending" && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActionModal("schedule");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow"
                        >
                          <Calendar size={14} />
                          جدولة زيارة المعاينة
                        </button>
                      )}

                      {(insp.status === "scheduled" || insp.status === "inspected") && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActionModal("activate");
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                        >
                          <Video size={14} />
                          رفع 360° وتفعيل النشر للطلاب
                        </button>
                      )}

                      {insp.status === "approved" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                          <CheckCircle2 size={15} />
                          العقار منشور ويظهر للطلاب الآن
                        </span>
                      )}

                      {insp.status !== "rejected" && insp.status !== "approved" && (
                        <button
                          onClick={() => {
                            setSelectedInspection(insp);
                            setActionModal("reject");
                          }}
                          className="rounded-xl border border-destructive/30 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                        >
                          رفض
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 2: إدارة وتحديث العقارات المنشورة للطلاب */}
        {mainTab === "properties" && (
          <div className="space-y-6" data-testid="section-admin-properties">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">الكتالوج الفعلي المنشور للطلاب</h2>
                <p className="text-xs text-muted-foreground">
                  تعديل الأسعار، العنوان، إضافة روابط الجولة 360°، أو إضافة وحذف أي وحدة لتسمع فوراً في واجهة الطلاب
                </p>
              </div>

              <button
                onClick={() => setIsNewPropertyModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow hover:-translate-y-0.5"
                data-testid="btn-admin-add-property"
              >
                <Plus size={16} />
                إضافة وحدة جديدة مباشرة للكتالوج
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm"
                  data-testid={`admin-property-card-${prop.id}`}
                >
                  <div className="relative h-40 overflow-hidden rounded-xl border border-border mb-3">
                    <img
                      src={prop.images[0]}
                      alt={prop.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-bold text-primary">
                        ID: {prop.id}
                      </span>
                      {prop.video360Url && (
                        <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          360° نشط
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-foreground text-sm line-clamp-1">{prop.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{prop.address}</p>

                  {/* ملخص تفاصيل المنطقة المحيطة الحية */}
                  <div className="mt-2.5 rounded-xl border border-border/80 bg-muted/50 p-2.5 text-[11px]">
                    <div className="flex items-center justify-between font-bold text-foreground mb-1">
                      <span className="flex items-center gap-1 text-primary">
                        <MapPin size={12} />
                        كل ما تحتاجه حولك:
                      </span>
                      <span className="text-[10px] text-purple-600 font-semibold bg-purple-500/10 px-1.5 py-0.5 rounded">
                        بوابة الجامعة: {prop.nearbyAmenities?.universityGate?.distance || "٨٠٠م"} ({prop.nearbyAmenities?.universityGate?.time || "١٠ د"})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                      <span>مواصلات: <strong className="text-foreground">{prop.nearbyAmenities?.transportation?.distance || "٢٠٠م"}</strong></span>
                      <span>•</span>
                      <span>مستشفى: <strong className="text-foreground">{prop.nearbyAmenities?.hospital?.distance || "٥٠٠م"}</strong></span>
                      <span>•</span>
                      <span>صيدلية: <strong className="text-foreground">{prop.nearbyAmenities?.pharmacy?.distance || "١٥٠م"}</strong></span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="font-bold text-primary">{prop.pricePerMonth} جنيه/شهر</span>
                    <span className="text-muted-foreground">{prop.university}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <button
                      onClick={() => setEditingProperty(prop)}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                      data-testid={`btn-edit-prop-${prop.id}`}
                    >
                      <Edit3 size={13} className="text-primary" />
                      تعديل وتحديث
                    </button>
                    <button
                      onClick={() => handleDeleteProperty(prop.id, prop.title)}
                      className="flex items-center gap-1 rounded-lg border border-destructive/20 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      data-testid={`btn-delete-prop-${prop.id}`}
                    >
                      <Trash2 size={13} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 3: حجوزات الطلاب ومراجعة الإيصالات */}
        {mainTab === "bookings" && (
          <div className="space-y-6" data-testid="section-admin-bookings">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">حجوزات الطلاب وسكرين شات إيصالات الدفع</h2>
                <p className="text-xs text-muted-foreground">
                  مراجعة سكرين شات التحويل اليدوي (فودافون كاش / إنستاباي)، تأكيد الحجز للطالب، أو التواصل عبر واتساب الإدارة (01055332242)
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                  data-testid={`admin-booking-row-${b.id}`}
                >
                  <div className="grid lg:grid-cols-[1.2fr_1fr_auto] gap-4 items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {b.bookingCode}
                        </span>
                        <h3 className="font-bold text-foreground text-sm">{b.studentName}</h3>
                        <span className="text-xs text-muted-foreground">({b.studentUniversity})</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        الوحدة المحجوزة: <strong className="text-foreground">{b.propertyTitle}</strong> ({b.propertyAddress})
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>الرقم القومي: <strong className="font-mono text-foreground">{b.studentNationalId}</strong></span>
                        <span>•</span>
                        <span>هاتف الطالب: <strong className="font-mono text-foreground">{b.studentPhone}</strong></span>
                        <span>•</span>
                        <span>المبلغ: <strong className="text-primary font-bold">{b.paymentAmount} جنيه</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {b.receiptImageUrl && (
                        <div
                          onClick={() => setSelectedReceiptUrl(b.receiptImageUrl)}
                          className="cursor-pointer group relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-border"
                        >
                          <img
                            src={b.receiptImageUrl}
                            alt="إيصال"
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={16} className="text-white" />
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold block">
                          طريقة الدفع: {b.paymentMethod === "vodafone_cash" ? "فودافون كاش" : "إنستاباي"}
                        </span>
                        <span className="text-[11px] text-muted-foreground block font-mono">
                          مرجع: {b.referenceNumber || b.senderPhone}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          تاريخ: {new Date(b.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleChangeBookingStatus(b.id, "confirmed", "تمت مراجعة الإيصال وتأكيده مع الإدارة.")}
                        className={`rounded-xl px-3 py-2 text-xs font-bold ${
                          b.status === "confirmed"
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow"
                        }`}
                      >
                        {b.status === "confirmed" ? "✓ تم التأكيد" : "تأكيد الحجز"}
                      </button>

                      {b.status !== "rejected" && (
                        <button
                          onClick={() => handleChangeBookingStatus(b.id, "rejected", "الإيصال غير واضح أو المبلغ غير مطابق")}
                          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"
                        >
                          رفض
                        </button>
                      )}

                      <a
                        href={`https://wa.me/20${b.studentPhone.replace(/^0/, "")}?text=${encodeURIComponent(`مرحباً ${b.studentName}، بخصوص حجزك (${b.bookingCode}) عبر منصة مكاني للسكن الطلابي...`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                        title="مراسلة الطالب على واتساب"
                      >
                        <MessageCircle size={14} />
                        واتساب
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* التبويب 4: قاعدة بيانات المستخدمين والتوثيق (طلاب وملاك) */}
        {mainTab === "users" && (
          <div className="space-y-6" data-testid="section-admin-users">
            {/* الترويسة والتحكم */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-foreground">
                    إدارة حسابات المنصة وقاعدة البيانات
                  </h2>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    جدول users • تزامن حي
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  مراجعة حسابات الطلاب الجامعيين وملاك العقارات المسجلين، التحقق من الرقم القومي (14 رقماً)، وإدارة الاعتماد
                </p>
              </div>

              {/* البحث والفلاتر */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="بحث بالاسم، الرقم القومي، الهاتف، أو المدينة..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-64 rounded-xl border border-border bg-card py-2 pl-3 pr-8 text-xs outline-none focus:border-primary"
                    data-testid="input-search-users"
                  />
                  <Search size={14} className="absolute right-2.5 top-2.5 text-muted-foreground" />
                </div>

                <div className="flex items-center rounded-xl border border-border bg-card p-1 text-xs font-semibold">
                  <button
                    onClick={() => setUserFilter("all")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    الكل ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserFilter("student")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "student" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🎓 الطلاب ({usersList.filter((u) => u.role === "student").length})
                  </button>
                  <button
                    onClick={() => setUserFilter("owner")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "owner" ? "bg-emerald-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🏢 الملاك ({usersList.filter((u) => u.role === "owner").length})
                  </button>
                  <button
                    onClick={() => setUserFilter("admin")}
                    className={`rounded-lg px-2.5 py-1 transition-colors ${
                      userFilter === "admin" ? "bg-amber-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🛡️ المشرفين ({usersList.filter((u) => u.role === "admin").length})
                  </button>
                </div>
              </div>
            </div>

            {/* بطاقات الإحصائيات السريعة */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>إجمالي الحسابات المسجلة</span>
                  <Users size={16} className="text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">{usersList.length}</div>
                <div className="text-[11px] text-emerald-500 font-medium mt-0.5">
                  جميع الحسابات محفوظة في قاعدة البيانات
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>الطلاب الجامعيين</span>
                  <GraduationCap size={16} className="text-primary" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {usersList.filter((u) => u.role === "student").length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  يبحثون عن سكن موثق بجوار الجامعات
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>ملاك العقارات والوحدات</span>
                  <Building2 size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-foreground">
                  {usersList.filter((u) => u.role === "owner").length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  عقارات بانتظار الفحص والتصوير 360°
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground mb-1 text-xs font-bold">
                  <span>حالة التوثيق القومي</span>
                  <ShieldCheck size={16} className="text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {usersList.filter((u) => u.isVerified).length} / {usersList.length}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  تم التحقق من بطاقة الرقم القومي المصرية
                </div>
              </div>
            </div>

            {/* قائمة المستخدمين التفصيلية */}
            <div className="grid gap-3.5">
              {usersList
                .filter((u) => {
                  if (userFilter !== "all" && u.role !== userFilter) return false;
                  if (!userSearchQuery.trim()) return true;
                  const q = userSearchQuery.toLowerCase();
                  return (
                    u.fullName.toLowerCase().includes(q) ||
                    u.nationalId.includes(q) ||
                    u.phoneNumber.includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    (u.university && u.university.toLowerCase().includes(q)) ||
                    (u.city && u.city.toLowerCase().includes(q))
                  );
                })
                .map((userItem) => (
                  <div
                    key={userItem.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all hover:border-primary/40 lg:flex-row lg:items-center lg:justify-between"
                    data-testid={`user-row-${userItem.id}`}
                  >
                    {/* معلومات المستخدم الأساسية */}
                    <div className="flex items-start gap-3.5">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-black ${
                        userItem.role === "owner"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : userItem.role === "admin"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : "bg-primary/15 text-primary"
                      }`}>
                        {userItem.role === "owner" ? (
                          <Building2 size={24} />
                        ) : userItem.role === "admin" ? (
                          <ShieldCheck size={24} />
                        ) : (
                          <GraduationCap size={24} />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-extrabold text-foreground">
                            {userItem.fullName}
                          </h3>
                          
                          {/* شارة الدور */}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            userItem.role === "owner"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : userItem.role === "admin"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-primary/15 text-primary border border-primary/20"
                          }`}>
                            {userItem.role === "owner" && "🏢 مالك عقار"}
                            {userItem.role === "student" && "🎓 طالب جامعي"}
                            {userItem.role === "admin" && "🛡️ مشرف النظام"}
                          </span>

                          {/* حالة التوثيق */}
                          {userItem.isVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 size={11} /> موثق بالرقم القومي
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                              <AlertCircle size={11} /> قيد المراجعة
                            </span>
                          )}
                        </div>

                        {/* التفاصيل الإضافية */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <CreditCard size={13} className="text-primary" />
                            الرقم القومي: <strong className="text-foreground tracking-wider">{userItem.nationalId}</strong>
                          </span>

                          <span className="flex items-center gap-1">
                            <Mail size={13} className="text-muted-foreground" />
                            {userItem.email}
                          </span>

                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={13} className="text-muted-foreground" />
                            {userItem.phoneNumber}
                          </span>

                          {userItem.role === "student" && userItem.university && (
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <GraduationCap size={13} />
                              {userItem.university}
                            </span>
                          )}

                          {userItem.role === "owner" && (
                            <>
                              {userItem.city && (
                                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  <MapPin size={13} />
                                  عقارات {userItem.city}
                                </span>
                              )}
                              {userItem.unitsCount && (
                                <span className="flex items-center gap-1 text-muted-foreground font-medium">
                                  <Building2 size={13} />
                                  {userItem.unitsCount}
                                </span>
                              )}
                              {userItem.propertyTypes && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {userItem.propertyTypes}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                      <a
                        href={`https://wa.me/20${userItem.phoneNumber.replace(/^0/, "")}?text=${encodeURIComponent(
                          `مرحباً ${userItem.fullName}، معك إدارة منصة مكاني للسكن الطلابي (MKANY)...`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                        title="مراسلة واتساب"
                      >
                        <MessageCircle size={14} />
                        <span>واتساب</span>
                      </a>

                      <button
                        onClick={() => {
                          const updated = toggleUserVerification(userItem.id);
                          if (updated) {
                            openToast(
                              updated.isVerified
                                ? `تم توثيق واعتماد حساب "${userItem.fullName}" بنجاح!`
                                : `تم إلغاء توثيق حساب "${userItem.fullName}".`
                            );
                          }
                        }}
                        className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          userItem.isVerified
                            ? "border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                        }`}
                      >
                        <ShieldCheck size={14} />
                        <span>{userItem.isVerified ? "إلغاء التوثيق" : "توثيق الحساب"}</span>
                      </button>

                      {userItem.role !== "admin" && (
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من رغبتك في حذف حساب "${userItem.fullName}" نهائياً من قاعدة البيانات؟`)) {
                              deleteUserFromDb(userItem.id);
                              openToast(`تم حذف الحساب نهائياً من قاعدة البيانات`);
                            }
                          }}
                          className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-500/20 transition-colors"
                          title="حذف المستخدم نهائياً"
                        >
                          <Trash2 size={14} />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {usersList.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                  لا توجد حسابات مسجلة حالياً في قاعدة البيانات.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal: تعديل بيانات عقار منشور */}
      <StandardModal
        isOpen={Boolean(editingProperty)}
        onClose={() => setEditingProperty(null)}
        maxWidthClassName="max-w-xl"
        title={`تعديل بيانات العقار (${editingProperty ? `#${editingProperty.id}` : ""})`}
        subtitle="التعديلات تظهر فوراً للطلاب في الواجهة الرئيسية للمنصة"
        testId="admin-modal-edit-property"
        closeButtonAriaLabel="إغلاق نافذة تعديل العقار"
      >
        {editingProperty ? (
          <div>
            <form onSubmit={handleSavePropertyEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-foreground mb-1">عنوان الوحدة (Title):</label>
                <input
                  type="text"
                  required
                  value={editingProperty.title}
                  onChange={(e) => setEditingProperty({ ...editingProperty, title: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الإيجار الشهري (جنيه):</label>
                  <input
                    type="number"
                    required
                    value={editingProperty.pricePerMonth}
                    onChange={(e) => setEditingProperty({ ...editingProperty, pricePerMonth: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">الجامعة القريبة:</label>
                  <input
                    type="text"
                    required
                    value={editingProperty.university}
                    onChange={(e) => setEditingProperty({ ...editingProperty, university: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">العنوان التفصيلي:</label>
                <input
                  type="text"
                  required
                  value={editingProperty.address}
                  onChange={(e) => setEditingProperty({ ...editingProperty, address: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط جولة الـ 360° الافتراضية:</label>
                <input
                  type="url"
                  value={editingProperty.video360Url || ""}
                  onChange={(e) => setEditingProperty({ ...editingProperty, video360Url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">المساحة (م²):</label>
                  <input
                    type="number"
                    value={editingProperty.areaSqm}
                    onChange={(e) => setEditingProperty({ ...editingProperty, areaSqm: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">مؤشر الجودة (%):</label>
                  <input
                    type="number"
                    min={60}
                    max={100}
                    value={editingProperty.livabilityScore}
                    onChange={(e) => setEditingProperty({ ...editingProperty, livabilityScore: Number(e.target.value) })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">حالة الوحدة:</label>
                  <select
                    value={editingProperty.status || "متاح"}
                    onChange={(e) => setEditingProperty({ ...editingProperty, status: e.target.value as any })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  >
                    <option value="متاح">متاح للحجز</option>
                    <option value="مشغول">مشغول / محجوز</option>
                  </select>
                </div>
              </div>

              {/* إدارة وتفاصيل المنطقة المحيطة (Nearby Amenities Control) */}
              <NearbyAmenitiesForm
                amenities={getEffectiveAmenities(editingProperty)}
                onChange={(updated) =>
                  setEditingProperty({
                    ...editingProperty,
                    nearbyAmenities: updated,
                  })
                }
                city={editingProperty.city}
                university={editingProperty.university}
              />

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
                >
                  حفظ وتحديث العقار الآن
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </StandardModal>

      {/* Modal: إضافة عقار جديد للكتالوج مباشرة */}
      <StandardModal
        isOpen={isNewPropertyModalOpen}
        onClose={() => setIsNewPropertyModalOpen(false)}
        maxWidthClassName="max-w-xl"
        title="إضافة سكن طلابي جديد للكتالوج"
        subtitle="سيتم نشر الوحدة وتوثيقها فوراً لتظهر أمام الطلاب"
        testId="admin-modal-new-property"
        closeButtonAriaLabel="إغلاق نافذة إضافة عقار"
      >
        <div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as any;
                addNewPlatformProperty({
                  title: form.title.value,
                  pricePerMonth: Number(form.price.value),
                  university: form.university.value,
                  city: form.university.value.replace("جامعة ", "").trim() || "القاهرة",
                  address: form.address.value,
                  areaSqm: Number(form.area.value) || 90,
                  bedrooms: Number(form.bedrooms.value) || 2,
                  bathrooms: 1,
                  floor: "الدور الثالث",
                  furnishing: "مفروش سوبر لوكس",
                  availableFrom: "فوري",
                  roomType: "شقة مشتركة للطلاب",
                  currentRoommates: 0,
                  images: [
                    form.image.value || "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  ],
                  video360Url: form.video360.value || "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4",
                  verified: true,
                  premium: true,
                  livabilityScore: 94,
                  status: "متاح",
                  nearbyAmenities: newAmenities,
                });
                openToast("تمت إضافة ونشر العقار الجديد مع تفاصيل المنطقة المحيطة بنجاح!");
                refreshAll();
                setIsNewPropertyModalOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-foreground mb-1">عنوان الوحدة:</label>
                <input
                  name="title"
                  required
                  placeholder="مثال: شقة طلابية فاخرة أمام مجمع الكليات"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">الإيجار الشهري (جنيه):</label>
                  <input
                    name="price"
                    type="number"
                    required
                    placeholder="1200"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">الجامعة القريبة:</label>
                  <input
                    name="university"
                    required
                    defaultValue="جامعة كفر الشيخ"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">العنوان التفصيلي:</label>
                <input
                  name="address"
                  required
                  placeholder="شارع الاستاد، بجوار البوابة الرئيسية"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط الصورة الرئيسية:</label>
                <input
                  name="image"
                  defaultValue="https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-bold text-foreground mb-1">رابط جولة 360° الافتراضية:</label>
                <input
                  name="video360"
                  defaultValue="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-foreground mb-1">المساحة (م²):</label>
                  <input
                    name="area"
                    type="number"
                    defaultValue={95}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-bold text-foreground mb-1">عدد الغرف:</label>
                  <input
                    name="bedrooms"
                    type="number"
                    defaultValue={3}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* إدارة وتفاصيل المنطقة المحيطة (Nearby Amenities Control) */}
              <NearbyAmenitiesForm
                amenities={newAmenities}
                onChange={setNewAmenities}
              />

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewPropertyModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow"
                >
                  نشر الوحدة للطلاب فوراً
                </button>
              </div>
            </form>
          </div>
      </StandardModal>

      {/* Modal: تكبير إيصال الدفع اليدوي */}
      <StandardModal
        isOpen={Boolean(selectedReceiptUrl)}
        onClose={() => setSelectedReceiptUrl(null)}
        maxWidthClassName="max-w-lg"
        title="صورة إيصال التحويل اليدوي"
        testId="admin-modal-receipt-preview"
        closeButtonAriaLabel="إغلاق صورة الإيصال"
      >
        <div>
          <div className="max-h-[70vh] overflow-auto rounded-2xl border border-border">
            {selectedReceiptUrl && (
              <img src={selectedReceiptUrl} alt="إيصال" className="w-full object-contain" />
            )}
          </div>
        </div>
      </StandardModal>

      {/* Modal: جدولة المعاينة الميدانية */}
      <StandardModal
        isOpen={actionModal === "schedule" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-md"
        title="جدولة زيارة المعاينة الميدانية"
        subtitle={selectedInspection ? `تحديد موعد نزول مهندس مكاني لفحص عقار (${selectedInspection.title})` : ""}
        testId="admin-modal-schedule-inspection"
        closeButtonAriaLabel="إغلاق نافذة الجدولة"
      >
        <div>
          <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">تاريخ وموعد الزيارة:</label>
              <input
                required
                type="text"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                placeholder="مثال: غداً، الساعة ١٢:٠٠ ظهراً"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">اسم المهندس / المشرف المعاين:</label>
              <input
                required
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow"
              >
                حفظ وتأكيد الموعد
              </button>
            </div>
          </form>
        </div>
      </StandardModal>

      {/* Modal: تفعيل العقار ونشره مع 360° */}
      <StandardModal
        isOpen={actionModal === "activate" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-lg"
        title="تفعيل الوحدة ونشرها للطلاب مع جولة 360°"
        subtitle="تأكيد فحص العقار على الطبيعة وإدخال رابط الجولة الافتراضية ومعدل الجودة لنشره فوراً في الكتالوج العام"
        testId="admin-modal-activate-inspection"
        closeButtonAriaLabel="إغلاق نافذة التفعيل"
      >
        <div>
          <div className="flex items-center gap-2 mb-3 text-emerald-600 font-bold text-xs">
            <Sparkles size={16} />
            نزول المعاينة الفعلية وتفعيل العقار
          </div>

          <form onSubmit={handleActivateSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">
                تقييم جودة المعيشة (Livability Score ٪):
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={70}
                  max={99}
                  value={livabilityScore}
                  onChange={(e) => setLivabilityScore(Number(e.target.value))}
                  className="flex-1 accent-primary"
                />
                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600 text-sm">
                  {livabilityScore}٪
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                رابط جولة الـ 360° الافتراضية (Virtual 360 Tour):
              </label>
              <div className="relative">
                <input
                  required
                  type="url"
                  value={video360Url}
                  onChange={(e) => setVideo360Url(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs pl-8 outline-none focus:border-primary"
                />
                <Video size={14} className="absolute left-2.5 top-3 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">رابط الجولة ثلاثية الأبعاد المصورة بمعرفة فريق مكاني</span>
            </div>

            <div>
              <label className="block font-bold text-foreground mb-1">
                تقرير مهندس المعاينة الميدانية:
              </label>
              <textarea
                rows={3}
                value={inspectorReport}
                onChange={(e) => setInspectorReport(e.target.value)}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="rounded-xl bg-emerald-500/10 p-3 text-[11px] text-emerald-800 dark:text-emerald-300 leading-5">
              ✓ عند الضغط على "تفعيل ونشر"، سيظهر العقار مباشرة لجميع الطلاب في صفحة "اكتشف السكن" كعقار موثق بمعاينة ميدانية.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition-colors"
              >
                <Check size={16} />
                تفعيل ونشر على المنصة للطلاب الآن
              </button>
            </div>
          </form>
        </div>
      </StandardModal>

      {/* Modal: رفض الطلب */}
      <StandardModal
        isOpen={actionModal === "reject" && Boolean(selectedInspection)}
        onClose={() => setActionModal(null)}
        maxWidthClassName="max-w-md"
        title="رفض طلب المعاينة"
        subtitle={selectedInspection ? `توضيح سبب عدم قبول عقار (${selectedInspection.title}) للمالك` : ""}
        testId="admin-modal-reject-inspection"
        closeButtonAriaLabel="إغلاق نافذة الرفض"
      >
        <div>
          <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-foreground mb-1">سبب الرفض:</label>
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="مثال: الموقع غير آمن، أو الصور لا تعكس الواقع، أو بعد المسافة عن أقرب جامعة..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-destructive"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-destructive px-5 py-2 text-xs font-bold text-destructive-foreground shadow"
              >
                تأكيد الرفض
              </button>
            </div>
          </form>
        </div>
      </StandardModal>
    </div>
  );
}
