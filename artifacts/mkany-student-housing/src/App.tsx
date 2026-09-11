import { useEffect, useMemo, useState, type CSSProperties, type ReactNode, type ComponentType } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Heart, Search, Menu, X, Moon, Sun, ShieldCheck, ChevronDown, MapPin, GraduationCap, Sparkles, ArrowLeft, Ruler, BedDouble, Bath, Users, Building2, CalendarDays, Wifi, Sofa, Star, Check, LockKeyhole, Plus, BarChart3, Eye, Clock3, SlidersHorizontal, MessageCircle, FileText, Send, RefreshCw, Copy, Download, Home as HomeIcon, UserRound, Zap, Instagram, Linkedin, Facebook, Sparkle, CircleDollarSign, Crown } from "lucide-react";
import { Router as WouterRouter, Route, Switch, useLocation } from "wouter";
import { 
  ClerkAuthProvider, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  SignedIn, 
  SignedOut, 
  useUser 
} from "@/components/auth/clerk-auth";
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
  NearbyAmenities
} from "@/lib/inspections-store";
import { InteractiveLeafletMap } from "@/components/map/InteractiveLeafletMap";
const logo = "/mkany-logo.png";

type ActiveViewType = "listings" | "studentDashboard" | "ownerPublic" | "ownerDashboard";

type Property = {
  id: number; title: string; address: string; city: string; university: string; pricePerMonth: number;
  roomType: string; areaSqm: number; bedrooms: number; bathrooms: number; floor: string; furnishing: string;
  availableFrom: string; currentRoommates: number; images: string[]; video360Url: string | null;
  verified: boolean; premium: boolean; livabilityScore: number; status: "متاح" | "مشغول" | "قيد المراجعة";
};

const properties: Property[] = [
  { id: 1, title: "غرفة مضيئة قرب الجلاء", address: "شارع الجلاء، كفر الشيخ", city: "كفر الشيخ", university: "جامعة كفر الشيخ", pricePerMonth: 950, roomType: "غرفة مزدوجة", areaSqm: 105, bedrooms: 3, bathrooms: 2, floor: "الثالث", furnishing: "مفروشة بالكامل", availableFrom: "١ سبتمبر ٢٠٢٤", currentRoommates: 2, images: ["https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4", verified: true, premium: true, livabilityScore: 87, status: "متاح" },
  { id: 2, title: "شقة هادئة للطالبات", address: "شارع النباوي المهندس، كفر الشيخ", city: "كفر الشيخ", university: "جامعة كفر الشيخ", pricePerMonth: 750, roomType: "غرفة في شقة", areaSqm: 120, bedrooms: 4, bathrooms: 2, floor: "الرابع", furnishing: "مفروشة بالكامل", availableFrom: "١٥ أغسطس ٢٠٢٤", currentRoommates: 3, images: ["https://images.pexels.com/photos/157811/pexels-photo-157811.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: null, verified: true, premium: false, livabilityScore: 92, status: "متاح" },
  { id: 3, title: "استوديو جيهان العصري", address: "شارع جيهان، المنصورة", city: "المنصورة", university: "جامعة المنصورة", pricePerMonth: 1200, roomType: "استوديو", areaSqm: 55, bedrooms: 1, bathrooms: 1, floor: "الثاني", furnishing: "مفروشة بالكامل", availableFrom: "١ أكتوبر ٢٠٢٤", currentRoommates: 0, images: ["https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: null, verified: true, premium: true, livabilityScore: 95, status: "متاح" },
  { id: 4, title: "بيت الطلبة على شارع الجامعة", address: "شارع الجامعة، طنطا", city: "طنطا", university: "جامعة طنطا", pricePerMonth: 850, roomType: "غرفة مزدوجة", areaSqm: 98, bedrooms: 3, bathrooms: 2, floor: "الخامس", furnishing: "مفروشة جزئياً", availableFrom: "١ سبتمبر ٢٠٢٤", currentRoommates: 2, images: ["https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: null, verified: true, premium: false, livabilityScore: 84, status: "متاح" },
  { id: 5, title: "شقة كاملة في ميت خميس", address: "ميت خميس، المنصورة", city: "المنصورة", university: "جامعة المنصورة", pricePerMonth: 1800, roomType: "شقة كاملة", areaSqm: 145, bedrooms: 3, bathrooms: 2, floor: "الأول", furnishing: "مفروشة بالكامل", availableFrom: "١ أغسطس ٢٠٢٤", currentRoommates: 0, images: ["https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/2029698/pexels-photo-2029698.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/2062431/pexels-photo-2062431.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: null, verified: true, premium: true, livabilityScore: 89, status: "مشغول" },
  { id: 6, title: "سرير اقتصادي قريب من المواصلات", address: "شارع بورسعيد، كفر الشيخ", city: "كفر الشيخ", university: "جامعة كفر الشيخ", pricePerMonth: 650, roomType: "سرير في غرفة مشتركة", areaSqm: 88, bedrooms: 4, bathrooms: 2, floor: "الثاني", furnishing: "مفروشة بالكامل", availableFrom: "١ أغسطس ٢٠٢٤", currentRoommates: 3, images: ["https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=1200", "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=1200"], video360Url: null, verified: true, premium: false, livabilityScore: 81, status: "متاح" },
];

const services = [
  ["أقرب مستشفى", "٥٠٠م", "٨ دقائق مشياً", "4.5"], ["صيدلية", "١٥٠م", "دقيقتان", "5.0"], ["سوبرماركت", "٣٠٠م", "٥ دقائق", "4.2"],
  ["محطة مواصلات", "٢٠٠م", "٣ دقائق", "4.0"], ["بوابة الجامعة", "١٫٢كم", "١٥ دقيقة", "4.8"], ["كافيه / مطعم", "١٠٠م", "دقيقة واحدة", "4.6"],
];
const reviews = [
  { name: "سارة محمود", university: "جامعة كفر الشيخ", initials: "سم", color: "bg-teal-700", quote: "المكان مطابق للصور جداً، والأهم إن كل تفاصيل العقد كانت واضحة من البداية." },
  { name: "يوسف خالد", university: "جامعة المنصورة", initials: "يك", color: "bg-amber-700", quote: "قرب السكن من البوابة وفر عليّ وقت ومواصلات كل يوم. تجربة مريحة فعلاً." },
  { name: "نورهان علي", university: "جامعة طنطا", initials: "نع", color: "bg-indigo-700", quote: "تواصلت مع المالك مباشرة وحجزت من غير لف ولا عمولة سمسار." },
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

function Header({ 
  light, 
  onTheme, 
  activeView, 
  setView, 
  openToast,
  onSecretAdminTrigger,
}: { 
  light: boolean; 
  onTheme: () => void; 
  activeView: ActiveViewType; 
  setView: (v: ActiveViewType) => void; 
  openToast: (t: string) => void;
  onSecretAdminTrigger: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const { user } = useUser();
  const go = (id: string) => { setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); };

  const handleLogoClick = () => {
    setView("listings");
    go("home");
    setLogoClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        onSecretAdminTrigger();
        return 0;
      }
      return next;
    });
    setTimeout(() => setLogoClicks(0), 3000);
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
          <button onClick={() => setView("ownerPublic")} className={`hover:text-primary transition-colors ${activeView === "ownerPublic" ? "text-primary font-bold" : ""}`} data-testid="link-owners">للملاك</button>
          <button onClick={() => { setView("listings"); go("how"); }} className="hover:text-primary transition-colors" data-testid="link-about">كيف تعمل مكاني؟</button>
        </nav>
        <div className="flex items-center gap-2.5">
          <button onClick={onTheme} className="rounded-full border border-border p-2.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors" aria-label={light ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"} data-testid="button-theme-toggle">{light ? <Moon size={18} /> : <Sun size={18} />}</button>

          {/* أزرار مخصصة حسب دور المستخدم المسجل */}
          <SignedIn>
            {/* زر لوحة الطالب وحجوزاته */}
            <button
              onClick={() => setView("studentDashboard")}
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                activeView === "studentDashboard"
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              }`}
              data-testid="header-button-student-dashboard"
            >
              <FileText size={15} />
              حجوزاتي وبياناتي
            </button>

            {/* زر لوحة المالك فقط إذا كان مسجلاً كمالك */}
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
              <div className="hidden xl:flex flex-col text-right leading-tight">
                <span className="text-xs font-bold text-foreground">
                  أهلاً بك، {user?.fullName?.split(" ")[0]} 👋
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {user?.role === "owner" ? "مالك عقارات موثق" : user?.role === "admin" ? "فريق المعاينة والتوثيق" : user?.university || "طالب مكاني"}
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
            <button onClick={() => { setView("listings"); go("discover"); }} className="text-right hover:text-primary" data-testid="mobile-link-discover">اكتشف السكن</button>
            
            <SignedIn>
              <button 
                onClick={() => { setView("studentDashboard"); setMenuOpen(false); }} 
                className="text-right text-primary flex items-center gap-2" 
                data-testid="mobile-link-student-dashboard"
              >
                <FileText size={16} />
                حجوزاتي وبياناتي (لوحة الطالب)
              </button>

              {user?.role === "owner" && (
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

            <button onClick={() => { setView("ownerPublic"); setMenuOpen(false); }} className="text-right hover:text-primary" data-testid="mobile-link-owners">للملاك (تفاصيل الخدمات والانضمام)</button>
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

function SearchBox({ onSearch }: { onSearch: (city: string, type: string, budget: string) => void }) {
  const [city, setCity] = useState(""); const [type, setType] = useState(""); const [budget, setBudget] = useState(""); const [quick, setQuick] = useState("");
  const submit = () => onSearch(city, type, budget);
  const field = (label: string, value: string, set: (v: string) => void, options: string[]) => <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-right text-xs font-semibold text-muted-foreground"><span>{label}</span><div className="relative"><select value={value} onChange={(e) => set(e.target.value)} className="w-full appearance-none rounded-lg border border-border bg-background/80 px-3 py-3 pl-8 text-sm font-semibold text-foreground outline-none focus:border-primary" data-testid={`select-${label}` }><option value="">الكل</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute left-3 top-3.5 text-muted-foreground" /></div></label>;
  return <div className="hero-ring mx-auto mt-8 max-w-5xl rounded-2xl bg-card/80 p-3 backdrop-blur-md sm:p-5" data-testid="search-panel">
    <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end">
      {field("المدينة / الجامعة", city, setCity, ["جامعة كفر الشيخ", "جامعة طنطا", "جامعة المنصورة", "جامعة الإسكندرية", "جامعة دمياط"])}
      {field("نوع السكن", type, setType, ["غرفة فردية", "غرفة مزدوجة", "استوديو", "شقة مشتركة"])}
      {field("الميزانية الشهرية", budget, setBudget, ["أقل من ٨٠٠ جنيه", "٨٠٠-١٥٠٠ جنيه", "١٥٠٠-٣٠٠٠ جنيه", "أكثر من ٣٠٠٠ جنيه"])}
      <button onClick={submit} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3.5 font-bold text-primary-foreground hover:-translate-y-0.5" data-testid="button-search"><Search size={18} />ابحث الآن</button>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3"><span className="ml-1 text-xs text-muted-foreground">اختيارات سريعة</span>{["قريب من الجامعة", "واي فاي مجاني", "مفروش بالكامل", "بنات فقط", "0% عمولة"].map((chip) => <button key={chip} onClick={() => { setQuick(quick === chip ? "" : chip); onSearch(city, type, budget); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${quick === chip ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`} data-testid={`filter-chip-${chip}`}>{chip}</button>)}</div>
  </div>;
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
      <div className="mb-3 flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-2.5 py-1.5 text-[11px]" data-testid={`card-amenities-${property.id}`}>
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <GraduationCap size={13} className="text-primary" />
          بوابة الجامعة: {cardAmenities.universityGate.distance} ({cardAmenities.universityGate.time})
        </span>
        <span className="text-[10px] font-bold text-primary">
          مواصلات: {cardAmenities.transportation.distance}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Ruler size={13} />{property.areaSqm}م²</span><span className="flex items-center gap-1"><BedDouble size={13} />{property.bedrooms} غرف</span><span className="flex items-center gap-1"><Bath size={13} />{property.bathrooms} حمامات</span><span className="flex items-center gap-1"><Users size={13} />{property.currentRoommates} شركاء</span></div>
      <div className="mb-3"><div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">مؤشر جودة الحياة</span><span className="font-bold text-primary">{property.livabilityScore}/100</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${property.livabilityScore}%` }} /></div></div>
      <div className="mb-3 flex items-center gap-1 text-[11px] font-semibold text-primary"><ShieldCheck size={13} />0% عمولة سماسرة</div>
      <button onClick={onOpen} className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 py-2.5 text-sm font-bold text-primary hover:bg-primary hover:text-primary-foreground" data-testid={`button-details-${property.id}`}>عرض التفاصيل<ArrowLeft size={16} /></button>
    </div>
  </article>;
}

function PropertyDetail({ property, onClose, onAI, onBook }: { property: Property; onClose: () => void; onAI: () => void; onBook: () => void }) {
  const [media, setMedia] = useState<"photos" | "video">("photos"); const [photo, setPhoto] = useState(0);
  const [selectedAmenityKey, setSelectedAmenityKey] = useState<keyof NearbyAmenities | null>("universityGate");
  const facts: Array<[ComponentType<{ size?: number; className?: string }>, string, string]> = [[Ruler, "المساحة", `${property.areaSqm} م²`], [BedDouble, "عدد الغرف", `${property.bedrooms}`], [Bath, "الحمامات", `${property.bathrooms}`], [Building2, "الدور", property.floor], [Sofa, "نوع الفرش", property.furnishing], [CalendarDays, "تاريخ التوفر", property.availableFrom], [Users, "الشركاء الحاليون", `${property.currentRoommates}`]];
  
  // بيانات الخدمات والمنطقة المحيطة الديناميكية المعتمدة من الآدمن
  const effectiveAmenities = useMemo(() => {
    return getEffectiveAmenities(property as any);
  }, [property]);

  const dynamicAmenities = useMemo(() => {
    return getAmenitiesDisplayList(effectiveAmenities, (property as any).lat, (property as any).lng);
  }, [effectiveAmenities, property]);

  return <Modal onClose={onClose} wide label={`تفاصيل ${property.title}`}><div className="p-4 pt-14 sm:p-7 sm:pt-14">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin size={15} className="text-primary" />{property.address}</p><h2 className="text-2xl font-extrabold sm:text-3xl">{property.title}</h2></div><div className="text-left"><strong className="text-2xl text-primary">{formatPrice(property.pricePerMonth)} <small className="text-sm font-semibold">جنيه / شهر</small></strong><p className="text-xs text-muted-foreground">إيجار الوحدة فقط</p></div></div>
    <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="relative h-64 sm:h-[390px]">{media === "photos" ? <ImageWithFallback src={property.images[photo]} alt={property.title} className="h-full w-full object-cover" testId="img-detail-main" /> : property.video360Url ? <video src={property.video360Url} className="h-full w-full object-cover" controls autoPlay muted data-testid="video-tour" /> : <div className="hero-wash flex h-full flex-col items-center justify-center gap-3 text-center"><Sparkles className="text-primary" size={35} /><strong>معاينة تخيلية للجولة</strong><span className="text-xs text-muted-foreground">هذه الوحدة لا تحتوي على فيديو 360° حقيقي بعد</span></div>}<div className="absolute right-3 top-3 flex overflow-hidden rounded-lg border border-white/20 bg-slate-950/65 p-1 text-xs font-bold text-white"><button onClick={() => setMedia("photos")} className={`rounded-md px-3 py-2 ${media === "photos" ? "bg-primary text-primary-foreground" : ""}`} data-testid="button-media-photos">صور</button><button onClick={() => setMedia("video")} className={`rounded-md px-3 py-2 ${media === "video" ? "bg-primary text-primary-foreground" : ""}`} data-testid="button-media-video">جولة 360°</button></div></div><div className="flex gap-2 overflow-x-auto p-3">{property.images.map((img, i) => <button key={img} onClick={() => { setPhoto(i); setMedia("photos"); }} className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 ${photo === i && media === "photos" ? "border-primary" : "border-transparent"}`} data-testid={`button-thumbnail-${i}`}><ImageWithFallback src={img} alt="" className="h-full w-full object-cover" /></button>)}</div></div>
    <section className="section-rule mt-7 pt-6"><h3 className="mb-4 text-lg font-bold">تفاصيل الوحدة</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{facts.map(([Icon, label, value]) => <div className="rounded-lg border border-border bg-card p-3" key={label}><Icon size={17} className="mb-2 text-primary" /><span className="block text-[11px] text-muted-foreground">{label}</span><strong className="text-sm">{value}</strong></div>)}</div></section>
    
    {/* كل ما تحتاجه حولك: خريطة OpenStreetMap و Leaflet تفاعلية مجانية 100% */}
    <section className="section-rule mt-7 pt-6" data-testid="section-nearby-amenities">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">الخريطة والخدمات المحيطة بالعقار</h3>
          <p className="text-xs text-muted-foreground">تصفح مسافات الشوارع وأوقات السير مجاناً عبر OpenStreetMap و Leaflet.js</p>
        </div>
        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
          OpenStreetMap & Leaflet ✓
        </span>
      </div>

      {/* المكون التفاعلي لخريطة Leaflet المجانية */}
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

      {/* بطاقات الخدمات التفاعلية */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {dynamicAmenities.map((item) => {
          const isSelected = selectedAmenityKey === item.key;
          return (
            <div 
              className={`flex items-center gap-3 rounded-xl border p-3 shadow-xs cursor-pointer transition-all ${
                isSelected 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40" 
                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
              }`} 
              key={item.key} 
              onClick={() => setSelectedAmenityKey(item.key)}
              data-testid={`amenity-item-${item.key}`}
            >
              <div className={`rounded-lg p-2.5 shrink-0 ${isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                {item.categoryName.includes("جامعة") ? <GraduationCap size={18} /> : item.categoryName.includes("مطعم") || item.categoryName.includes("كافيه") ? <CoffeeIcon /> : <MapPin size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <strong className="block text-sm text-foreground">{item.categoryName}</strong>
                  {isSelected && <span className="text-[10px] font-bold text-primary">المسار نشط 📍</span>}
                </div>
                <span className="text-[11px] text-muted-foreground block">{item.distance} · {item.time}</span>
                {item.name && <span className="block text-[10px] text-primary font-medium truncate mt-0.5">{item.name}</span>}
              </div>
              <span className="text-[11px] font-bold text-amber-500 shrink-0">{item.rating || "4.8"} / ٥</span>
            </div>
          );
        })}
      </div>
    </section>

    <section className="section-rule mt-7 pt-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><h3 className="text-lg font-bold">ماذا يقول الطلاب؟</h3><span className="text-sm font-semibold text-primary">التقييم الإجمالي: ٤٫٧/٥ بناءً على ٤٨ تقييم</span></div><div className="grid gap-3 md:grid-cols-3">{reviews.map((review) => <div className="rounded-xl bg-muted/60 p-4" key={review.name}><div className="mb-3 flex items-center gap-2"><span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${review.color}`}>{review.initials}</span><div><strong className="block text-sm">{review.name}</strong><span className="text-[10px] text-muted-foreground">{review.university}</span></div><span className="mr-auto text-xs text-amber-500">★★★★★</span></div><p className="text-xs leading-6 text-muted-foreground">“{review.quote}”</p></div>)}</div></section>
  </div><div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background/95 p-3 backdrop-blur sm:flex-row sm:justify-end sm:p-4"><button onClick={onAI} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary py-3 text-sm font-bold text-primary hover:bg-primary/10 sm:flex-none sm:px-5" data-testid="button-open-ai"><Sparkles size={17} />إيجاد شريك سكن بالذكاء الاصطناعي</button><button onClick={onBook} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground hover:-translate-y-0.5 sm:flex-none sm:px-7" data-testid="button-open-booking"><CalendarDays size={17} />احجز الآن</button></div></Modal>;
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
  return <footer className="border-t border-border bg-card/50"><div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"><div><img src={logo} alt="مكاني" className="logo-mark mb-3 h-16 w-16 object-contain" /><p className="text-sm font-semibold">اسكن بذكاء، ادرس بثقة</p><p className="mt-3 max-w-xs text-xs leading-6 text-muted-foreground">مكاني هي المنصة الذكية الأولى المتخصصة في تأمين وسكن الطلاب بجامعات مصر، تقدم وحدات موثقة، مطابقة ذكية، وعقود إلكترونية آمنة تضمن حقوق الطرفين.</p><div className="mt-5 flex gap-2 text-muted-foreground"><button onClick={() => openToast("تابعنا على إنستجرام")} aria-label="إنستجرام" data-testid="button-instagram"><Instagram size={17} /></button><button onClick={() => openToast("تابعنا على لينكدإن")} aria-label="لينكدإن" data-testid="button-linkedin"><Linkedin size={17} /></button><button onClick={() => openToast("تابعنا على فيسبوك")} aria-label="فيسبوك" data-testid="button-facebook"><Facebook size={17} /></button></div></div>
  <div><h3 className="mb-4 text-sm font-bold">المنصة</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={() => openToast("تصفح الوحدات المتاحة")} className="block text-right hover:text-primary">اكتشف السكن</button><button onClick={() => openToast("جرب مطابقة شركاء السكن بالذكاء الاصطناعي")} className="block text-right hover:text-primary">المطابقة الذكية</button><button onClick={onGoStudentDashboard} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-student-dashboard">لوحة الطالب وحجوزاتي</button></div></div>
  <div><h3 className="mb-4 text-sm font-bold">بوابة الملاك</h3><div className="space-y-3 text-xs text-muted-foreground">
    <button onClick={onGoOwnersPublic} className="block text-right text-primary font-bold hover:underline" data-testid="footer-link-owners-public">تفاصيل خدمات الملاك (الانضمام)</button>
    <button onClick={onGoOwnerDashboard} className="block text-right hover:text-primary" data-testid="footer-link-owner-dashboard">لوحة تحكم المالك (Dashboard)</button>
    <button onClick={() => openToast("رسوم الإدراج السنوية ١,٠٠٠ جنيه فقط لكل وحدة شاملة المعاينة والتصوير 360°")} className="block text-right hover:text-primary">رسوم الإدراج والباقات</button>
  </div></div>
  <div><h3 className="mb-4 text-sm font-bold">الدعم والشركة</h3><div className="space-y-3 text-xs text-muted-foreground"><button onClick={() => openToast("مركز مساعدة مكاني متاح على مدار الساعة عبر الواتساب: 01055332242")} className="block text-right hover:text-primary">مركز المساعدة والواتساب</button><button onClick={() => openToast("فريق الدعم: support@mkany.eg")} className="block text-right hover:text-primary">تواصل معنا</button><button onClick={() => openToast("تقرير السوق متاح للمستثمرين المسجلين")} className="block text-right hover:text-primary">تقرير السوق للمستثمرين <LockKeyhole className="inline" size={11} /></button></div></div>
  </div><div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><LockKeyhole size={13} className="text-primary" />SSL آمن</span><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><FileText size={13} className="text-primary" />رخصة رقم EG-2024-PROP</span><span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5"><Crown size={13} className="text-amber-500" />أفضل ناشئة ٢٠٢٤</span></div><div className="mt-6 flex flex-col justify-between gap-2 text-xs text-muted-foreground sm:flex-row"><span>© ٢٠٢٤ مكاني — جميع الحقوق محفوظة</span><span>صنع للطلاب والملاك في مصر</span></div></div></footer>; 
}

function AppContent() {
  const [light, setLight] = useState(false); 
  const [activeView, setActiveView] = useState<ActiveViewType>("listings"); 
  const [, setLocation] = useLocation();
  const [platformProperties, setPlatformProperties] = useState<PlatformProperty[]>(() => getAllPlatformProperties());
  const [selected, setSelected] = useState<Property | null>(null); 
  const [saved, setSaved] = useState<number[]>([]); 
  const [aiOpen, setAiOpen] = useState(false); 
  const [bookingOpen, setBookingOpen] = useState(false); 
  const [filterTab, setFilterTab] = useState<"all" | "available" | "top">("all"); 
  const [query, setQuery] = useState({ city: "", type: "", budget: "" }); 
  const [toast, setToast] = useState(""); 
  const [testimonial, setTestimonial] = useState(0);

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

  // مستمع اختصار الكيبورد السري للآدمن الشبح (Ctrl + Shift + A أو Alt + Shift + M)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === "a" || e.key === "A" || e.code === "KeyA")) ||
        (e.altKey && e.shiftKey && (e.key === "m" || e.key === "M" || e.code === "KeyM"))
      ) {
        e.preventDefault();
        setLocation("/admin-secure-portal");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // مستمع عنوان الهاش السري (#mkany-admin أو #stealth-admin)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === "#mkany-admin" || window.location.hash === "#stealth-admin") {
        setLocation("/admin-secure-portal");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const shown = useMemo(() => platformProperties.filter((p) => { 
    const cityOkay = !query.city || p.university === query.city; 
    const typeOkay = !query.type || p.roomType.includes(query.type.replace("شقة مشتركة", "شقة")); 
    const budgetOkay = !query.budget || (query.budget.includes("٨٠٠") ? p.pricePerMonth < 800 : query.budget.includes("١٥٠٠") ? p.pricePerMonth >= 800 && p.pricePerMonth <= 1500 : query.budget.includes("أكثر") ? p.pricePerMonth > 3000 : p.pricePerMonth > 1500); 
    const tabOkay = filterTab === "all" || (filterTab === "available" ? p.status === "متاح" : p.livabilityScore >= 87); 
    return cityOkay && typeOkay && budgetOkay && tabOkay; 
  }), [platformProperties, query, filterTab]);

  const search = (city: string, type: string, budget: string) => { 
    setActiveView("listings"); 
    setQuery({ city, type, budget }); 
    window.setTimeout(() => document.getElementById("discover")?.scrollIntoView({ behavior: "smooth" }), 20); 
  };

  const toggleSave = (id: number) => setSaved((x) => x.includes(id) ? x.filter((i) => i !== id) : [...x, id]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Header 
        light={light} 
        onTheme={() => setLight((x) => !x)} 
        activeView={activeView} 
        setView={setActiveView} 
        openToast={setToast}
        onSecretAdminTrigger={() => setLocation("/admin-secure-portal")}
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
                <button onClick={() => setQuery({ city: "", type: "", budget: "" })} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground" data-testid="button-reset-search">إظهار كل الوحدات</button>
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

      {selected && <PropertyDetail property={selected} onClose={() => setSelected(null)} onAI={() => setAiOpen(true)} onBook={() => setBookingOpen(true)} />}
      {aiOpen && <AIFlow onClose={() => setAiOpen(false)} openToast={setToast} />}
      
      {/* تدفق رفع الإيصال والربط الفوري بالواتساب بدلاً من نافذة الدفع التقليدية */}
      {bookingOpen && selected && (
        <BookingReceiptFlow 
          property={selected} 
          onClose={() => setBookingOpen(false)} 
          openToast={setToast}
          onGoToStudentDashboard={() => {
            setBookingOpen(false);
            setActiveView("studentDashboard");
          }}
        />
      )}



      {toast && <div className="toast-in fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-3 text-xs font-bold shadow-xl" role="status" data-testid="toast-message"><Check size={16} className="text-primary" />{toast}</div>}
    </div>
  );
}

function RootRouter() {
  const [location] = useLocation();
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const search = typeof window !== "undefined" ? window.location.search : "";

  // مسار الآدمن المستقل والمشفر
  const isAdminPath =
    location === "/admin-secure-portal" ||
    location.startsWith("/admin-secure-portal") ||
    hash.includes("admin-secure-portal") ||
    search.includes("admin-secure-portal");

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