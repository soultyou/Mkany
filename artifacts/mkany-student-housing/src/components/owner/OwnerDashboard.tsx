import React, { useState } from "react";
import { 
  Building2, 
  Plus, 
  ShieldCheck, 
  Eye, 
  Clock3, 
  CircleDollarSign, 
  Sparkle, 
  Wifi, 
  BarChart3, 
  MessageCircle, 
  Camera, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Clock, 
  ArrowLeft, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Lock,
  LogIn,
  UserCheck
} from "lucide-react";
import { useAuth, SignInButton, SignUpButton } from "@/components/auth/clerk-auth";
import { 
  getAllInspections, 
  getAllPlatformProperties, 
  PropertyInspection, 
  PlatformProperty,
  INSPECTIONS_CHANGE_EVENT,
  PROPERTIES_CHANGE_EVENT
} from "@/lib/inspections-store";
import { InspectionRequestModal } from "./InspectionRequestModal";

interface OwnerDashboardProps {
  openToast: (msg: string) => void;
  onViewPublicServices: () => void;
  onViewPropertyModal?: (p: PlatformProperty) => void;
}

export function OwnerDashboard({
  openToast,
  onViewPublicServices,
  onViewPropertyModal,
}: OwnerDashboardProps) {
  const { isSignedIn, user, updateUserProfile, openSignIn, switchRole } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"units" | "inspections">("units");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // جلب طلبات المعاينة والعقارات المنشورة بشكل متزامن وفعّال
  const [allInspections, setAllInspections] = useState<PropertyInspection[]>(() => getAllInspections());
  const [allProperties, setAllProperties] = useState<PlatformProperty[]>(() => getAllPlatformProperties());

  // الاستماع الفوري لأحداث التحديث في المخزن
  React.useEffect(() => {
    const handleSync = () => {
      setAllInspections(getAllInspections());
      setAllProperties(getAllPlatformProperties());
    };

    window.addEventListener(INSPECTIONS_CHANGE_EVENT, handleSync);
    window.addEventListener(PROPERTIES_CHANGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      window.removeEventListener(INSPECTIONS_CHANGE_EVENT, handleSync);
      window.removeEventListener(PROPERTIES_CHANGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // فلترة الوحدات الخاصة بهذا المالك حصرياً (Strict Owner Isolation)
  const currentOwnerId = user?.id;
  const currentOwnerEmail = user?.email?.toLowerCase();

  const ownerUnits = allProperties.filter((p) => {
    if (!currentOwnerId) return false;
    return p.ownerId === currentOwnerId;
  });

  const ownerInspections = allInspections.filter((i) => {
    if (!currentOwnerId) return false;
    if (i.ownerId && i.ownerId === currentOwnerId) return true;
    if (i.ownerEmail && currentOwnerEmail && i.ownerEmail.toLowerCase() === currentOwnerEmail) return true;
    return false;
  });

  // الدخول السريع بحساب مالك جاهز للتجربة
  const handleQuickDemoOwner = () => {
    switchRole("owner");
    openToast(`تم تفعيل جلسة المالك 🏢`);
  };

  // 1. حماية لوحة التحكم: التحقق من تسجيل الدخول
  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center" data-testid="owner-protected-gate">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-14 shadow-xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500">
            <Lock size={40} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3">
            منطقة محمية ومخصصة لأصحاب العقارات
          </span>

          <h1 className="text-3xl font-extrabold sm:text-4xl">لوحة تحكم المالك</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            تتطلب لوحة التحكم الخاصة بإدارة الوحدات، وإرسال طلبات المعاينة، ومتابعة إيرادات السكن الطلابي تسجيل الدخول بحساب مالك عقار معتمد.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <SignInButton mode="modal">
              <button 
                className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
                data-testid="button-gate-signin"
              >
                <LogIn size={18} />
                تسجيل الدخول كمالك
              </button>
            </SignInButton>

            <button 
              onClick={handleQuickDemoOwner}
              className="flex items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-6 py-3.5 text-sm font-bold text-primary hover:bg-primary/10 transition-colors"
              data-testid="button-gate-demo-owner"
            >
              <Sparkles size={18} />
              دخول سريع بحساب مالك عقار للتجربة ⚡
            </button>

            <button 
              onClick={onViewPublicServices}
              className="rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              عرض صفحة خدمات الملاك للزوار
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. التحقق من تصنيف الحساب كـ "مالك" (Owner Role Protection & Isolation)
  const isOwner = user?.role === "owner" || user?.role === "admin";
  if (!isOwner) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center" data-testid="student-role-barrier">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <UserCheck size={32} />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground mb-3">
            حساب طالب جامعي نشط 🎓
          </span>

          <h2 className="text-2xl font-extrabold">أنت مسجل حالياً بحساب "طالب" ({user?.fullName})</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
            لوحة تحكم الملاك مخصصة لأصحاب السكن والوحدات العقارية لإدارة الإيرادات وطلبات المعاينة 360°. حرصاً على عزل البيانات، يمكنك التبديل لحساب المالك المستقل أو تسجيل حساب مالك جديد.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => {
                switchRole("owner");
                openToast(`تم التبديل بنجاح إلى حساب المالك 🏢`);
              }}
              className="rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5"
              data-testid="button-switch-to-owner"
            >
              التبديل إلى حساب المالك 🏢 (Airbnb Mode)
            </button>

            <button
              onClick={onViewPublicServices}
              className="rounded-xl border border-border bg-background px-5 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              الرجوع لصفحة تفاصيل خدمات الملاك
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. عرض لوحة تحكم المالك الكاملة بعد المصادقة والتأكد من دور المالك
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" data-testid="owner-dashboard-active">
      {/* الترويسة الرئيسية */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              لوحة تحكم وإدارة العقارات
            </span>
            <button 
              onClick={onViewPublicServices}
              className="text-xs font-semibold text-muted-foreground hover:text-primary hover:underline"
            >
              ← عرض صفحة الملاك العامة للزوار
            </button>
          </div>
          <h1 className="text-3xl font-extrabold sm:text-4xl text-foreground">
            مرحباً، {user?.fullName || "المهندس محمود عبد العزيز"}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ShieldCheck size={16} className="text-primary" />
            مالك عقار معتمد وموثّق · {user?.university || "عقارات كفر الشيخ والمنصورة"}
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5"
          data-testid="button-add-unit"
        >
          <Plus size={18} />
          إضافة وحدة جديدة (طلب معاينة)
        </button>
      </div>

      {/* شريط الإحصائيات الرئيسي */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-primary/10 p-3 text-primary">
            <Building2 size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">{ownerUnits.length}</strong>
            <span className="text-xs font-semibold text-muted-foreground">وحدات نشطة على المنصة</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
            <Clock3 size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">{ownerInspections.length}</strong>
            <span className="text-xs font-semibold text-muted-foreground">طلبات معاينة جارية</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-sky-500/10 p-3 text-sky-500">
            <Eye size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">+٤٢٠</strong>
            <span className="text-xs font-semibold text-muted-foreground">مشاهدة طلابية هذا الأسبوع</span>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="rounded-xl bg-emerald-500/10 p-3 text-emerald-500">
            <CircleDollarSign size={22} />
          </span>
          <div>
            <strong className="block text-2xl font-black text-foreground">٣,٨٥٠ <small className="text-xs font-normal">ج.م</small></strong>
            <span className="text-xs font-semibold text-muted-foreground">صافي إيرادات الشهر</span>
          </div>
        </div>
      </div>

      {/* التبويبات الرئيسية: الوحدات المنشورة / دورة وتتبع طلبات المعاينة */}
      <div className="mt-8 flex rounded-2xl border border-border bg-card p-1.5 text-sm font-bold">
        <button
          onClick={() => setActiveTab("units")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "units"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-units"
        >
          <Building2 size={18} />
          الوحدات المنشورة على المنصة ({ownerUnits.length})
        </button>

        <button
          onClick={() => setActiveTab("inspections")}
          className={`flex-1 rounded-xl py-3 transition-all flex items-center justify-center gap-2 ${
            activeTab === "inspections"
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-owner-inspections"
        >
          <Camera size={18} />
          سجل ومتابعة طلبات المعاينة 360° ({ownerInspections.length})
        </button>
      </div>

      {/* محتوى التبويب الأول: الوحدات المعتمدة والمنشورة */}
      {activeTab === "units" && (
        <div className="mt-6 space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between border-b border-border p-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">الوحدات السكنية المعتمدة</h2>
                <p className="text-xs text-muted-foreground">تظهر هذه الوحدات مباشرة للطلاب في نتائج البحث بعد اعتماد المعاينة الميدانية.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus size={15} />
                طلب معاينة وحدة جديدة
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground font-bold">
                  <tr>
                    <th className="px-5 py-3.5">الوحدة والعنوان</th>
                    <th className="px-5 py-3.5">نوع السكن</th>
                    <th className="px-5 py-3.5">الإيجار الشهري</th>
                    <th className="px-5 py-3.5">جودة المعيشة</th>
                    <th className="px-5 py-3.5">حالة التوفر</th>
                    <th className="px-5 py-3.5">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ownerUnits.map((u) => (
                    <tr className="hover:bg-muted/30 transition-colors" key={u.id}>
                      <td className="px-5 py-4">
                        <strong className="block font-bold text-foreground">{u.title}</strong>
                        <span className="text-xs text-muted-foreground">{u.address}</span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-muted-foreground">{u.roomType}</td>
                      <td className="px-5 py-4 font-bold text-primary">{u.pricePerMonth} جنيه</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                          <Sparkles size={13} />
                          {u.livabilityScore}٪
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          u.status === "متاح" 
                            ? "bg-primary/15 text-primary" 
                            : u.status === "مشغول" 
                            ? "bg-muted text-muted-foreground" 
                            : "bg-amber-500/15 text-amber-600"
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onViewPropertyModal?.(u);
                              openToast(`تم فتح تفاصيل ${u.title}`);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            data-testid={`button-owner-view-${u.id}`}
                          >
                            <Eye size={14} />
                            معاينة كطالب
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* الرسوم البيانية والأرباح */}
          <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground">مخطط إيرادات السكن هذا العام</h2>
                  <strong className="mt-1 block text-3xl font-black text-primary">
                    ٢,٨٥٠ <small className="text-sm font-semibold">جنيه / محصل حتى الآن</small>
                  </strong>
                </div>
                <div className="rounded-xl bg-primary/10 p-3 text-primary">
                  <CircleDollarSign size={24} />
                </div>
              </div>

              <div className="flex h-32 items-end gap-2 border-b border-border pb-1">
                {[35, 48, 42, 63, 55, 76, 68, 88, 73, 95, 81, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary/75 hover:bg-primary transition-colors cursor-pointer" style={{ height: `${h}%` }} title={`شهر ${i + 1}`} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-semibold">
                <span>يناير</span>
                <span>يونيو</span>
                <span>ديسمبر</span>
              </div>
            </div>

            <div className="rounded-2xl bg-primary p-6 text-primary-foreground flex flex-col justify-between">
              <div>
                <Sparkle size={24} />
                <h2 className="mt-4 text-xl font-black">ضاعف ظهور وحداتك للطلاب</h2>
                <p className="mt-2 text-xs leading-6 text-primary-foreground/80">
                  ارفع عقارك في صدارة نتائج البحث حول كليات الطب والهندسة واحصل على +300% طلبات حجز فورية.
                </p>
              </div>

              <button
                onClick={() => openToast("سيتم التواصل معك لترقية وحدتك لقائمة التمييز")}
                className="mt-6 rounded-xl bg-primary-foreground px-5 py-3 text-xs font-bold text-primary shadow transition-transform hover:-translate-y-0.5"
                data-testid="button-upgrade-listing"
              >
                ترقية الوحدات للأعلى ظهوراً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* محتوى التبويب الثاني: دورة طلبات المعاينة وتتبع الحالة */}
      {activeTab === "inspections" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center border-b border-border pb-5 mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">دورة طلبات المعاينة والتوثيق</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تابع حالة كل عقار أرسلته من لحظة استلام الطلب وحتى نزول المعاينة الفعلية وتصوير الـ 360° ونشره للطلاب.
                </p>
              </div>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow"
              >
                <Plus size={16} />
                إرسال طلب معاينة جديد
              </button>
            </div>

            {ownerInspections.length === 0 ? (
              <div className="py-12 text-center">
                <Camera size={38} className="mx-auto text-muted-foreground mb-3" />
                <h3 className="font-bold text-foreground">لا توجد طلبات معاينة مسجلة حالياً</h3>
                <p className="text-xs text-muted-foreground mt-1">ابدأ بإرسال طلب معاينة لعقارك لنزول فريق مكاني وتصوير 360°.</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  إرسال أول طلب معاينة
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {ownerInspections.map((insp) => (
                  <div 
                    key={insp.id}
                    className="rounded-2xl border border-border bg-background p-5 sm:p-6 shadow-sm transition-all hover:border-primary/40"
                    data-testid={`inspection-card-${insp.id}`}
                  >
                    {/* رأس بطاقة المعاينة */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <strong className="text-lg font-bold text-foreground">{insp.title}</strong>
                          <span className="text-xs text-muted-foreground">({insp.roomType})</span>
                        </div>
                        <span className="text-xs text-muted-foreground block">{insp.address}</span>
                      </div>

                      {/* شارة الحالة */}
                      <div>
                        {insp.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-600">
                            <Clock size={14} />
                            طلب جديد (بانتظار مراجعة الإدارة)
                          </span>
                        )}
                        {insp.status === "scheduled" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-600">
                            <Calendar size={14} />
                            مجدول للمعاينة الميدانية
                          </span>
                        )}
                        {insp.status === "inspected" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-600">
                            <Camera size={14} />
                            تمت المعاينة الميدانية (جاري الرفع)
                          </span>
                        )}
                        {insp.status === "approved" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={14} />
                            تم الاعتماد والنشر للطلاب ✨
                          </span>
                        )}
                        {insp.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-600">
                            <AlertCircle size={14} />
                            مرفوض
                          </span>
                        )}
                      </div>
                    </div>

                    {/* مسار الخطوات المرئي للمعاينات (Inspection Progress Steps) */}
                    <div className="my-5 rounded-xl border border-border bg-card/60 p-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                        <div className="flex items-center gap-2 font-bold text-emerald-600">
                          <CheckCircle2 size={16} />
                          <span>١. استلام الطلب</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status !== "pending" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status !== "pending" ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                          <span>٢. تحديد موعد الزيارة</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status === "inspected" || insp.status === "approved" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status === "inspected" || insp.status === "approved" ? <CheckCircle2 size={16} /> : <Camera size={16} />}
                          <span>٣. نزول المعاينة وتصوير 360°</span>
                        </div>

                        <div className={`flex items-center gap-2 font-bold ${
                          insp.status === "approved" ? "text-emerald-600" : "text-muted-foreground"
                        }`}>
                          {insp.status === "approved" ? <CheckCircle2 size={16} /> : <Sparkles size={16} />}
                          <span>٤. التفعيل والنشر للطلاب</span>
                        </div>
                      </div>
                    </div>

                    {/* تفاصيل المعاينة والمشرف والصور */}
                    <div className="grid gap-4 sm:grid-cols-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block mb-1">بيانات العقار:</span>
                        <p className="font-semibold text-foreground">
                          {insp.areaSqm} م² · {insp.bedrooms} غرف · الدور {insp.floor} · {insp.furnishing}
                        </p>
                        <p className="text-primary font-bold mt-1">الإيجار المقترح: {insp.pricePerMonth} جنيه / شهر</p>
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1">تفاصيل الزيارة الميدانية:</span>
                        {insp.scheduledDate ? (
                          <div className="space-y-0.5">
                            <strong className="text-foreground block">{insp.scheduledDate}</strong>
                            <span className="text-muted-foreground block">المشرف: {insp.inspectorName || "مهندس المعاينة"}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">جاري التنسيق لتحديد موعد الزيارة هاتفياً ({insp.preferredInspectionDate})</span>
                        )}
                      </div>

                      <div>
                        <span className="text-muted-foreground block mb-1">الصور المرفوعة:</span>
                        <div className="flex items-center gap-1.5 overflow-x-auto">
                          {insp.initialPhotos.slice(0, 3).map((img, i) => (
                            <img key={i} src={img} alt="صورة عقار" className="h-10 w-14 rounded-lg object-cover border border-border" />
                          ))}
                          {insp.initialPhotos.length > 3 && (
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-[10px] font-bold">
                              +{insp.initialPhotos.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ملاحظات المشرف إن وجدت */}
                    {insp.inspectorReport && (
                      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                        <strong className="text-primary block mb-0.5">تقرير مهندس المعاينة:</strong>
                        <p>{insp.inspectorReport}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* نافذة إرسال طلب معاينة جديد */}
      {isAddModalOpen && (
        <InspectionRequestModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setActiveTab("inspections");
          }}
          openToast={openToast}
        />
      )}
    </section>
  );
}
