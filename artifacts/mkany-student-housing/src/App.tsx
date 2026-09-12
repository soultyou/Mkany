import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Heart, Search, Menu, X, Moon, Sun, ShieldCheck, ChevronDown, MapPin, GraduationCap, Sparkles, ArrowLeft, Ruler, BedDouble, Bath, Users, Building2, CalendarDays, Wifi, Sofa, Star, Check, LockKeyhole, Plus, BarChart3, Eye, Clock3, SlidersHorizontal, MessageCircle, FileText, Send, RefreshCw, Copy, Download, Home as HomeIcon, UserRound, Zap, Instagram, Linkedin, Facebook, Sparkle, CircleDollarSign, Crown, LifeBuoy } from "lucide-react";
import { Router as WouterRouter, Route, Switch, useLocation } from "wouter";
import { 
  ClerkAuthProvider, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  SignedIn, 
  SignedOut, 
  useUser,
  isOnboardingRequired
} from "@/components/auth/clerk-auth";
import { OnboardingModal } from "@/components/auth/OnboardingModal";
import { OwnerPublicView } from "@/components/owner/OwnerPublicView";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";
import { AdminSecurePortalPage } from "@/components/admin/AdminSecurePortalPage";
import { StudentDashboard } from "@/components/student/StudentDashboard";
import { BookingReceiptFlow } from "@/components/booking/BookingReceiptFlow";
import { 
  getAllPlatformProperties, 
  PlatformProperty,
  getEffectiveAmenities,
  getAmenitiesDisplayList,
  NearbyAmenities,
  syncPlatformPropertiesFromApi
} from "@/lib/inspections-store";
import { getStudentFavoritesApi, addFavoriteApi, removeFavoriteApi } from "@/lib/favorites-store";
import { InteractiveLeafletMap } from "@/components/map/InteractiveLeafletMap";
import { calcHaversineDistanceMeters } from "@/lib/geo-utils";
const logo = "/mkany-logo.png";

type ActiveViewType = "listings" | "studentDashboard" | "ownerPublic" | "ownerDashboard";

type Property = {
  id: number; title: string; address: string; city: string; university: string; pricePerMonth: number;
  roomType: string; areaSqm: number; bedrooms: number; bathrooms: number; floor: string; furnishing: string;
  availableFrom: string; currentRoommates: number; images: string[]; video360Url: string | null;
  verified: boolean; premium: boolean; livabilityScore: number; status: "متاح" | "مشغول" | "قيد المراجعة" | "مرفوض";
  model3dUrl?: string | null;
  rules?: string | null;
  smoking?: string | null;
  pets?: string | null;
  visitorPolicy?: string | null;
  utilities?: string | null;
  deposit?: string | null;
  fees?: string | null;
};

const reviews = [
  { name: "سارة محمود", university: "جامعة كفر الشيخ", initials: "سم", color: "bg-teal-700", quote: "المكان مطابق للصور جداً، والأهم إن كل تفاصيل العقد كانت واضحة من البداية." },
  { name: "يوسف خالد", university: "جامعة المنصورة", initials: "يك", color: "bg-amber-700", quote: "قرب السكن من البوابة وفر عليّ وقت ومواصلات كل يوم. تجربة مريحة فعلاً." },
  { name: "نورهان علي", university: "جامعة طنطا", initials: "نع", color: "bg-indigo-700", quote: "حجزت عبر فريق دعم مكاني بكل سلاسة وأمان ودون أي عمولة سمسار." },
];

const formatPrice = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

function ImageWithFallback({ src, alt, className, testId }: { src: string; alt: string; className?: string; testId?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`image-fallback flex items-center justify-center text-white/75 ${className || ""}`} data-testid={testId}><Building2 size={34} /><span className="sr-only">الصورة غير متاحة</span></div>;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} data-testid={testId} />;
}

import { StandardModal } from "@/components/ui/StandardModal";

export function Modal({ children, onClose, wide = false, label }: { children: ReactNode; onClose: () => void; wide?: boolean; label: string }) {
  return (
    <StandardModal
      isOpen={true}
      onClose={onClose}
      maxWidthClassName={wide ? "max-w-5xl" : "max-w-xl"}
      hideHeader={true}
      testId="modal-overlay"
      closeButtonAriaLabel={`إغلاق نافذة ${label || ""}`}
    >
      <div className="text-right">
        {children}
      </div>
    </StandardModal>
  );
}

import { NotificationBell } from "@/components/ui/NotificationBell";

function Header({ 
  light, 
  onTheme, 
  activeView, 
  setView, 
  openToast,
  savedCount = 0,
  studentTab,
  setStudentTab
}: { 
  light: boolean; 
  onTheme: () => void; 
  activeView: ActiveViewType; 
  setView: (v: ActiveViewType) => void; 
  openToast: (t: string) => void;
  savedCount?: number;
  studentTab?: "bookings" | "favorites" | "profile" | "support";
  setStudentTab?: (t: "bookings" | "favorites" | "profile" | "support") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useUser();
  const go = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  const handleLogoClick = () => {
    setView("listings");
    go("home");
  };

  const navToStudentTab = (tab: "bookings" | "favorites" | "profile" | "support") => {
    if (setStudentTab) setStudentTab(tab);
    setView("studentDashboard");
    setMenuOpen(false);
  };

  return <>
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button className="md:hidden rounded-lg border border-border p-2 text-muted-foreground" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة" data-testid="button-open-menu"><Menu size={21} /></button>
        <button onClick={handleLogoClick} className="flex items-center gap-2 text-right" aria-label="العودة للرئيسية" data-testid="button-logo">
          <img src={logo} alt="مكاني" className="logo-mark h-14 w-14 object-contain" />
          <span className="hidden text-right leading-tight sm:block"><strong className="block text-lg tracking-wide">MKANY</strong><small className="text-[10px] text-muted-foreground">سكنك يبدأ من هنا</small></span>
        </button>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-muted-foreground md:flex">
          <button onClick={() => { setView("listings"); go("home"); }} className={`hover:text-primary transition-colors ${activeView === "listings" ? "text-primary font-bold" : ""}`} data-testid="link-home">الرئيسية</button>
          <button onClick={() => { setView("listings"); go("discover"); }} className="hover:text-primary transition-colors" data-testid="link-discover">اكتشف السكن</button>
          
          <SignedIn>
            {user?.role !== "owner" && (
              <>
                <button 
                  onClick={() => navToStudentTab("bookings")} 
                  className={`hover:text-primary transition-colors ${activeView === "studentDashboard" && studentTab === "bookings" ? "text-primary font-bold" : ""}`} 
                  data-testid="link-my-bookings"
                >
                  حجوزاتي
                </button>
                <button 
                  onClick={() => navToStudentTab("favorites")} 
                  className={`flex items-center gap-1.5 hover:text-primary transition-colors ${activeView === "studentDashboard" && studentTab === "favorites" ? "text-primary font-bold" : ""}`} 
                  data-testid="link-my-favorites"
                >
                  <span>المفضلة</span>
                  {savedCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white" data-testid="badge-favorites-count">
                      {savedCount}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => navToStudentTab("support")} 
                  className={`hover:text-primary transition-colors ${activeView === "studentDashboard" && studentTab === "support" ? "text-primary font-bold" : ""}`} 
                  data-testid="link-support"
                >
                  الدعم والمساعدة
                </button>
              </>
            )}
          </SignedIn>

          {user?.role !== "student" && (
            <button onClick={() => setView("ownerPublic")} className={`hover:text-primary transition-colors ${activeView === "ownerPublic" ? "text-primary font-bold" : ""}`} data-testid="link-owners">للملاك</button>
          )}
          <button onClick={() => { setView("listings"); go("how"); }} className="hover:text-primary transition-colors" data-testid="link-about">كيف تعمل مكاني؟</button>
        </nav>
        <div className="flex items-center gap-2.5">
          <button onClick={onTheme} className="rounded-full border border-border p-2.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label={light ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"} data-testid="button-theme-toggle">{light ? <Moon size={18} /> : <Sun size={18} />}</button>

          {/* أزرار مخصصة حسب دور المستخدم المسجل */}
          <SignedIn>
            {/* زر لوحة الطالب وحجوزاته - يظهر فقط للطلاب والمستخدمين العاديين */}
            {user?.role !== "owner" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navToStudentTab("favorites")}
                  className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold transition-all text-foreground hover:bg-muted ${
                    activeView === "studentDashboard" && studentTab === "favorites" ? "border-primary text-primary" : ""
                  }`}
                  data-testid="header-button-student-favorites"
                >
                  <Heart size={15} className="text-rose-500 fill-rose-500/20" />
                  <span>المفضلة</span>
                  {savedCount > 0 && (
                    <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.5 text-[10px] font-extrabold">
                      {savedCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navToStudentTab("bookings")}
                  className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    activeView === "studentDashboard" && studentTab === "bookings"
                      ? "bg-primary text-primary-foreground shadow"
                      : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  }`}
                  data-testid="header-button-student-dashboard"
                >
                  <FileText size={15} />
                  حجوزاتي وبياناتي
                </button>
              </div>
            )}

            {/* زر لوحة المالك - يظهر للملاك */}
            {user?.role === "owner" && (
              <button
                onClick={() => setView("ownerDashboard")}
                className={`hidden lg:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  activeView === "ownerDashboard"
                    ? "bg-primary text-primary-foreground shadow"
                    : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                }`}
                data-testid="header-button-owner-dashboard"
              >
                <Building2 size={15} />
                لوحة تحكم المالك
              </button>
            )}

            {/* زر لوحة الإدارة والمشرفين - يظهر للآدمن والسوبر آدمن */}
            {(user?.role === "admin" || user?.role === "super_admin") && (
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all shadow-sm"
                data-testid="header-button-admin-portal"
              >
                <ShieldCheck size={15} />
                <span>لوحة الإدارة والمشرفين</span>
              </a>
            )}
          </SignedIn>
          
          <SignedOut>
            <SignInButton mode="modal">
              <button className="hidden rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors sm:block" data-testid="button-login">
                تسجيل الدخول
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-lg bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg sm:px-5 transition-all" data-testid="button-signup">
                انضم مجاناً
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="hidden xl:flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-foreground">
                  أهلاً بك، {user?.fullName?.split(" ")[0]} 👋
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {user?.role === "owner" ? "مالك عقارات موثق" : (user?.role === "admin" || user?.role === "super_admin") ? "فريق المعاينة والتوثيق" : user?.university || "طالب مكاني"}
                </span>
              </div>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
    <div className="border-b border-border bg-card/60">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-5 overflow-x-auto whitespace-nowrap px-4 py-2 text-[11px] font-semibold text-muted-foreground sm:gap-9 sm:text-xs">
        <span className="flex items-center gap-1.5"><Building2 size={13} className="text-primary" />+٢,٤٠٠ وحدة سكنية</span><span className="flex items-center gap-1.5"><GraduationCap size={14} className="text-primary" />١٥ جامعة</span><span className="flex items-center gap-1.5"><Star size={13} className="text-amber-400" />٤٫٨/٥ تقييم الطلاب</span><span className="flex items-center gap-1.5"><LockKeyhole size={13} className="text-primary" />دفع آمن ١٠٠٪</span>
      </div>
    </div>
    {menuOpen && <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
      <aside className="mr-auto h-full w-[82%] max-w-sm border-l border-border bg-background p-6 shadow-2xl flex flex-col justify-between" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="mb-8 flex items-center justify-between">
            <img src={logo} alt="مكاني" className="logo-mark h-14 w-14 object-contain" />
            <button onClick={() => setMenuOpen(false)} className="rounded-full border border-border p-2" aria-label="إغلاق القائمة" data-testid="button-close-menu"><X size={18} /></button>
          </div>

          <SignedIn>
            <div className="mb-6 rounded-2xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-right">
                  <strong className="block text-sm font-bold text-foreground">{user?.fullName}</strong>
                  <span className="text-xs text-muted-foreground">{user?.role === "owner" ? "مالك عقارات" : user?.university || "طالب"}</span>
                </div>
                <UserButton />
              </div>
            </div>
          </SignedIn>

          <nav className="flex flex-col gap-4 text-base font-bold">
            <button onClick={() => { setView("listings"); go("home"); }} className="text-right hover:text-primary" data-testid="mobile-link-home">الرئيسية</button>
            <button onClick={() => { setView("listings"); go("discover"); }} className="text-right hover:text-primary flex items-center gap-2" data-testid="mobile-link-discover"><Search size={16} />اكتشف السكن</button>
            
            <SignedIn>
              {user?.role !== "owner" && (
                <>
                  <button 
                    onClick={() => navToStudentTab("bookings")} 
                    className="text-right text-primary flex items-center gap-2" 
                    data-testid="mobile-link-student-bookings"
                  >
                    <FileText size={16} />
                    حجوزاتي
                  </button>
                  <button 
                    onClick={() => navToStudentTab("favorites")} 
                    className="text-right hover:text-primary flex items-center justify-between gap-2" 
                    data-testid="mobile-link-student-favorites"
                  >
                    <span className="flex items-center gap-2"><Heart size={16} className="text-rose-500 fill-rose-500/20" />المفضلة</span>
                    {savedCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
                        {savedCount}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => navToStudentTab("profile")} 
                    className="text-right hover:text-primary flex items-center gap-2" 
                    data-testid="mobile-link-student-profile"
                  >
                    <UserRound size={16} />
                    الملف الشخصي
                  </button>
                  <button 
                    onClick={() => navToStudentTab("support")} 
                    className="text-right hover:text-primary flex items-center gap-2" 
                    data-testid="mobile-link-student-support"
                  >
                    <LifeBuoy size={16} />
                    الدعم والمساعدة
                  </button>
                </>
              )}

              {(user?.role === "owner" || user?.role === "admin" || user?.role === "super_admin") && (
                <button 
                  onClick={() => { setView("ownerDashboard"); setMenuOpen(false); }} 
                  className="text-right text-primary flex items-center gap-2" 
                  data-testid="mobile-link-owner-dashboard"
                >
                  <Building2 size={16} />
                  لوحة تحكم المالك
                </button>
              )}
            </SignedIn>

            {user?.role !== "student" && (
              <button onClick={() => { setView("ownerPublic"); setMenuOpen(false); }} className="text-right hover:text-primary" data-testid="mobile-link-owners">للملاك (تفاصيل الخدمات والانضمام)</button>
            )}
            <button onClick={() => { setView("listings"); go("how"); }} className="text-right hover:text-primary" data-testid="mobile-link-how">كيف تعمل مكاني؟</button>
          </nav>
        </div>

        <SignedOut>
          <div className="mt-6 flex flex-col gap-2.5 pt-4 border-t border-border">
            <SignInButton mode="modal">
              <button onClick={() => setMenuOpen(false)} className="w-full rounded-xl border border-border py-3 text-sm font-bold text-foreground hover:bg-muted transition-colors" data-testid="mobile-button-login">
                تسجيل الدخول
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button onClick={() => setMenuOpen(false)} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow transition-transform hover:-translate-y-0.5" data-testid="mobile-button-signup">
                انضم مجاناً
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </aside>
    </div>}
  </>;
}

function SearchBox({ onSearch }: { onSearch: (city: string, type: string, budget: string, text?: string, availableOnly?: boolean, sort?: string) => void }) {
  const [city, setCity] = useState(""); 
  const [type, setType] = useState(""); 
  const [budget, setBudget] = useState(""); 
  const [text, setText] = useState(""); 
  const [availableOnly, setAvailableOnly] = useState(false); 
  const [sort, setSort] = useState("newest"); 
  const [quick, setQuick] = useState("");

  const submit = () => onSearch(city, type, budget, text, availableOnly, sort);

  const resetAll = () => {
    setCity("");
    setType("");
    setBudget("");
    setText("");
    setAvailableOnly(false);
    setSort("newest");
    setQuick("");
    onSearch("", "", "", "", false, "newest");
  };

  const hasActiveFilters = Boolean(city || type || budget || text || availableOnly || sort !== "newest" || quick);

  const field = (label: string, value: string, set: (v: string) => void, options: string[]) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-right text-xs font-semibold text-muted-foreground">
      <span>{label}</span>
      <div className="relative">
        <select 
          value={value} 
          onChange={(e) => set(e.target.value)} 
          className="w-full appearance-none rounded-lg border border-border bg-background/80 px-3 py-3 pl-8 text-sm font-semibold text-foreground outline-none focus:border-primary" 
          data-testid={`select-${label}`}
        >
          <option value="">الكل</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" />
      </div>
    </label>
  );

  return (
    <div className="hero-ring mx-auto mt-8 max-w-5xl rounded-2xl bg-card/80 p-3 backdrop-blur-md sm:p-5" data-testid="search-panel">
      {/* السطر الأول: نص البحث المباشر */}
      <div className="mb-3 relative">
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ابحث باسم العقار، الجامعة، المدينة، أو اسم الشارع..."
          className="w-full rounded-xl border border-border bg-background/90 py-3 pr-10 pl-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary font-semibold text-foreground"
          data-testid="input-search-text"
        />
        <Search size={18} className="absolute right-3.5 top-3.5 text-muted-foreground pointer-events-none" />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
        {field("المدينة / الجامعة", city, setCity, ["جامعة كفر الشيخ", "جامعة طنطا", "جامعة المنصورة", "جامعة الإسكندرية", "جامعة دمياط"])}
        {field("نوع السكن", type, setType, ["غرفة فردية", "غرفة مزدوجة", "استوديو", "شقة مشتركة"])}
        {field("الميزانية الشهرية", budget, setBudget, ["أقل من ٨٠٠ جنيه", "٨٠٠-١٥٠٠ جنيه", "١٥٠٠-٣٠٠٠ جنيه", "أكثر من ٣٠٠٠ جنيه"])}
        <button 
          onClick={submit} 
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 font-bold text-primary-foreground hover:-translate-y-0.5 shadow-sm" 
          data-testid="button-search"
        >
          <Search size={18} />
          ابحث الآن
        </button>
      </div>

      {/* خيارات الفلترة والتجميع الإضافية */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={availableOnly} 
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-[hsl(var(--primary))]" 
              data-testid="checkbox-available-only"
            />
            <span>أماكن شاغرة فقط (متاح الآن)</span>
          </label>

          <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span>الترتيب:</span>
            <select 
              value={sort} 
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none focus:border-primary"
              data-testid="select-sort-order"
            >
              <option value="newest">أحدث العقارات</option>
              <option value="price_asc">السعر: من الأقل للأعلى</option>
              <option value="price_desc">السعر: من الأعلى للأقل</option>
              <option value="livability">الأعلى في مؤشر جودة الحياة</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button 
            onClick={resetAll}
            className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            data-testid="button-reset-all-filters"
          >
            إعادة ضبط الفلاتر ↺
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-2.5">
        <span className="ml-1 text-xs text-muted-foreground">اختيارات سريعة</span>
        {["قريب من الجامعة", "واي فاي مجاني", "مفروش بالكامل", "بنات فقط", "0% عمولة"].map((chip) => (
          <button 
            key={chip} 
            onClick={() => { 
              const nextQuick = quick === chip ? "" : chip;
              setQuick(nextQuick); 
              onSearch(city, type, budget, nextQuick ? chip : text, availableOnly, sort); 
            }} 
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              quick === chip 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`} 
            data-testid={`filter-chip-${chip}`}
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property, saved, onSave, onOpen }: { property: Property; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const cardAmenities = getEffectiveAmenities(property as any);

  return <article className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:-translate-y-1 hover:shadow-xl" data-testid={`card-property-${property.id}`}>
    <div className="relative h-52 overflow-hidden"><ImageWithFallback src={property.images[0]} alt={property.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" testId={`img-property-${property.id}`} /><div className="absolute inset-x-3 top-3 flex items-start justify-between"><div className="flex gap-1.5">{property.verified && <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-primary"><ShieldCheck size={12} />متحقق منه</span>}{property.premium && <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[10px] font-bold text-amber-950"><Crown size={12} />مميز</span>}</div><button onClick={onSave} className={`rounded-full p-2 backdrop-blur-sm ${saved ? "bg-primary text-primary-foreground" : "bg-background/80 text-foreground"}`} aria-label={saved ? "إزالة من المحفوظات" : "حفظ الوحدة"} data-testid={`button-save-${property.id}`}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button></div></div>
    <div className="p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={13} className="text-primary" />{property.address}</p><h3 className="font-bold">{property.title}</h3></div>
        <div className="shrink-0 text-left"><strong className="text-lg text-primary">{formatPrice(property.pricePerMonth)}</strong><span className="block text-[10px] text-muted-foreground">جنيه / شهر</span></div>
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{property.roomType} · {property.university}</p>

      {/* شريط الخدمات والمسافات الحية للمنطقة المحيطة */}
      {cardAmenities.universityGate?.distance && cardAmenities.universityGate.distance !== "لا توجد بيانات متاحة" ? (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]" data-testid={`card-amenities-${property.id}`}>
          <span className="flex items-center gap-1 font-semibold text-foreground truncate">
            <GraduationCap size={13} className="text-primary shrink-0" />
            بوابة الجامعة: {cardAmenities.universityGate.distance} {cardAmenities.universityGate.time && cardAmenities.universityGate.time !== "لا توجد بيانات متاحة" ? `(${cardAmenities.universityGate.time})` : ""}
          </span>
          {cardAmenities.transportation?.distance && cardAmenities.transportation.distance !== "لا توجد بيانات متاحة" && (
            <span className="text-[10px] font-bold text-primary shrink-0">
              مواصلات: {cardAmenities.transportation.distance}
            </span>
          )}
        </div>
      ) : (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]" data-testid={`card-amenities-${property.id}`}>
          <span className="flex items-center gap-1 text-muted-foreground">
            <GraduationCap size={13} className="text-primary shrink-0" />
            خدمات المنطقة المحيطة
          </span>
          <span className="text-[10px] text-muted-foreground">
            OpenStreetMap
          </span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Ruler size={13} />{property.areaSqm}م²</span><span className="flex items-center gap-1"><BedDouble size={13} />{property.bedrooms} غرف</span><span className="flex items-center gap-1"><Bath size={13} />{property.bathrooms} حمامات</span><span className="flex items-center gap-1"><Users size={13} />{property.currentRoommates} شركاء</span></div>
      <div className="mb-3"><div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">مؤشر جودة الحياة</span><span className="font-bold text-primary">{property.livabilityScore}/100</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${property.livabilityScore}%` }} /></div></div>
      <div className="mb-3 flex items-center gap-1 text-[11px] font-semibold text-primary"><ShieldCheck size={13} />0% عمولة سماسرة</div>
      <button onClick={onOpen} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground" data-testid={`button-details-${property.id}`}>عرض التفاصيل<ArrowLeft size={16} /></button>
    </div>
  </article>;
}

function PropertyDetail({ 
  property, 
  onClose, 
  onAI, 
  onBook,
  saved,
  onSave
}: { 
  property: Property; 
  onClose: () => void; 
  onAI: () => void; 
  onBook: (selectedDate?: string) => void;
  saved?: boolean;
  onSave?: () => void;
}) {
  const [media, setMedia] = useState<"photos" | "video">("photos"); 
  const [photo, setPhoto] = useState(0);
  const [selectedAmenityKey, setSelectedAmenityKey] = useState<string | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);

  const [dynamicAmenitiesData, setDynamicAmenitiesData] = useState<NearbyAmenities | null>(null);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);

  useEffect(() => {
    const lat = (property as any).lat;
    const lng = (property as any).lng;
    if (!lat || !lng) {
      setDynamicAmenitiesData(null);
      return;
    }

    let active = true;
    setIsLoadingAmenities(true);

    async function fetchFreshAmenities() {
      try {
        const res = await fetch(`/api/geo/amenities?lat=${lat}&lng=${lng}&propertyId=${property.id}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && data.amenities) {
            setDynamicAmenitiesData(data.amenities);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to fetch dynamic amenities:", err);
      } finally {
        if (active) {
          setIsLoadingAmenities(false);
        }
      }

      // Fallback only if live fetch fails and property already had nearbyAmenities
      if (active && (property as any).nearbyAmenities) {
        setDynamicAmenitiesData((property as any).nearbyAmenities);
      }
    }

    fetchFreshAmenities();

    return () => {
      active = false;
    };
  }, [property.id, (property as any).lat, (property as any).lng]);

  const getCalendarMonthName = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  };

  const getCalendarDays = (offset: number) => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    
    // First day of the month
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday, 6 is Saturday
    
    // Total days in the month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: ({ date: Date; day: number; isToday: boolean; formatted: string } | null)[] = [];
    
    // Empty cells before first day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      const dateObj = new Date(year, month, i);
      const isDayToday = dateObj.getDate() === today.getDate() && 
                         dateObj.getMonth() === today.getMonth() && 
                         dateObj.getFullYear() === today.getFullYear();
                         
      days.push({
        date: dateObj,
        day: i,
        isToday: isDayToday,
        formatted: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`
      });
    }
    
    return days;
  };

  // Helper to determine status for a specific date
  const getDayStatus = (date: Date, property: any, availablePlaces: number) => {
    if (availablePlaces <= 0) {
      return "unavailable";
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(date);
    d.setHours(0,0,0,0);
    if (d < today) {
      return "unavailable";
    }

    const activeBookings = property.activeBookings || [];
    const hasMatchingBooking = activeBookings.some((b: any) => {
      if (!b.appointmentDate) return false;
      
      const bDate = new Date(b.appointmentDate);
      if (!isNaN(bDate.getTime())) {
        return bDate.getDate() === date.getDate() && 
               bDate.getMonth() === date.getMonth() && 
               bDate.getFullYear() === date.getFullYear();
      }
      
      const normalizedBookingStr = b.appointmentDate.replace(/[٠-٩]/g, (d: string) => String.fromCharCode(d.charCodeAt(0) - 1632));
      const dayNum = date.getDate();
      const monthNum = date.getMonth() + 1;
      return normalizedBookingStr.includes(String(dayNum)) && (normalizedBookingStr.includes(String(monthNum)) || normalizedBookingStr.includes(getCalendarMonthName(calendarMonthOffset)));
    });

    if (hasMatchingBooking) {
      return "reserved";
    }

    return "available";
  };

  const capacity = property.bedrooms || 0;
  const currentRoommates = property.currentRoommates || 0;
  const activeBookingsCount = (property as any).activeBookings?.length || 0;
  const availablePlaces = (property as any).availablePlaces !== undefined 
    ? (property as any).availablePlaces 
    : Math.max(0, capacity - (currentRoommates + activeBookingsCount));

  // Safe parsing of images
  const propertyImages = Array.isArray(property.images) ? property.images : [];
  const hasImages = propertyImages.length > 0;
  const safePhotoIndex = photo < propertyImages.length ? photo : 0;

  const facts: Array<[ComponentType<{ size?: number; className?: string }>, string, string]> = [
    [Ruler, "المساحة", `${property.areaSqm} م²`], 
    [BedDouble, "عدد الغرف", `${property.bedrooms}`], 
    [Bath, "الحمامات", `${property.bathrooms}`], 
    [Building2, "الدور", property.floor], 
    [Sofa, "نوع الفرش", property.furnishing], 
    [CalendarDays, "تاريخ التوفر", property.availableFrom], 
    [Users, "الشاغر الحالي", availablePlaces > 0 ? `${availablePlaces} أماكن` : "مكتمل الحجز"]
  ];
  
  // بيانات الخدمات والمنطقة المحيطة الديناميكية المعتمدة من الآدمن أو المستردة ديناميكياً من الخريطة
  const effectiveAmenities = useMemo(() => {
    if (dynamicAmenitiesData) {
      return dynamicAmenitiesData;
    }
    return getEffectiveAmenities(property as any);
  }, [dynamicAmenitiesData, property]);

  const baseAmenitiesList = useMemo(() => {
    return getAmenitiesDisplayList(effectiveAmenities, (property as any).lat, (property as any).lng);
  }, [effectiveAmenities, property]);

  // Auto-select first available amenity when list loads
  useEffect(() => {
    if (baseAmenitiesList.length > 0) {
      const firstUniv = baseAmenitiesList.find(a => a.key.toString().startsWith("universityGate"));
      if (firstUniv) {
        setSelectedAmenityKey(firstUniv.key);
      } else {
        setSelectedAmenityKey(baseAmenitiesList[0].key);
      }
    } else {
      setSelectedAmenityKey(null);
    }
  }, [baseAmenitiesList]);

  // Sort amenities: prioritize university, then sort by real geographic distance
  const dynamicAmenities = useMemo(() => {
    const propLat = (property as any).lat;
    const propLng = (property as any).lng;
    
    if (!propLat || !propLng) {
      return baseAmenitiesList;
    }

    return [...baseAmenitiesList].sort((a, b) => {
      const aIsUniv = a.iconType === "universityGate" ? 1 : 0;
      const bIsUniv = b.iconType === "universityGate" ? 1 : 0;
      if (aIsUniv !== bIsUniv) {
        return bIsUniv - aIsUniv;
      }

      const distA = calcHaversineDistanceMeters(propLat, propLng, a.lat || 0, a.lng || 0);
      const distB = calcHaversineDistanceMeters(propLat, propLng, b.lat || 0, b.lng || 0);
      return distA - distB;
    });
  }, [baseAmenitiesList, property]);

  // سياسات وقوانين العقار
  const rules = property.rules || "";
  const smoking = property.smoking || "";
  const pets = property.pets || "";
  const visitorPolicy = property.visitorPolicy || "";
  const utilities = property.utilities || "";
  const deposit = property.deposit || "";
  const fees = property.fees || "";
  const hasAnyCustomPolicy = rules || smoking || pets || visitorPolicy || utilities || deposit || fees;

  const owner = (property as any).owner || { fullName: "مالك معتمد في مكاني", avatarUrl: null, isVerified: true };

  return <Modal onClose={onClose} wide label={`تفاصيل ${property.title}`}><div className="p-4 pt-14 sm:p-7 sm:pt-14">
    {/* 1. هوية العقار والمؤشرات الرئيسية (العنوان، السعر، التوثيق، جودة الحياة) */}
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-muted-foreground font-semibold">
            <MapPin size={15} className="text-primary" />
            {property.city} · {property.university}
          </span>
          {property.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
              <ShieldCheck size={12} />
              موثّق ومعتمد
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            property.status === "متاح" 
              ? "bg-teal-500/10 border border-teal-500/20 text-teal-600" 
              : "bg-amber-500/10 border border-amber-500/20 text-amber-600"
          }`}>
            {property.status}
          </span>
          {property.livabilityScore > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              ★ مؤشر جودة الحياة: {property.livabilityScore} / ١٠٠
            </span>
          )}
        </div>
        <h2 className="text-2xl font-extrabold sm:text-3xl text-foreground">{property.title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {onSave && (
          <button
            onClick={onSave}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              saved
                ? "border-rose-500 bg-rose-500 text-white"
                : "border-border bg-card text-foreground hover:border-primary"
            }`}
            aria-label={saved ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            data-testid={`button-detail-save-${property.id}`}
          >
            <Heart size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "في المفضلة" : "حفظ بالمفضلة"}
          </button>
        )}
        <div className="text-left bg-primary/5 border border-primary/20 rounded-xl px-4 py-2">
          <strong className="text-2xl font-black text-primary">{formatPrice(property.pricePerMonth)} <small className="text-xs font-bold text-primary">جنيه / شهر</small></strong>
          <p className="text-[10px] font-semibold text-muted-foreground">شامل الرسوم الأساسية للإيجار</p>
        </div>
      </div>
    </div>

    {/* 2. معرض الصور والوسائط المطوّر (الصور + الفيديو + نموذج 3D) */}
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative h-64 sm:h-[390px] w-full bg-slate-950">
        {media === "photos" ? (
          hasImages ? (
            <ImageWithFallback src={propertyImages[safePhotoIndex]} alt={property.title} className="h-full w-full object-cover" testId="img-detail-main" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-white/80 text-center p-4">
              <Building2 size={48} className="mb-3 text-white/55" />
              <strong className="text-base">لا توجد صور متاحة</strong>
              <span className="text-xs text-white/60">لم يتم رفع صور لهذا العقار حتى الآن</span>
            </div>
          )
        ) : property.video360Url ? (
          <div className="relative h-full w-full">
            <video src={property.video360Url} className="h-full w-full object-cover" controls autoPlay muted data-testid="video-tour" />
            <div className="absolute bottom-3 right-3 bg-slate-950/70 text-white text-[11px] px-3 py-1.5 rounded-lg border border-white/10">
              فيديو توضيحي للعقار
            </div>
          </div>
        ) : (
          <div className="hero-wash flex h-full flex-col items-center justify-center gap-3 text-center text-white p-4">
            <Sparkles className="text-primary" size={35} />
            <strong>فيديو توضيحي</strong>
            <span className="text-xs text-white/60">هذه الوحدة لا تحتوي على فيديو توضيحي متاح حالياً</span>
          </div>
        )}

        {/* أزرار تبديل المعرض */}
        <div className="absolute right-3 top-3 flex overflow-hidden rounded-lg border border-white/20 bg-slate-950/65 p-1 text-xs font-bold text-white">
          <button onClick={() => setMedia("photos")} className={`rounded-md px-3 py-2 ${media === "photos" ? "bg-primary text-primary-foreground" : ""}`} data-testid="button-media-photos">
            صور الوحدة
          </button>
          {property.video360Url && (
            <button onClick={() => setMedia("video")} className={`rounded-md px-3 py-2 ${media === "video" ? "bg-primary text-primary-foreground" : ""}`} data-testid="button-media-video">
              فيديو المعاينة
            </button>
          )}
        </div>
      </div>

      {/* مصغرات الصور لسهولة التصفح */}
      {hasImages && media === "photos" && (
        <div className="flex gap-2 overflow-x-auto p-3 border-t border-border bg-card/50" data-testid="gallery-thumbnails">
          {propertyImages.map((img, i) => (
            <button 
              key={img} 
              onClick={() => { setPhoto(i); setMedia("photos"); }} 
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                safePhotoIndex === i ? "border-primary scale-95" : "border-transparent opacity-85 hover:opacity-100"
              }`} 
              data-testid={`button-thumbnail-${i}`}
            >
              <ImageWithFallback src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>

    {/* 3D Model Badge (عند توفره) */}
    {property.model3dUrl && (
      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4" data-testid="badge-3d-available">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2.5 text-blue-600 shrink-0">
            <Sparkle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">نموذج ثلاثي الأبعاد (3D Model) متوفر للعقار</h4>
            <p className="mt-1 text-xs text-blue-800/80 leading-5">
              تتوفر معاينة فراغية كاملة وتصميم ثلاثي الأبعاد تفاعلي آمن لهذه الوحدة السكنية. لحماية حقوق الخصوصية والأمان الفني للمالك والطلاب، يرجى تقديم طلب حجز للحصول على الرابط المعتمد رسمياً لتجربة التجول الافتراضي.
            </p>
          </div>
        </div>
      </div>
    )}

    {/* 3. التوفر والسعة الحالية (يظهر بارزاً قبل سياسات السكن) */}
    <section className="section-rule mt-7 pt-6 border-t border-border" data-testid="section-availability-summary">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold">حالة التوفر والسعة السكنية الشاغرة</h3>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
          availablePlaces > 0 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600" : "bg-red-500/10 border border-red-500/20 text-red-500"
        }`}>
          {availablePlaces > 0 ? "متاح للحجز الفوري" : "غير متاح — مكتملة"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {/* الأماكن المتاحة */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
          <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">الأماكن المتاحة</span>
          <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {availablePlaces > 0 ? `${availablePlaces} أسرة` : "٠ مكان"}
          </strong>
        </div>

        {/* السعة والمشغول */}
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="block text-xs font-semibold text-muted-foreground mb-1">المقاعد المشغولة</span>
          <strong className="text-xl font-bold text-foreground">
            {capacity - availablePlaces} من {capacity} أسرة
          </strong>
        </div>

        {/* تاريخ بدء التوفر */}
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="block text-xs font-semibold text-muted-foreground mb-1">متاح من تاريخ</span>
          <strong className="text-sm font-bold text-foreground">
            {property.availableFrom || "متاح الآن فوراً"}
          </strong>
        </div>

        {/* حالة الوحدة */}
        <div className="rounded-xl border border-border bg-card p-4">
          <span className="block text-xs font-semibold text-muted-foreground mb-1">حالة الوحدة</span>
          <strong className={`text-sm font-bold ${availablePlaces > 0 ? "text-emerald-600" : "text-red-500"}`}>
            {availablePlaces > 0 ? "جاهزة للاستلام" : "مكتملة الحجز"}
          </strong>
        </div>
      </div>
    </section>

    {/* 4. مواصفات وتفاصيل السكن */}
    <section className="section-rule mt-7 pt-6 border-t border-border">
      <h3 className="mb-4 text-lg font-bold">مواصفات وتفاصيل السكن</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([Icon, label, value]) => (
          <div className="rounded-lg border border-border bg-card p-3" key={label}>
            <Icon size={17} className="mb-2 text-primary" />
            <span className="block text-[11px] text-muted-foreground">{label}</span>
            <strong className="text-sm">{value}</strong>
          </div>
        ))}
      </div>
    </section>

    {/* 5. جدول مواعيد الحجوزات والتقويم التفاعلي */}
    <section className="section-rule mt-7 pt-6 border-t border-border" data-testid="section-availability-calendar">
      <h3 className="mb-1 text-lg font-bold">جدول مواعيد الحجوزات المتاحة</h3>
      <p className="text-xs text-muted-foreground mb-4">اختر التاريخ المناسب لبدء معاينة أو حجز السكن مباشرة</p>

      {/* تقويم تفاعلي جميل باللغة العربية */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-foreground">جدول مواعيد الحجوزات (الشهور القادمة)</h4>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setCalendarMonthOffset(prev => Math.max(0, prev - 1));
              }}
              disabled={calendarMonthOffset === 0}
              className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 text-xs w-6 h-6 flex items-center justify-center font-bold"
              data-testid="btn-calendar-prev"
            >
              &larr;
            </button>
            <span className="text-xs font-bold px-2 py-1 bg-muted rounded-md select-none">
              {getCalendarMonthName(calendarMonthOffset)}
            </span>
            <button 
              onClick={() => {
                setCalendarMonthOffset(prev => Math.min(3, prev + 1));
              }}
              disabled={calendarMonthOffset === 3}
              className="p-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 text-xs w-6 h-6 flex items-center justify-center font-bold"
              data-testid="btn-calendar-next"
            >
              &rarr;
            </button>
          </div>
        </div>

        {/* أسماء الأيام */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
          {["ح", "ن", "ث", "ر", "خ", "ج", "س"].map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        {/* أيام التقويم */}
        <div className="grid grid-cols-7 gap-1">
          {getCalendarDays(calendarMonthOffset).map((dayObj, idx) => {
            if (!dayObj) {
              return <div key={`empty-${idx}`} className="aspect-square bg-transparent" />;
            }
            
            const isToday = dayObj.isToday;
            const status = getDayStatus(dayObj.date, property, availablePlaces);
            
            let statusClass = "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/25 border border-emerald-500/20 cursor-pointer hover:scale-105 active:scale-95";
            let statusLabel = "متاح";
            
            if (status === "reserved") {
              statusClass = "bg-amber-500/20 text-amber-700 hover:bg-amber-500/35 border border-amber-500/30 font-bold";
              statusLabel = "محجوز";
            } else if (status === "unavailable") {
              statusClass = "bg-red-500/10 text-red-500 opacity-60 cursor-not-allowed border border-red-500/10";
              statusLabel = "غير متاح";
            }

            const isSelectable = status === "available" && availablePlaces > 0;

            return (
              <div 
                key={dayObj.formatted}
                onClick={() => {
                  if (isSelectable) {
                    onBook(dayObj.formatted);
                  }
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all select-none p-1 ${statusClass}`}
                title={isSelectable ? `اضغط لحجز الموعد: ${dayObj.formatted}` : `${dayObj.formatted} - ${statusLabel}`}
                data-testid={`calendar-day-${dayObj.formatted}`}
              >
                <span className="font-bold">{dayObj.day}</span>
                <span className="text-[8px] font-medium opacity-80 scale-90">{statusLabel}</span>
                {isToday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </div>
            );
          })}
        </div>

        {/* دليل التقويم */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500/25 border border-emerald-500/40 shrink-0" />
            <span>متاح للحجز</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500/30 border border-amber-500/50 shrink-0" />
            <span>محجوز</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/10 border border-red-500/20 shrink-0" />
            <span>غير متاح / مكتملة</span>
          </div>
        </div>
      </div>
    </section>

    {/* 6. خريطة OpenStreetMap والخدمات المحيطة بالعقار */}
    <section className="section-rule mt-7 pt-6 border-t border-border" data-testid="section-nearby-amenities">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">الخريطة والخدمات المحيطة بالعقار</h3>
          <p className="text-xs text-muted-foreground">تصفح مسافات الشوارع وأوقات السير مجاناً عبر OpenStreetMap و Leaflet.js</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
          OpenStreetMap & Leaflet ✓
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 mb-4" data-testid="location-summary">
        <div className="flex items-start gap-2 text-sm">
          <MapPin size={17} className="text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="block text-foreground">العنوان المعتمد:</strong>
            <span className="text-muted-foreground">{property.address}</span>
          </div>
        </div>
        <div className="grid gap-3 pt-2 text-xs text-muted-foreground sm:grid-cols-3 border-t border-border/60">
          <div>
            <strong>المدينة / المحافظة:</strong> {property.city}
          </div>
          <div>
            <strong>الجامعة الأقرب:</strong> {property.university}
          </div>
          {((property as any).lat !== undefined && (property as any).lat !== null && (property as any).lng !== undefined && (property as any).lng !== null) ? (
            <div>
              <strong>الإحداثيات الجغرافية:</strong> {(property as any).lat?.toFixed(5)} , {(property as any).lng?.toFixed(5)}
            </div>
          ) : (
            <div>
              <strong>الإحداثيات الجغرافية:</strong> يحتاج تحديد الموقع
            </div>
          )}
        </div>
      </div>

      <InteractiveLeafletMap
        propertyTitle={property.title}
        propertyAddress={property.address}
        city={property.city}
        university={property.university}
        propertyLat={(property as any).lat}
        propertyLng={(property as any).lng}
        amenities={effectiveAmenities}
        selectedAmenityKey={selectedAmenityKey}
        onSelectAmenity={(item) => setSelectedAmenityKey(item.key)}
        className="mb-4"
      />

      {isLoadingAmenities && dynamicAmenities.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          <span className="inline-block animate-pulse ml-2">📍</span>
          جاري استرداد الخدمات المحيطة المعتمدة من OpenStreetMap...
        </div>
      ) : (
        <div className="space-y-4">
          {[
            {
              key: "universityGate",
              title: "الجامعة / أقرب جامعة",
              icon: "🎓",
              emptyText: "لا توجد بيانات جامعة متاحة",
            },
            {
              key: "supermarket",
              title: "السوبرماركت والأسواق",
              icon: "🛒",
              emptyText: "لا توجد بيانات متاحة",
            },
            {
              key: "cafeRestaurant",
              title: "المطاعم والكافيهات",
              icon: "🍴",
              emptyText: "لا توجد بيانات متاحة",
            },
            {
              key: "pharmacy",
              title: "الصيدليات",
              icon: "💊",
              emptyText: "لا توجد بيانات متاحة",
            },
            {
              key: "hospital",
              title: "المستشفيات والعيادات",
              icon: "🏥",
              emptyText: "لا توجد بيانات متاحة",
            },
            {
              key: "transportation",
              title: "المواصلات والنقل",
              icon: "🚌",
              emptyText: "لا توجد بيانات متاحة",
            },
          ].map((cat) => {
            const items = dynamicAmenities.filter((item) => item.iconType === cat.key);
            return (
              <div key={cat.key} className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{cat.icon}</span>
                    <h4 className="text-xs font-bold text-foreground">{cat.title}</h4>
                  </div>
                  {items.length > 0 ? (
                    <span className="text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      {items.length} {items.length === 1 ? "مكان موثق" : "أماكن موثقة"}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                      غير متوفر
                    </span>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 py-3 px-4 text-center text-xs text-muted-foreground">
                    {cat.emptyText}
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => {
                      const isSelected = selectedAmenityKey === item.key;
                      const propLat = (property as any).lat;
                      const propLng = (property as any).lng;

                      const geoMeters = propLat && propLng && item.lat && item.lng
                        ? calcHaversineDistanceMeters(propLat, propLng, item.lat, item.lng)
                        : null;

                      const geoDistanceFormatted = geoMeters !== null
                        ? (geoMeters < 1000 ? `${Math.round(geoMeters)} م` : `${(geoMeters / 1000).toFixed(1).replace(".", "٫")} كم`)
                        : item.distance && item.distance !== "لا توجد بيانات متاحة"
                          ? item.distance
                          : "لا توجد بيانات متاحة";

                      const displayDistance = geoDistanceFormatted.startsWith("المسافة الجغرافية:")
                        ? geoDistanceFormatted
                        : geoDistanceFormatted !== "لا توجد بيانات متاحة"
                          ? `المسافة الجغرافية: ${geoDistanceFormatted}`
                          : geoDistanceFormatted;

                      return (
                        <div
                          className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/40 shadow-xs"
                              : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"
                          }`}
                          key={item.key}
                          onClick={() => setSelectedAmenityKey(item.key)}
                          data-testid={`amenity-item-${item.key}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <strong className="block text-xs font-bold text-foreground line-clamp-1" title={item.name}>
                                {item.name}
                              </strong>
                              {isSelected && (
                                <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                  نشط 📍
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {item.rating && item.rating !== "0" && item.rating !== "0.0" ? (
                                <span
                                  className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400"
                                  title="تقييم مكاني المعتمد"
                                >
                                  <span>★</span>
                                  <span>تقييم مكاني: {item.rating} / 5</span>
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                                  title="لم يتم تقييمه بعد من قِبل إدارة مكاني"
                                >
                                  لم يتم تقييمه بعد
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-dashed border-border/80 pt-2 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-muted-foreground">
                              <span>المسافة الجغرافية:</span>
                              <span className="font-semibold text-foreground">{displayDistance}</span>
                            </div>

                            <div className="flex items-center justify-between border-t border-dashed border-border/40 pt-1 text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <span>🚶</span> مسار المشي:
                              </span>
                              <span className="font-medium text-muted-foreground">بيانات مسار المشي غير متاحة</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>

    {/* 7. معلومات المالك المعتمد (الاسم والتوثيق فقط دون أي وسيلة اتصال خاصة) */}
    <section className="section-rule mt-7 pt-6 border-t border-border" data-testid="section-owner-profile">
      <h3 className="mb-3 text-lg font-bold">معلومات المالك المعتمد</h3>
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-card p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg border border-primary/20 shrink-0">
          {owner.fullName ? owner.fullName.charAt(0) : "م"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <strong className="text-sm font-bold text-foreground truncate">{owner.fullName || "مالك معتمد في مكاني"}</strong>
            {owner.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 shrink-0">
                <ShieldCheck size={12} />
                مالك موثق
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">عضو معتمد في شبكة ملاك مكاني الموثقين رسميًا</p>
        </div>
      </div>
    </section>

    {/* 8. سياسات وقوانين الإقامة بالتفصيل */}
    <section className="section-rule mt-7 pt-6 border-t border-border">
      <h3 className="mb-4 text-lg font-bold">سياسات الإقامة وقوانين العقار المعتمدة</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {rules && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">تعليمات السكن وشروطه:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{rules}</p>
          </div>
        )}
        {smoking && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">سياسة التدخين:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{smoking}</p>
          </div>
        )}
        {pets && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">سياسة الحيوانات الأليفة:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{pets}</p>
          </div>
        )}
        {visitorPolicy && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">سياسة الزوار والضيوف:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{visitorPolicy}</p>
          </div>
        )}
        {utilities && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">المرافق والاستهلاك الكهربائي/المائي:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{utilities}</p>
          </div>
        )}
        {deposit && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">مبلغ وقوانين التأمين:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{deposit}</p>
          </div>
        )}
        {fees && (
          <div className="rounded-xl border border-border bg-card p-4">
            <strong className="block text-xs text-muted-foreground mb-1">الرسوم الإضافية أو فواتير الخدمات العامة:</strong>
            <p className="text-sm font-semibold text-foreground leading-6">{fees}</p>
          </div>
        )}

        {!hasAnyCustomPolicy && (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <strong className="block text-xs text-muted-foreground mb-1">سياسة التدخين والحيوانات الأليفة:</strong>
              <p className="text-sm font-semibold text-foreground leading-6">التدخين غير مسموح به في الغرف المغلقة · الحيوانات الأليفة تتطلب مراجعة مسبقة لشركاء السكن المعتمدين.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <strong className="block text-xs text-muted-foreground mb-1">مبلغ التأمين وحفظ الودائع:</strong>
              <p className="text-sm font-semibold text-foreground leading-6">يُدفع تأمين معادل لقيمة شهر واحد ويُسترد بالكامل عند إخلاء الوحدة السكنية دون حدوث أي تلفيات متعمدة.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <strong className="block text-xs text-muted-foreground mb-1">سياسة الزيارات والضيوف:</strong>
              <p className="text-sm font-semibold text-foreground leading-6">يُسمح باستقبال الزوار من أقارب الدرجة الأولى في أوقات الهدوء شريطة التنسيق الكامل والمسؤول مع شركاء الإقامة بالوحدة.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <strong className="block text-xs text-muted-foreground mb-1">سياسة مكاني العامة للإقامة الآمنة:</strong>
              <p className="text-sm font-semibold text-foreground leading-6">يُلتزم باحترام مواعيد الهدوء، العناية بسلامة الأجهزة والمرافق العامة للوحدة، والامتناع التام عن الممارسات التي تخالف مبادئ التعايش السلمي.</p>
            </div>
          </>
        )}
      </div>
    </section>

    {/* 9. ما يقوله الطلاب وتقييماتهم */}
    <section className="section-rule mt-7 pt-6 border-t border-border">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-lg font-bold">آراء وتقييمات الطلاب</h3>
        <span className="text-sm font-semibold text-primary">التقييم الإجمالي: ٤٫٧/٥ بناءً على ٤٨ تقييم</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {reviews.map((review) => (
          <div className="rounded-xl bg-muted/60 p-4" key={review.name}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${review.color}`}>
                {review.initials}
              </span>
              <div>
                <strong className="block text-sm">{review.name}</strong>
                <span className="text-[10px] text-muted-foreground">{review.university}</span>
              </div>
              <span className="mr-auto text-xs text-amber-500">★★★★★</span>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">“{review.quote}”</p>
          </div>
        ))}
      </div>
    </section>
  </div>
  
  {/* شريط الإجراءات والـ CTA أسفل تفاصيل العقار */}
  <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:flex-row sm:justify-end sm:p-4">
    <button onClick={onAI} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary py-3 text-sm font-bold text-primary hover:bg-primary/10 sm:flex-none sm:px-5" data-testid="button-open-ai">
      <Sparkles size={17} />
      إيجاد شريك سكن بالذكاء الاصطناعي
    </button>
    <button 
      onClick={() => {
        if (availablePlaces > 0) {
          onBook();
        }
      }} 
      disabled={availablePlaces <= 0}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold sm:flex-none sm:px-7 ${
        availablePlaces > 0 
          ? "bg-primary text-primary-foreground hover:-translate-y-0.5" 
          : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
      }`} 
      data-testid="button-open-booking"
    >
      <CalendarDays size={17} />
      {availablePlaces > 0 ? "احجز الآن" : "غير متاح — مكتملة"}
    </button>
  </div>
</Modal>;
}

function CoffeeIcon() { return <span className="text-sm font-bold">ق</span>; }

function AIFlow({ onClose, openToast }: { onClose: () => void; openToast: (t: string) => void }) {
  const [step, setStep] = useState(1); const [sleep, setSleep] = useState("مرن"); const [clean, setClean] = useState(4); const [study, setStudy] = useState("هادئ جداً"); const [smoke, setSmoke] = useState("لا"); const [pets, setPets] = useState("غير مقبول"); const [budget, setBudget] = useState("١٥٠٠ جنيه");
  const [message, setMessage] = useState("تحليل أنماط السلوك...");
  useEffect(() => { if (step !== 2) return; const messages = ["تحليل أنماط السلوك...", "معالجة بيانات ١٢,٠٠٠ طالب...", "إيجاد أفضل تطابق...", "حساب نسبة التوافق..."]; let i = 0; const interval = window.setInterval(() => { i = (i + 1) % messages.length; setMessage(messages[i]); }, 500); const timeout = window.setTimeout(() => setStep(3), 2200); return () => { clearInterval(interval); clearTimeout(timeout); }; }, [step]);
  const choices = (label: string, values: string[], value: string, set: (v: string) => void) => <div><p className="mb-2 text-sm font-bold">{label}</p><div className="flex flex-wrap gap-2">{values.map((v) => <button key={v} onClick={() => set(v)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${value === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`} data-testid={`ai-choice-${label}-${v}`}>{v}</button>)}</div></div>;
  return <Modal onClose={onClose} label="مطابقة شريك السكن"><div className="p-5 pt-14 sm:p-8 sm:pt-14">
    <div className="mb-7 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary"><Sparkles size={25} /></div><h2 className="text-2xl font-extrabold">شريك سكن يشبهك</h2><p className="mt-1 text-sm text-muted-foreground">أخبرنا عن يومك، ونجد لك التوافق الأقرب</p></div>
    {step === 1 && <div className="space-y-6">{choices("مواعيد النوم", ["نهاري", "ليلي", "مرن"], sleep, setSleep)}<div><div className="mb-2 flex justify-between text-sm font-bold"><span>مستوى النظافة</span><span className="text-primary">{clean} / ٥</span></div><input type="range" min="1" max="5" value={clean} onChange={(e) => setClean(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" data-testid="input-cleanliness" /><div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>مرن</span><span>دقيق جداً</span></div></div>{choices("بيئة المذاكرة", ["هادئ جداً", "موسيقى هادئة", "مرن"], study, setStudy)}{choices("التدخين", ["نعم", "لا"], smoke, setSmoke)}{choices("الحيوانات الأليفة", ["مقبول", "غير مقبول"], pets, setPets)}<label className="block text-sm font-bold">الميزانية القصوى<select value={budget} onChange={(e) => setBudget(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-3 text-sm font-normal" data-testid="select-ai-budget"><option>٨٠٠ جنيه</option><option>١٥٠٠ جنيه</option><option>٣٠٠٠ جنيه</option><option>أكثر من ٣٠٠٠ جنيه</option></select></label><button onClick={() => setStep(2)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-bold text-primary-foreground" data-testid="button-ai-analyze"><Sparkles size={17} />تحليل بالذكاء الاصطناعي</button></div>}
    {step === 2 && <div className="flex min-h-[330px] flex-col items-center justify-center text-center"><div className="mb-6 h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" /><h3 className="text-xl font-bold">{message}</h3><p className="mt-2 text-sm text-muted-foreground">نقارن تفضيلاتك مع مجتمع مكاني</p></div>}
    {step === 3 && <div><div className="mb-6 flex flex-col items-center text-center"><div className="score-ring flex h-36 w-36 items-center justify-center rounded-full [--score:94%]" style={{ "--score": "94%" } as CSSProperties}><div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-background"><strong className="text-3xl text-primary">٩٤٪</strong><span className="text-[11px] text-muted-foreground">توافق</span></div></div><span className="mt-4 rounded-full bg-primary/15 px-4 py-2 text-sm font-bold text-primary">توافق ممتاز</span></div><div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-700 font-bold text-white">م أ</span><div><strong className="block">مريم أحمد</strong><span className="text-xs text-muted-foreground">جامعة كفر الشيخ · طب بشري</span></div><ShieldCheck className="mr-auto text-primary" size={19} /></div><div className="space-y-3">{[["مستوى النظافة", "٨٥٪", "٩٠٪"], ["مواعيد النوم", "٧٠٪", "٧٥٪"], ["بيئة المذاكرة", "٩٥٪", "٨٨٪"], ["الالتزام المالي", "١٠٠٪", "٩٥٪"]].map(([label, you, match]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><span className="text-muted-foreground">أنت {you} · مريم {match}</span></div><div className="flex gap-1"><div className="h-2 rounded-full bg-primary" style={{ width: you }} /><div className="h-2 rounded-full bg-accent/50" style={{ width: match }} /></div></div>)}</div><div className="mt-7 flex gap-2"><button onClick={() => { openToast("تم إرسال طلب السكن المشترك إلى مريم"); onClose(); }} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-bold text-primary-foreground" data-testid="button-send-roommate"><Send size={16} />إرسال طلب سكن مشترك</button><button onClick={() => setStep(1)} className="rounded-lg border border-border px-4 text-muted-foreground" aria-label="البحث مجدداً" data-testid="button-retry-ai"><RefreshCw size={17} /></button></div></div>}
  </div></Modal>;
}

function BookingFlow({ property, onClose, openToast }: { property: Property; onClose: () => void; openToast: (t: string) => void }) {
  const [step, setStep] = useState(1); const [payment, setPayment] = useState<"paymob" | "fawry">("paymob"); const [processing, setProcessing] = useState(false);
  const pay = () => { setProcessing(true); window.setTimeout(() => { setProcessing(false); setStep(3); }, 2100); };
  return <Modal onClose={onClose} label="حجز الوحدة"><div className="p-5 pt-14 sm:p-8 sm:pt-14">
    <div className="mb-7"><div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground"><span className={step >= 1 ? "text-primary" : ""}>١ الباقة</span><div className="mx-2 h-px flex-1 bg-border" /><span className={step >= 2 ? "text-primary" : ""}>٢ الدفع</span><div className="mx-2 h-px flex-1 bg-border" /><span className={step >= 3 ? "text-primary" : ""}>٣ التأكيد</span></div></div>
    {step === 1 && <div><div className="mb-5 rounded-xl border-2 border-primary bg-primary/5 p-5"><div className="flex items-start justify-between"><div><span className="flex items-center gap-1 text-sm font-bold text-primary"><Crown size={16} />باقة مكاني السنوية</span><p className="mt-3 text-sm text-muted-foreground line-through">١,٢٠٠ جنيه</p><strong className="text-3xl">٥٠٠ <small className="text-sm font-semibold">جنيه / سنة</small></strong></div><span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">وفّر ٥٨٪</span></div><div className="mt-4 rounded-lg bg-background/70 p-3 text-xs leading-6"><strong>إيجار الوحدة المختارة: {formatPrice(property.pricePerMonth)} جنيه / شهر</strong><span className="block text-muted-foreground">يُدفع لاحقاً للمالك، منفصل عن رسوم الباقة.</span></div></div><div className="mb-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{["0% عمولة سماسرة طوال العام", "مطابقة ذكية غير محدودة لشركاء السكن", "التحقق الموثق من الوحدات السكنية", "خصم 20% على خدمات النظافة الشهرية", "إدارة مالية وعقود إلكترونية آمنة", "أولوية الحجز للوحدات الجديدة", "دعم عملاء 24/7"].map((x) => <span className="flex items-center gap-2" key={x}><Check size={15} className="shrink-0 text-primary" />{x}</span>)}</div><div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">ملاحظة مهمة:</strong> المبلغ المدفوع الآن هو رسوم باقة مكاني فقط. بعد الدفع سيتم توقيع العقد الإلكتروني فوراً، ويُدفع إيجار الوحدة مباشرة عند استلامها في موعد التسليم المتفق عليه.</div><button onClick={() => setStep(2)} className="w-full rounded-lg bg-primary py-3.5 font-bold text-primary-foreground" data-testid="button-booking-next">المتابعة للدفع<ArrowLeft className="mr-2 inline" size={17} /></button></div>}
    {step === 2 && <div><div className="mb-5 rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-sm"><span>باقة مكاني السنوية</span><strong>٥٠٠ جنيه</strong></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted-foreground"><span>إيجار الوحدة الشهري</span><span>{formatPrice(property.pricePerMonth)} جنيه <small>(يُستحق لاحقاً)</small></span></div></div><div className="mb-4 grid gap-3 sm:grid-cols-2"><button onClick={() => setPayment("paymob")} className={`rounded-xl border p-4 text-right ${payment === "paymob" ? "border-primary bg-primary/5" : "border-border"}`} data-testid="button-payment-paymob"><div className="mb-3 flex items-center justify-between"><span className="font-extrabold text-sky-600">Paymob</span><span className={`h-4 w-4 rounded-full border-4 ${payment === "paymob" ? "border-primary" : "border-border"}`} /></div><p className="text-xs text-muted-foreground">بطاقة بنكية / محفظة إلكترونية</p></button><button onClick={() => setPayment("fawry")} className={`rounded-xl border p-4 text-right ${payment === "fawry" ? "border-primary bg-primary/5" : "border-border"}`} data-testid="button-payment-fawry"><div className="mb-3 flex items-center justify-between"><span className="font-extrabold text-amber-600">Fawry</span><span className={`h-4 w-4 rounded-full border-4 ${payment === "fawry" ? "border-primary" : "border-border"}`} /></div><p className="text-xs text-muted-foreground">ادفع في أي منفذ فوري</p></button></div>{payment === "paymob" ? <div className="space-y-3"><input inputMode="numeric" placeholder="رقم البطاقة" className="w-full rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-number" /><div className="grid grid-cols-2 gap-3"><input placeholder="تاريخ الانتهاء" className="rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-expiry" /><input placeholder="CVV" className="rounded-lg border border-border bg-card px-3 py-3 text-sm outline-none focus:border-primary" data-testid="input-card-cvv" /></div></div> : <div className="rounded-xl bg-muted p-4 text-sm"><p className="mb-2 text-muted-foreground">اذهب لأقرب منفذ فوري وادفع الكود خلال ٢٤ ساعة</p><div className="flex items-center justify-between rounded-lg bg-background px-3 py-3"><strong className="tracking-widest">FWR-847291</strong><button onClick={() => { navigator.clipboard?.writeText("FWR-847291"); openToast("تم نسخ كود فوري"); }} className="text-primary" aria-label="نسخ كود فوري" data-testid="button-copy-fawry"><Copy size={16} /></button></div></div>}<button onClick={pay} disabled={processing} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-70" data-testid="button-complete-payment">{processing ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />جاري معالجة الدفع بأمان...</> : <><LockKeyhole size={17} />إتمام الدفع</>}</button></div>}
    {step === 3 && <div className="py-3 text-center"><div className="mx-auto mb-5 flex h-20 w-20 animate-[toast-in_.5s_ease_both] items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500"><Check size={43} /></div><h2 className="text-2xl font-extrabold">تم الدفع بنجاح!</h2><p className="mt-2 text-sm text-muted-foreground">عضويتك سارية حتى: ديسمبر ٢٠٢٥</p><div className="mx-auto mt-6 max-w-sm rounded-xl bg-card p-4 text-right text-sm"><div className="mb-3 flex justify-between"><span className="text-muted-foreground">رقم العملية</span><strong>TXN-MKN-20241201-00847</strong></div><div className="border-t border-border pt-3 leading-6"><strong>موعد استلام الوحدة المتوقع: {property.availableFrom}</strong><span className="mt-1 block text-xs text-muted-foreground">سيتم تسليم المفاتيح ودفع الإيجار الشهري مباشرة للمالك في هذا الموعد.</span></div></div><div className="mt-6 flex flex-col gap-2 sm:flex-row"><button onClick={() => openToast("تم تجهيز العقد الإلكتروني للتحميل")} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-3 text-sm font-bold" data-testid="button-download-contract"><Download size={16} />تحميل العقد الإلكتروني</button><button onClick={onClose} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground" data-testid="button-view-saved"><HomeIcon size={16} />استعرض وحداتك المحفوظة</button></div></div>}
  </div></Modal>;
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) { return <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"><span className="rounded-lg bg-primary/10 p-2.5 text-primary">{icon}</span><div><strong className="block text-xl">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div></div>; }

function Hero({ onSearch, onAI }: { onSearch: (c: string, t: string, b: string) => void; onAI: () => void }) {
  const { user } = useUser();
  return <section id="home" className="hero-wash mkany-grid relative overflow-hidden border-b border-border">
    <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
      <div className="max-w-3xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-bold text-primary">
          <Sparkles size={14} />سكن طلابي موثّق بالذكاء الاصطناعي
        </div>
        
        <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.35] tracking-tight sm:text-6xl">
          اسكن بذكاء،<br /><span className="text-primary">ادرس بثقة</span>
        </h1>

        {/* النبذة التعريفية الرسمية لـ MKANY */}
        <div className="mt-5 max-w-2xl rounded-2xl border border-primary/20 bg-card/70 p-4 backdrop-blur-sm shadow-sm text-right">
          <p className="text-sm font-semibold leading-7 text-foreground">
            <span className="font-extrabold text-primary">مكاني</span> هي المنصة الذكية الأولى المتخصصة في تأمين وسكن الطلاب بجامعات مصر، تقدم وحدات موثقة، مطابقة ذكية، وعقود إلكترونية آمنة تضمن حقوق الطرفين.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2 space-x-reverse">
            {["س", "م", "ن", "ع", "ي"].map((x, i) => (
              <span key={x} className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white ${["bg-teal-700", "bg-rose-700", "bg-amber-700", "bg-indigo-700", "bg-cyan-700"][i]}`}>{x}</span>
            ))}
          </div>
          <SignedOut>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">انضم لـ +١٢,٠٠٠ طالب مصري ·</span>
              <SignUpButton mode="modal">
                <button className="text-xs font-bold text-primary hover:underline" data-testid="hero-signup-trigger">سجّل كطالب الآن مجاناً 🚀</button>
              </SignUpButton>
            </div>
          </SignedOut>
          <SignedIn>
            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
              <ShieldCheck size={15} />أهلاً بك يا {user?.fullName?.split(" ")[0]}، حسابك كطالب موثّق ({user?.university || "طالب مكاني"})
            </span>
          </SignedIn>
        </div>
      </div>
      <SearchBox onSearch={onSearch} />
      <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-primary" />وحدات متحقق منها</span>
        <span className="flex items-center gap-2"><Sparkles size={15} className="text-primary" />مطابقة ذكية</span>
        <span className="flex items-center gap-2"><LockKeyhole size={15} className="text-primary" />عقود إلكترونية آمنة</span>
        <button onClick={onAI} className="flex items-center gap-2 text-primary hover:underline" data-testid="button-hero-ai"><Sparkles size={15} />جرّب المطابقة مجاناً</button>
      </div>
    </div>
  </section>;
}

function Stats() { return <section className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8"><Stat icon={<Building2 />} value="٢,٤٠٠+" label="وحدة سكنية مُتحقق منها" /><Stat icon={<GraduationCap />} value="١٢,٠٠٠+" label="طالب مسجّل" /><Stat icon={<Heart />} value="٩٨٪" label="نسبة رضا الطلاب" /><Stat icon={<CircleDollarSign />} value="٠٪" label="عمولة سماسرة" /></section>; }

function HowItWorks() { const steps: Array<[string, string, string, ComponentType<{ size?: number }>]> = [["٠١", "أنشئ حسابك مجاناً", "سجّل في دقيقة واحدة، واكتب تفضيلاتك لتجربة أدق.", UserRound], ["٠٢", "اكتشف وحدات موثّقة", "فلتر حسب الجامعة، الميزانية، والمواصفات التي تهمك.", SlidersHorizontal], ["٠٣", "احجز بأمان بدون عمولة", "وقّع العقد إلكترونياً وادفع بثقة، والإيجار للمالك مباشرة.", FileText]]; return <section id="how" className="border-y border-border bg-card/40"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="mb-10 max-w-lg"><p className="mb-2 text-sm font-bold text-primary">من البحث إلى المفتاح</p><h2 className="text-3xl font-extrabold sm:text-4xl">ثلاث خطوات، وبيت أقرب</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">صممنا كل خطوة لتكون مفهومة، موثّقة، ومن غير مفاجآت في الطريق.</p></div><div className="grid gap-4 md:grid-cols-3">{steps.map(([num, title, text, Icon]) => <div key={num} className="relative rounded-2xl border border-border bg-background p-6 flex flex-col justify-between"><span className="text-xs font-bold text-primary">{num}</span><div><div className="my-6 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon size={21} /></div><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p></div>{num === "٠١" && <SignedOut><SignUpButton mode="modal"><button className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline text-right" data-testid="button-howitworks-signup">افتح نافذة التسجيل الآن ←</button></SignUpButton></SignedOut>}</div>)}</div></div></section>; }

function Testimonials({ index, setIndex }: { index: number; setIndex: (n: number) => void }) { const data = [{ name: "ملك إبراهيم", university: "جامعة كفر الشيخ", initials: "م إ", quote: "وفّرت ٨٠٠ جنيه في السنة وعشت قريب من الكلية بدون ضغط", color: "bg-rose-700" }, { name: "عبد الرحمن حسن", university: "جامعة المنصورة", initials: "ع ح", quote: "الذكاء الاصطناعي طابقني مع صاحبي المثالي، زي ما اخترت بيدي", color: "bg-teal-700" }, { name: "سلمى ياسر", university: "جامعة طنطا", initials: "س ي", quote: "أول مرة أحجز غرفة بعقد حقيقي من غير سمسار", color: "bg-indigo-700" }]; const t = data[index]; return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8"><div className="rounded-3xl border border-border bg-card p-6 sm:p-10"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-bold text-primary">من مجتمع مكاني</p><h2 className="text-3xl font-extrabold">السكن الصح يغيّر يومك</h2></div><div className="flex gap-2">{data.map((_, i) => <button key={i} onClick={() => setIndex(i)} className={`h-2 rounded-full ${index === i ? "w-8 bg-primary" : "w-2 bg-muted-foreground/40"}`} aria-label={`التقييم ${i + 1}`} data-testid={`button-testimonial-${i}`} />)}</div></div><div className="mt-10 flex max-w-3xl items-start gap-4"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${t.color}`}>{t.initials}</span><div><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><strong className="text-lg">{t.name}</strong><span className="text-xs text-muted-foreground">{t.university}</span><span className="text-sm tracking-widest text-amber-500">★★★★★</span></div><blockquote className="mt-5 text-xl font-semibold leading-9 sm:text-2xl">“{t.quote}”</blockquote></div></div></div></section>; }

function Footer({ 
  openToast, 
  onGoOwnersPublic, 
  onGoOwnerDashboard, 
  onGoStudentDashboard,
}: { 
  openToast: (t: string) => void;
  onGoOwnersPublic: () => void;
  onGoOwnerDashboard: () => void;
  onGoStudentDashboard: () => void;
}) { 
  const { user } = useUser();
  const isStudent = user?.role === "student";
  const isOwner = user?.role === "owner";

  return <footer className="border-t border-border bg-card/50"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><img src={logo} alt="مكاني" className="logo-mark mb-3 h-16 w-16 object-contain" /><p className="text-sm font-semibold">اسكن بذكاء، ادرس بثقة</p><p className="mt-3 max-w-xs text-xs leading-6 text-muted-foreground">مكاني هي المنصة الذكية الأولى المتخصصة في تأمين وسكن الطلاب بجامعات مصر، تقدم وحدات موثقة، مطابقة ذكية، وعقود إلكترونية آمنة تضمن حقوق الطرفين.</p><div className="mt-5 flex gap-2 text-muted-foreground"><button onClick={() => openToast("تابعنا على إنستجرام")} aria-label="إنستجرام" data-testid="button-instagram"><Instagram size={17} /></button><button onClick={() => openToast("تابعنا على لينكدإن")} aria-label="لينكدإن" data-testid="button-linkedin"><Linkedin size={17} /></button><button onClick={() => openToast("تابعنا على فيسبوك")} aria-label="فيسبوك" data-testid="button-facebook"><Facebook size={17} /></button></div></div>
  <div><h3 className="mb-4 text-sm font-bold">المنصة</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={() => openToast("تصفح الوحدات المتاحة")} className="block text-right hover:text-primary">اكتشف السكن</button><button onClick={() => openToast("جرب مطابقة شركاء السكن بالذكاء الاصطناعي")} className="block text-right hover:text-primary">المطابقة الذكية</button>
  {!isOwner && (
    <button onClick={onGoStudentDashboard} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-student-dashboard">لوحة الطالب وحجوزاتي</button>
  )}
  </div></div>
  {!isStudent && (
    <div><h3 className="mb-4 text-sm font-bold">بوابة الملاك</h3><div className="space-y-3 text-xs text-muted-foreground">
      <button onClick={onGoOwnersPublic} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-owners-public">تفاصيل خدمات الملاك (الانضمام)</button>
      <button onClick={onGoOwnerDashboard} className="block text-right hover:text-primary" data-testid="footer-link-owner-dashboard">لوحة تحكم المالك (Dashboard)</button>
      <button onClick={() => openToast("رسوم الإدراج السنوية ١,٠٠٠ جنيه فقط لكل وحدة شاملة المعاينة والتصوير 360°")} className="block text-right hover:text-primary">رسوم الإدراج والباقات</button>
    </div></div>
  )}
  <div><h3 className="mb-4 text-sm font-bold">الدعم والشركة</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={() => openToast("مركز مساعدة مكاني متاح على مدار الساعة عبر الواتساب: 01055332242")} className="block text-right hover:text-primary">مركز المساعدة والواتساب</button><button onClick={() => openToast("فريق الدعم: support@mkany.eg")} className="block text-right hover:text-primary">تواصل معنا</button><button onClick={() => openToast("تقرير السوق متاح للمستثمرين المسجلين")} className="block text-right hover:text-primary">تقرير السوق للمستثمرين <LockKeyhole className="inline" size={11} /></button></div></div>
  </div><div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><LockKeyhole size={13} className="text-primary" />SSL آمن</span><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><FileText size={13} className="text-primary" />رخصة رقم EG-2024-PROP</span><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><Crown size={13} className="text-amber-500" />أفضل ناشئة ٢٠٢٤</span></div><div className="mt-6 flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row"><span>© ٢٠٢٤ مكاني — جميع الحقوق محفوظة</span><span>صنع للطلاب والملاك في مصر</span></div></div></footer>; 
}

function AppContent() {
  const { user, isSignedIn } = useUser();
  const showOnboarding = Boolean(isSignedIn && user && isOnboardingRequired(user));
  const [light, setLight] = useState(false); 
  const [activeView, setActiveView] = useState<ActiveViewType>("listings"); 
  const [location, setLocation] = useLocation();

  const onboardingMode: "student" | "owner" =
    activeView === "ownerPublic" || activeView === "ownerDashboard" || location.startsWith("/owner") || location.startsWith("/owners")
      ? "owner"
      : "student";

  // مزامنة مسار URL مع العرض النشط عند التحميل أو الانتقال المباشر
  useEffect(() => {
    if (location === "/student" || location === "/student/dashboard") {
      setActiveView("studentDashboard");
    } else if (location === "/owner" || location === "/owner/dashboard") {
      setActiveView("ownerDashboard");
    } else if (location === "/owners") {
      setActiveView("ownerPublic");
    } else if (location === "/" || location === "/apartments") {
      setActiveView("listings");
    }
  }, [location]);

  // حماية المسارات الصارمة بناءً على دور المستخدم المعتمد من قاعدة البيانات
  useEffect(() => {
    if (!isSignedIn || !user) return;

    if (user.role === "student" && activeView === "ownerDashboard") {
      setActiveView("studentDashboard");
      setLocation("/student/dashboard");
      setToast("غير مصرح لطلاب الجامعات بزيارة لوحة المالك");
    } else if (user.role === "owner" && activeView === "studentDashboard") {
      setActiveView("ownerDashboard");
      setLocation("/owner/dashboard");
    }
  }, [user?.role, activeView, isSignedIn]);
  const [platformProperties, setPlatformProperties] = useState<PlatformProperty[]>(() => getAllPlatformProperties());
  const [selected, setSelected] = useState<Property | null>(null); 
  const [saved, setSaved] = useState<number[]>([]); 
  const [aiOpen, setAiOpen] = useState(false); 
  const [bookingOpen, setBookingOpen] = useState(false); 
  const [bookingSelectedDate, setBookingSelectedDate] = useState<string | undefined>(undefined);
  const [filterTab, setFilterTab] = useState<"all" | "available" | "top">("all"); 
  const [query, setQuery] = useState({ 
    city: "", 
    type: "", 
    budget: "", 
    text: "", 
    availableOnly: false, 
    sort: "newest" 
  }); 
  const [toast, setToast] = useState(""); 
  const [testimonial, setTestimonial] = useState(0);
  const [studentTab, setStudentTab] = useState<"bookings" | "favorites" | "profile" | "support">("bookings");

  const refreshProperties = () => {
    setPlatformProperties(getAllPlatformProperties());
  };

  useEffect(() => { 
    document.documentElement.classList.toggle("light", light); 
  }, [light]);

  useEffect(() => { 
    const timer = window.setInterval(() => setTestimonial((n) => (n + 1) % 3), 3000); 
    return () => clearInterval(timer); 
  }, []);

  useEffect(() => { 
    if (!toast) return; 
    const t = window.setTimeout(() => setToast(""), 2800); 
    return () => clearTimeout(t); 
  }, [toast]);

  // مزامنة العقارات من الخادم عند بدء تشغيل التطبيق لتحديث الأماكن الشاغرة والحجوزات الحية
  useEffect(() => {
    syncPlatformPropertiesFromApi();
  }, []);

  // مستمع تحديث بيانات العقارات ومسافات المنطقة المحيطة فوراً
  useEffect(() => {
    const handlePropsUpdated = () => {
      setPlatformProperties(getAllPlatformProperties());
    };
    window.addEventListener("mkany_properties_updated", handlePropsUpdated);
    return () => window.removeEventListener("mkany_properties_updated", handlePropsUpdated);
  }, []);

  // تحديث نافذة التفاصيل المفتوحة تلقائياً إذا عُدلت بياناتها من الآدمن
  useEffect(() => {
    if (selected) {
      const updated = platformProperties.find((p) => p.id === selected.id);
      if (updated) {
        setSelected(updated as any);
      }
    }
  }, [platformProperties]);

  const shown = useMemo(() => {
    let list = platformProperties.filter((p) => { 
      // CRITICAL SECURITY RULE: Students and public users MUST ONLY see "متاح" (approved & available) properties.
      if (p.status !== "متاح") return false;

      // Text search query matching
      const qText = (query.text || "").trim().toLowerCase();
      if (qText) {
        const matches = 
          p.title.toLowerCase().includes(qText) || 
          p.city.toLowerCase().includes(qText) || 
          p.university.toLowerCase().includes(qText) || 
          p.address.toLowerCase().includes(qText) || 
          (p.description && p.description.toLowerCase().includes(qText));
        if (!matches) return false;
      }

      // City / University filter
      if (query.city && !(p.university === query.city || p.city === query.city)) return false; 

      // Room Type filter
      if (query.type) {
        const cleanType = query.type.replace("شقة مشتركة", "شقة");
        if (!p.roomType.includes(cleanType)) return false;
      }

      // Budget filter
      if (query.budget) {
        if (query.budget.includes("٨٠٠")) {
          if (p.pricePerMonth >= 800) return false;
        } else if (query.budget.includes("١٥٠٠")) {
          if (p.pricePerMonth < 800 || p.pricePerMonth > 1500) return false;
        } else if (query.budget.includes("أكثر")) {
          if (p.pricePerMonth <= 3000) return false;
        } else {
          if (p.pricePerMonth <= 1500) return false;
        }
      }

      // Filter tabs
      const avail = p.availablePlaces ?? Math.max(0, p.bedrooms - p.currentRoommates);
      if (filterTab === "available" && avail <= 0) return false;
      if (filterTab === "top" && p.livabilityScore < 87) return false;

      // Available places only toggle
      if (query.availableOnly && avail <= 0) return false;

      return true; 
    });

    // Sorting order logic
    if (query.sort === "price_asc") {
      list.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
    } else if (query.sort === "price_desc") {
      list.sort((a, b) => b.pricePerMonth - a.pricePerMonth);
    } else if (query.sort === "livability") {
      list.sort((a, b) => b.livabilityScore - a.livabilityScore);
    } else {
      list.sort((a, b) => b.id - a.id);
    }

    return list;
  }, [platformProperties, query, filterTab]);

  // جلب وتحديث مفضلة الطالب من قاعدة بيانات PostgreSQL
  useEffect(() => {
    if (isSignedIn && user?.role === "student") {
      getStudentFavoritesApi().then((res) => {
        setSaved(res.propertyIds);
      });
    } else {
      setSaved([]);
    }
  }, [isSignedIn, user?.role]);

  // مستمع تحديث المفضلة عبر النوافذ أو الإجراءات المختلفة
  useEffect(() => {
    const handleFavUpdated = () => {
      if (isSignedIn && user?.role === "student") {
        getStudentFavoritesApi().then((res) => {
          setSaved(res.propertyIds);
        });
      }
    };
    window.addEventListener("mkany_favorites_updated", handleFavUpdated);
    return () => window.removeEventListener("mkany_favorites_updated", handleFavUpdated);
  }, [isSignedIn, user?.role]);

  const search = (city: string, type: string, budget: string, text?: string, availableOnly?: boolean, sort?: string) => { 
    setActiveView("listings"); 
    setQuery({ 
      city, 
      type, 
      budget, 
      text: text || "", 
      availableOnly: Boolean(availableOnly), 
      sort: sort || "newest" 
    }); 
    window.setTimeout(() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }), 20); 
  };

  const toggleSave = async (id: number) => {
    if (!isSignedIn) {
      setToast("يرجى تسجيل الدخول بحساب طالب لحفظ العقارات في المفضلة");
      return;
    }

    if (user?.role === "owner") {
      setToast("قائمة المفضلة مخصصة لحسابات الطلاب فقط");
      return;
    }

    const isCurrentlySaved = saved.includes(id);

    // تحديث تفاؤلي سريع للواجهة (Optimistic UI)
    setSaved((prev) => (isCurrentlySaved ? prev.filter((item) => item !== id) : [...prev, id]));

    if (isCurrentlySaved) {
      const res = await removeFavoriteApi(id);
      if (res.success) {
        setToast("تمت إزالة الوحدة من المفضلة");
        window.dispatchEvent(new CustomEvent("mkany_favorites_updated"));
      } else {
        // التراجع في حال حدوث خطأ
        setSaved((prev) => [...prev, id]);
        setToast(res.message || "فشل في إزالة العقار من المفضلة");
      }
    } else {
      const res = await addFavoriteApi(id);
      if (res.success) {
        setToast("تمت إضافة الوحدة إلى المفضلة بنجاح ❤️");
        window.dispatchEvent(new CustomEvent("mkany_favorites_updated"));
      } else {
        // التراجع في حال حدوث خطأ
        setSaved((prev) => prev.filter((item) => item !== id));
        setToast(res.message || "فشل في إضافة العقار للمفضلة");
      }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header 
        light={light} 
        onTheme={() => setLight((x) => !x)} 
        activeView={activeView} 
        setView={setActiveView} 
        openToast={setToast}
        savedCount={saved.length}
        studentTab={studentTab}
        setStudentTab={setStudentTab}
      />

      {activeView === "listings" && (
        <>
          <Hero onSearch={search} onAI={() => setAiOpen(true)} />
          <Stats />
          <main id="discover" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-bold text-primary">مختارات تناسب يومك</p>
                <h2 className="text-3xl font-extrabold">وحدات موثّقة للطلاب</h2>
                <p className="mt-2 text-sm text-muted-foreground">{shown.length} وحدات متاحة حول جامعات مصر</p>
              </div>
              <div className="flex rounded-lg border border-border bg-card p-1 text-xs font-bold">
                <button onClick={() => setFilterTab("all")} className={`rounded-md px-3 py-2 ${filterTab === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-all">الكل</button>
                <button onClick={() => setFilterTab("available")} className={`rounded-md px-3 py-2 ${filterTab === "available" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-available">متاح الآن</button>
                <button onClick={() => setFilterTab("top")} className={`rounded-md px-3 py-2 ${filterTab === "top" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`} data-testid="tab-top-rated">الأكثر تقييماً</button>
              </div>
            </div>

            {shown.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((p) => (
                  <PropertyCard key={p.id} property={p} saved={saved.includes(p.id)} onSave={() => toggleSave(p.id)} onOpen={() => setSelected(p)} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border py-16 text-center">
                <Search className="mx-auto mb-4 text-muted-foreground" size={30} />
                <h3 className="font-bold">لم نجد وحدات بهذه المواصفات</h3>
                <p className="mt-2 text-sm text-muted-foreground">جرّب تغيير المدينة أو الميزانية</p>
                <button onClick={() => setQuery({ city: "", type: "", budget: "", text: "", availableOnly: false, sort: "newest" })} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-reset-search">إظهار كل الوحدات</button>
              </div>
            )}
          </main>
          <HowItWorks />
          <Testimonials index={testimonial} setIndex={setTestimonial} />
          <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="hero-wash rounded-3xl border border-primary/20 p-7 sm:p-12">
              <div className="max-w-2xl">
                <span className="mb-3 flex items-center gap-2 text-sm font-bold text-primary"><Zap size={16} />مع مكاني، القرار أسهل</span>
                <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">مش بس غرفة.<br />مساحة تبدأ فيها مستقبلك.</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">نوصل الطلاب بوحدات حقيقية وملاك موثّقين، ونستخدم البيانات عشان نخلي سوق السكن أكثر عدلاً للجميع.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-cta-discover">ابدأ البحث الآن</button>
                  <SignedOut>
                    <SignUpButton mode="modal">
                      <button className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-bold text-foreground hover:bg-muted" data-testid="button-cta-signup">إنشاء حساب طالب موثّق</button>
                    </SignUpButton>
                  </SignedOut>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeView === "studentDashboard" && (
        <StudentDashboard 
          openToast={setToast}
          onExploreProperties={() => setActiveView("listings")}
          onViewPropertyModal={(p: unknown) => setSelected(p as Property)}
          initialTab={studentTab}
        />
      )}

      {activeView === "ownerPublic" && (
        <OwnerPublicView 
          onGoToDashboard={() => setActiveView("ownerDashboard")} 
          onOpenToast={setToast}
          onGoToStudentListings={() => setActiveView("listings")}
        />
      )}

      {activeView === "ownerDashboard" && (
        <OwnerDashboard 
          openToast={setToast} 
          onViewPublicServices={() => setActiveView("ownerPublic")}
          onViewPropertyModal={(p) => setSelected(p as Property)}
        />
      )}

      <Footer 
        openToast={setToast} 
        onGoOwnersPublic={() => setActiveView("ownerPublic")}
        onGoOwnerDashboard={() => setActiveView("ownerDashboard")}
        onGoStudentDashboard={() => setActiveView("studentDashboard")}
      />

      {selected && (
        <PropertyDetail 
          property={selected} 
          onClose={() => setSelected(null)} 
          onAI={() => setAiOpen(true)} 
          onBook={(date?: string) => {
            setBookingSelectedDate(date);
            setBookingOpen(true);
          }} 
          saved={saved.includes(selected.id)}
          onSave={() => toggleSave(selected.id)}
        />
      )}
      {aiOpen && <AIFlow onClose={() => setAiOpen(false)} openToast={setToast} />}
      
      {/* تدفق رفع الإيصال والربط الفوري بالواتساب بدلاً من نافذة الدفع التقليدية */}
      {bookingOpen && selected && (
        <BookingReceiptFlow 
          property={selected} 
          initialAppointmentDate={bookingSelectedDate}
          onClose={() => setBookingOpen(false)} 
          openToast={setToast}
          onGoToStudentDashboard={() => {
            setBookingOpen(false);
            setActiveView("studentDashboard");
          }}
          onSuccess={() => {
            syncPlatformPropertiesFromApi();
          }}
        />
      )}

      <OnboardingModal isOpen={showOnboarding} mode={onboardingMode} onToast={setToast} />



      {toast && <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-3 text-xs font-bold shadow-xl" role="status" data-testid="toast-message"><Check size={16} className="text-primary" />{toast}</div>}
    </div>
  );
}

function RootRouter() {
  const [location] = useLocation();

  // مسار الآدمن المستقل والمشفر
  const isAdminPath =
    location === "/admin" ||
    location.startsWith("/admin/") ||
    location === "/admin-secure-portal" ||
    location.startsWith("/admin-secure-portal");

  if (isAdminPath) {
    return <AdminSecurePortalPage />;
  }

  // الواجهة العامة الرئيسية للموقع (الطلاب والملاك وتصفح الوحدات)
  return <AppContent />;
}

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkAuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ErrorBoundary resetKey="/">
              <RootRouter />
            </ErrorBoundary>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ClerkAuthProvider>
    </QueryClientProvider>
  );
}

export default App;