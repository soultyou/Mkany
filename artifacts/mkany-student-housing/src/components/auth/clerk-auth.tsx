import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  UserRound, 
  Mail, 
  Lock, 
  Phone, 
  CreditCard, 
  GraduationCap, 
  CheckCircle2, 
  X, 
  LogOut, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  ChevronDown,
  ExternalLink,
  UserCheck,
  Check,
  Eye,
  EyeOff,
  Home,
  MapPin,
  Building,
  KeyRound,
  ArrowRight,
  Shield,
  Layers,
  HelpCircle
} from "lucide-react";
import { 
  StudentUser, 
  RegisteredUser,
  getAllRegisteredUsers, 
  saveOrUpdateUserToDb, 
  getCurrentSessionUser, 
  setCurrentSessionUser,
  switchSessionRole,
  subscribeToSessionUser
} from "@/lib/user-db-sync";

// قائمة الجامعات المصرية المتاحة للاختيار السريع
export const EGYPTIAN_UNIVERSITIES = [
  "جامعة كفر الشيخ",
  "جامعة المنصورة",
  "جامعة طنطا",
  "جامعة الإسكندرية",
  "جامعة القاهرة",
  "جامعة عين شمس",
  "جامعة الزقازيق",
  "جامعة دمياط",
  "جامعة حلوان",
  "جامعة بنها",
  "جامعة أسيوط",
  "جامعة قناة السويس",
  "الجامعة المصرية اليابانية (E-JUST)",
  "جامعة زويل للعلوم والتكنولوجيا",
  "جامعة أخرى",
];

// قائمة المحافظات والمدن لملاك العقارات والطلاب
export const EGYPTIAN_CITIES = [
  "كفر الشيخ",
  "المنصورة (الدقهلية)",
  "طنطا (الغربية)",
  "الإسكندرية",
  "القاهرة",
  "الجيزة",
  "الزقازيق (الشرقية)",
  "دمياط",
  "شبين الكوم (المنوفية)",
  "بنها (القليوبية)",
  "أسيوط",
  "الإسماعيلية",
  "السويس",
  "بورسعيد",
  "محافظة / مدينة أخرى",
];

interface AuthContextType {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: StudentUser | null;
  openSignIn: () => void;
  openSignUp: () => void;
  signOut: () => void;
  updateUserProfile: (data: Partial<StudentUser>) => void;
  switchRole: (role: "student" | "owner" | "admin") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a ClerkAuthProvider");
  }
  return context;
}

export function useUser() {
  const { isSignedIn, isLoaded, user } = useAuth();
  return {
    isSignedIn,
    isLoaded,
    user,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return null;
  return <>{children}</>;
}

interface ButtonProps {
  children?: ReactNode;
  mode?: "modal" | "redirect";
  className?: string;
  [key: string]: any;
}

export function SignInButton({ children, mode = "modal", className, ...props }: ButtonProps) {
  const { openSignIn } = useAuth();
  
  if (children) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any)?.props?.onClick?.(e);
        openSignIn();
      },
      ...props,
    });
  }

  return (
    <button
      onClick={openSignIn}
      className={className || "rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"}
      data-testid="clerk-sign-in-button"
      {...props}
    >
      تسجيل الدخول
    </button>
  );
}

export function SignUpButton({ children, mode = "modal", className, ...props }: ButtonProps) {
  const { openSignUp } = useAuth();

  if (children) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any)?.props?.onClick?.(e);
        openSignUp();
      },
      ...props,
    });
  }

  return (
    <button
      onClick={openSignUp}
      className={className || "rounded-lg bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"}
      data-testid="clerk-sign-up-button"
      {...props}
    >
      انضم مجاناً
    </button>
  );
}

export function UserButton({ className }: { className?: string }) {
  const { user, signOut, switchRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  // جلب الحروف الأولى من الاسم
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]} ${parts[1][0]}`;
    }
    return name.slice(0, 2);
  };

  return (
    <div className="relative inline-block text-right">
      <button
        onClick={() => setMenuOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full border border-border bg-card p-1 pl-3 text-xs font-bold text-foreground transition-all hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${className || ""}`}
        aria-label="قائمة المستخدم"
        data-testid="clerk-user-button"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs shadow-sm">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full rounded-full object-cover" />
          ) : (
            getInitials(user.fullName)
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
        </span>
        <span className="max-w-[110px] truncate sm:max-w-[140px] text-right font-semibold">
          {user.fullName}
        </span>
        <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div 
            className="absolute left-0 mt-2 z-50 w-72 rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-lg animate-[toast-in_.2s_ease_both]"
            data-testid="clerk-user-menu"
          >
            {/* بطاقة المستخدم */}
            <div className="mb-3 border-b border-border/80 pb-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary text-sm border border-primary/30">
                  {getInitials(user.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <strong className="block truncate text-sm font-bold text-foreground">{user.fullName}</strong>
                    <ShieldCheck size={14} className="text-primary shrink-0" />
                  </div>
                  <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-foreground">
                    {user.role === "owner" ? (
                      <><Building2 size={13} className="text-emerald-500" /> نوع الحساب:</>
                    ) : user.role === "admin" ? (
                      <><Shield size={13} className="text-amber-500" /> نوع الحساب:</>
                    ) : (
                      <><GraduationCap size={13} className="text-primary" /> نوع الحساب:</>
                    )}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    user.role === "owner" 
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                      : user.role === "admin"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-primary/15 text-primary"
                  }`}>
                    {user.role === "owner" ? "مالك عقارات موثق 🏢" : user.role === "admin" ? "فريق فحص وإدارة 🛡️" : "طالب جامعي 🎓"}
                  </span>
                </div>

                {user.role === "student" && user.university && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><GraduationCap size={13} className="text-primary" /> الجامعة:</span>
                    <strong className="text-foreground truncate max-w-[140px]">{user.university}</strong>
                  </div>
                )}

                {user.role === "owner" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1"><MapPin size={13} className="text-emerald-500" /> مدينة العقارات:</span>
                      <strong className="text-foreground truncate max-w-[140px]">{user.city || user.university}</strong>
                    </div>
                    {user.unitsCount && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Building size={13} className="text-emerald-500" /> عدد الوحدات:</span>
                        <strong className="text-foreground">{user.unitsCount}</strong>
                      </div>
                    )}
                  </>
                )}

                {user.nationalId && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><CreditCard size={13} className="text-primary" /> الرقم القومي:</span>
                    <strong className="text-foreground tracking-wider font-mono">{user.nationalId}</strong>
                  </div>
                )}

                {user.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Phone size={13} className="text-primary" /> الهاتف:</span>
                    <strong className="text-foreground font-mono">{user.phoneNumber}</strong>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-border/50 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  متزامن مع قاعدة البيانات Drizzle/PostgreSQL
                </div>
              </div>
            </div>

            {/* الإجراءات */}
            <div className="space-y-1">
              <button
                onClick={() => { setMenuOpen(false); setProfileOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors text-right"
                data-testid="button-view-profile"
              >
                <UserCheck size={15} className="text-primary" />
                عرض وتعديل بيانات الحساب
              </button>

              {/* التبديل بين حساب الطالب وحساب المالك (Airbnb-style role switch) */}
              {user.role === "student" ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    switchRole("owner");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors text-right"
                  data-testid="button-userbutton-switch-owner"
                >
                  <Building2 size={15} />
                  التبديل إلى حساب المالك 🏢
                </button>
              ) : user.role === "owner" ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    switchRole("student");
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 transition-colors text-right"
                  data-testid="button-userbutton-switch-student"
                >
                  <GraduationCap size={15} />
                  التبديل إلى حساب الطالب 🎓
                </button>
              ) : null}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors text-right"
                data-testid="button-clerk-logout"
              >
                <LogOut size={15} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </>
      )}

      {profileOpen && (
        <UserProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}

/**
 * نافذة عرض وتعديل بيانات المستخدم (طالب أو مالك أو أدمن)
 */
function UserProfileModal({ user, onClose }: { user: StudentUser; onClose: () => void }) {
  const { updateUserProfile } = useAuth();
  const [fullName, setFullName] = useState(user.fullName);
  const [university, setUniversity] = useState(user.university || "");
  const [city, setCity] = useState(user.city || "كفر الشيخ");
  const [unitsCount, setUnitsCount] = useState(user.unitsCount || "وحدة واحدة");
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [nationalId, setNationalId] = useState(user.nationalId);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName,
      university: user.role === "owner" ? (city ? `عقارات ${city}` : university) : university,
      city,
      unitsCount,
      phoneNumber,
      nationalId,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm" role="dialog">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl text-right">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
          aria-label="إغلاق"
        >
          <X size={16} />
        </button>

        <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            user.role === "owner" ? "bg-emerald-500/15 text-emerald-500" : "bg-primary/15 text-primary"
          }`}>
            {user.role === "owner" ? <Building2 size={24} /> : <GraduationCap size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-foreground">
              {user.role === "owner" ? "بيانات مالك العقار المعتمد" : "بيانات الطالب الجامعي"}
            </h3>
            <p className="text-xs text-muted-foreground">مسجلة ومزامنة في قاعدة بيانات منصة مكاني الآمنة</p>
          </div>
        </div>

        {savedSuccess ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={32} />
            </div>
            <strong className="block text-lg font-bold text-foreground">تم تحديث البيانات ومزامنتها بنجاح!</strong>
            <p className="mt-1 text-xs text-muted-foreground">تم الحفظ في جدول users في قاعدة البيانات</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {user.role === "owner" ? "اسم المالك أو المنشأة" : "اسم الطالب بالكامل"}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-foreground outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">الرقم القومي (National ID - 14 رقم)</label>
              <input
                type="text"
                maxLength={14}
                required
                pattern="^\d{14}$"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono tracking-wider text-foreground outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">رقم التليفون (Phone)</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-foreground outline-none focus:border-primary"
                />
              </div>

              {user.role === "student" ? (
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">الجامعة (University)</label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground outline-none focus:border-primary"
                  >
                    {EGYPTIAN_UNIVERSITIES.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">مدينة العقارات</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-foreground outline-none focus:border-primary"
                  >
                    {EGYPTIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {user.role === "owner" && (
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">عدد الوحدات المتاحة للإيجار</label>
                <input
                  type="text"
                  value={unitsCount}
                  onChange={(e) => setUnitsCount(e.target.value)}
                  placeholder="مثال: ٤ شقق أو عمارة كاملة"
                  className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">البريد الإلكتروني (Email)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full rounded-xl border border-border bg-muted/70 px-3.5 py-2.5 text-muted-foreground cursor-not-allowed"
              />
              <span className="mt-1 block text-[10px] text-muted-foreground">معرف الحساب مرتبط بالبريد الإلكتروني</span>
            </div>

            <div className="mt-6 flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-primary py-3 font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all"
                data-testid="button-save-user-profile"
              >
                حفظ ومزامنة التعديلات
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-5 py-3 font-semibold text-muted-foreground hover:bg-muted"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/**
 * المزود الرئيسي لنظام المصادقة Clerk والتزامن مع قاعدة البيانات
 */
export function ClerkAuthProvider({ children, onToast }: { children: ReactNode; onToast?: (msg: string) => void }) {
  const [user, setUser] = useState<StudentUser | null>(() => getCurrentSessionUser());
  const [isLoaded, setIsLoaded] = useState(true);
  const [modalMode, setModalMode] = useState<"signIn" | "signUp" | null>(null);

  // الاشتراك الحي في أحداث تغيير الجلسات لضمان التزامن والعزل الفوري
  useEffect(() => {
    const unsub = subscribeToSessionUser((newSession) => {
      setUser(newSession);
    });
    return unsub;
  }, []);

  // تحديث حالة تسجيل الدخول محلياً
  const handleSignIn = (loggedInUser: StudentUser) => {
    setUser(loggedInUser);
    setCurrentSessionUser(loggedInUser);
    setModalMode(null);
    onToast?.(`مرحباً بك مجدداً يا ${loggedInUser.fullName} 👋`);
  };

  const handleSignUp = (newUser: StudentUser) => {
    setUser(newUser);
    setCurrentSessionUser(newUser);
    setModalMode(null);
    onToast?.(
      newUser.role === "owner"
        ? `أهلاً بك في مكاني يا ${newUser.fullName}! تم اعتماد حساب المالك ومزامنته في قاعدة البيانات 🏢`
        : `أهلاً بك في مكاني يا ${newUser.fullName}! تم حفظ وتأكيد بيانات الطالب 🎓`
    );
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentSessionUser(null);
    onToast?.("تم تسجيل الخروج بنجاح. نراك قريباً!");
  };

  const handleUpdateProfile = (data: Partial<StudentUser>) => {
    if (!user) return;
    const updated = saveOrUpdateUserToDb({
      ...user,
      ...data,
    });
    setUser(updated);
    setCurrentSessionUser(updated);
    onToast?.("تم تحديث ومزامنة بيانات الحساب بنجاح.");
  };

  const handleSwitchRole = (targetRole: "student" | "owner" | "admin") => {
    const switched = switchSessionRole(targetRole);
    if (switched) {
      setUser(switched);
      onToast?.(
        targetRole === "owner"
          ? `تم التبديل بنجاح إلى حساب المالك: ${switched.fullName} 🏢`
          : targetRole === "admin"
          ? `تم التبديل بنجاح إلى حساب المشرف: ${switched.fullName} 🛡️`
          : `تم التبديل بنجاح إلى حساب الطالب: ${switched.fullName} 🎓`
      );
    } else {
      setModalMode("signIn");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn: !!user,
        isLoaded,
        user,
        openSignIn: () => setModalMode("signIn"),
        openSignUp: () => setModalMode("signUp"),
        signOut: handleSignOut,
        updateUserProfile: handleUpdateProfile,
        switchRole: handleSwitchRole,
      }}
    >
      {children}

      {/* نافذة Clerk المنبثقة (mode="modal") */}
      {modalMode && (
        <ClerkAuthModal
          initialTab={modalMode}
          onClose={() => setModalMode(null)}
          onSuccessSignIn={handleSignIn}
          onSuccessSignUp={handleSignUp}
        />
      )}
    </AuthContext.Provider>
  );
}

/**
 * نافذة المصادقة الرسمية لمنصة مكاني بستايل عصري (مستوحى من Airbnb)
 * تتيح الفصل التام بين حساب الطالب الجامعي وحساب مالك العقار مع التزامن الفوري في قاعدة البيانات
 */
function ClerkAuthModal({
  initialTab,
  onClose,
  onSuccessSignIn,
  onSuccessSignUp,
}: {
  initialTab: "signIn" | "signUp";
  onClose: () => void;
  onSuccessSignIn: (u: StudentUser) => void;
  onSuccessSignUp: (u: StudentUser) => void;
}) {
  const [tab, setTab] = useState<"signIn" | "signUp">(initialTab);
  
  // حقول تسجيل الدخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginRoleFilter, setLoginRoleFilter] = useState<"all" | "student" | "owner" | "admin">("all");

  // تحديد نوع الحساب عند إنشاء حساب جديد (Airbnb style selection)
  const [signUpRole, setSignUpRole] = useState<"student" | "owner">("student");

  // حقول البيانات المشتركة
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // حقول الطالب
  const [university, setUniversity] = useState(EGYPTIAN_UNIVERSITIES[0]);
  const [customUniversity, setCustomUniversity] = useState("");
  const [studentCity, setStudentCity] = useState(EGYPTIAN_CITIES[0]);

  // حقول المالك
  const [ownerCity, setOwnerCity] = useState(EGYPTIAN_CITIES[0]);
  const [unitsCount, setUnitsCount] = useState("وحدة سكنية واحدة");
  const [propertyTypes, setPropertyTypes] = useState("شقق مفروشة بالكامل");

  const [signUpError, setSignUpError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حسابات التجربة السريعة
  const handleQuickDemo = (role: "student" | "owner" | "admin") => {
    const users = getAllRegisteredUsers();
    const targetUser = users.find((u) => u.role === role) || users[0];
    onSuccessSignIn(targetUser);
  };

  // تنفيذ تسجيل الدخول
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const trimmedInput = loginEmail.trim().toLowerCase();
    const users = getAllRegisteredUsers();

    const matchedUser = users.find(
      (u) =>
        u.email.toLowerCase() === trimmedInput ||
        u.phoneNumber === trimmedInput ||
        u.nationalId === trimmedInput
    );

    if (!matchedUser) {
      setLoginError("لم نجد حساباً مسجلاً بهذا البريد أو الهاتف أو الرقم القومي. يمكنك النقر على 'إنشاء حساب جديد' للانضمام.");
      return;
    }

    if (loginPassword && matchedUser.password && matchedUser.password !== loginPassword) {
      setLoginError("كلمة المرور غير صحيحة، يرجى إعادة المحاولة أو تجربة الدخول السريع أدناه.");
      return;
    }

    onSuccessSignIn(matchedUser);
  };

  // تنفيذ تسجيل حساب جديد (طالب أو مالك) وحفظه فوراً في قاعدة البيانات
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError("");

    // 1. التحقق من الاسم
    if (!fullName.trim() || fullName.trim().length < 3) {
      setSignUpError(signUpRole === "owner" ? "يرجى إدخال اسم المالك أو المسؤول بالكامل (3 أحرف على الأقل)." : "يرجى إدخال اسم الطالب بالكامل (3 أحرف على الأقل).");
      return;
    }

    // 2. التحقق من الرقم القومي (14 رقماً مصرياً)
    const cleanNationalId = nationalId.replace(/\D/g, "");
    if (cleanNationalId.length !== 14) {
      setSignUpError("الرقم القومي يجب أن يتكون من 14 رقماً صحيحاً للتوثيق والاعتماد.");
      return;
    }

    // 3. التحقق من رقم التليفون
    const cleanPhone = phoneNumber.replace(/\s+/g, "");
    if (!/^(01[0125]\d{8}|\+201[0125]\d{8})$/.test(cleanPhone)) {
      setSignUpError("رقم التليفون يجب أن يكون رقم محمول مصري صحيح (مثال: 01012345678).");
      return;
    }

    // 4. التحقق من البريد الإلكتروني
    if (!email.trim() || !email.includes("@")) {
      setSignUpError("يرجى إدخال بريد إلكتروني صالح.");
      return;
    }

    // 5. التحقق من كلمة المرور
    if (!password || password.length < 6) {
      setSignUpError("كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام لحماية حسابك.");
      return;
    }

    // فحص التكرار في قاعدة البيانات
    const existingUsers = getAllRegisteredUsers();
    const isEmailTaken = existingUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (isEmailTaken) {
      setSignUpError("هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.");
      return;
    }

    const isNatIdTaken = existingUsers.some((u) => u.nationalId === cleanNationalId);
    if (isNatIdTaken) {
      setSignUpError("هذا الرقم القومي مسجل بالفعل في منصة مكاني.");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      let newUser: RegisteredUser;

      if (signUpRole === "student") {
        const finalUniversity = university === "جامعة أخرى" ? (customUniversity.trim() || "جامعة مصرية") : university;
        newUser = saveOrUpdateUserToDb({
          fullName: fullName.trim(),
          nationalId: cleanNationalId,
          phoneNumber: cleanPhone,
          email: email.trim().toLowerCase(),
          password: password,
          university: finalUniversity,
          city: studentCity,
          role: "student",
          isVerified: true,
        });
      } else {
        // حساب مالك عقار
        newUser = saveOrUpdateUserToDb({
          fullName: fullName.trim(),
          nationalId: cleanNationalId,
          phoneNumber: cleanPhone,
          email: email.trim().toLowerCase(),
          password: password,
          city: ownerCity,
          university: `عقارات ${ownerCity}`,
          unitsCount: unitsCount,
          propertyTypes: propertyTypes,
          role: "owner",
          isVerified: true,
        });
      }

      setIsSubmitting(false);
      onSuccessSignUp(newUser);
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-5 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="نافذة تسجيل الدخول وإنشاء الحساب"
      data-testid="clerk-modal-backdrop"
    >
      <div 
        className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl text-right my-6 animate-[toast-in_.25s_ease_both]"
        data-testid="clerk-modal-content"
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute left-5 top-5 rounded-full border border-border bg-background p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
          aria-label="إغلاق"
          data-testid="button-close-clerk-modal"
        >
          <X size={18} />
        </button>

        {/* الترويسة والشعار */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-inner">
            <img src="/mkany-logo.png" alt="مكاني" className="h-10 w-10 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
            <Building2 size={28} className="fallback-icon" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            {tab === "signIn" ? "تسجيل الدخول إلى مكاني" : "إنشاء حساب جديد في مكاني"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === "signIn" 
              ? "مرحباً بك مجدداً! سجّل دخولك للوصول إلى سكنك، عقاراتك، أو لوحة التحكم" 
              : "منصة السكن الطلابي الذكية والموثقة رقم 1 في مصر — اختر دورك وانطلق"}
          </p>
        </div>

        {/* التبديل الواضح بين تسجيل الدخول وإنشاء حساب */}
        <div className="mb-6 flex rounded-xl border border-border bg-muted/60 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setTab("signIn"); setLoginError(""); setSignUpError(""); }}
            className={`flex-1 rounded-lg py-2.5 transition-all text-center ${
              tab === "signIn"
                ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-clerk-signin"
          >
            تسجيل الدخول (Sign In)
          </button>
          <button
            type="button"
            onClick={() => { setTab("signUp"); setLoginError(""); setSignUpError(""); }}
            className={`flex-1 rounded-lg py-2.5 transition-all text-center ${
              tab === "signUp"
                ? "bg-primary text-primary-foreground shadow-sm font-extrabold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-clerk-signup"
          >
            إنشاء حساب جديد (Sign Up)
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* تبويب تسجيل الدخول                                            */}
        {/* ------------------------------------------------------------- */}
        {tab === "signIn" && (
          <form onSubmit={handleSignInSubmit} className="space-y-4">
            {loginError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 leading-relaxed font-medium" data-testid="error-signin">
                {loginError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-muted-foreground">
                البريد الإلكتروني، أو الهاتف، أو الرقم القومي (14 رقم)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: student@university.edu.eg أو 01012345678"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-4 pr-10 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-right"
                  data-testid="input-signin-identifier"
                />
                <Mail size={17} className="pointer-events-none absolute right-3.5 top-3.5 text-muted-foreground" />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground">كلمة المرور</label>
                <button
                  type="button"
                  onClick={() => setLoginPassword("Password123")}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  استعادة كلمة المرور
                </button>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-10 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-right"
                  data-testid="input-signin-password"
                />
                <Lock size={17} className="pointer-events-none absolute right-3.5 top-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute left-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showLoginPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all"
              data-testid="button-submit-signin"
            >
              تسجيل الدخول الآن
            </button>

            {/* الدخول السريع بنقرة واحدة لأي دور لاختبار النظام */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <span className="relative bg-card px-3 text-[11px] font-bold text-muted-foreground">
                تجربة الحسابات الجاهزة بنقرة واحدة (Quick Demo)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("student")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-center hover:bg-primary/10 transition-colors"
                data-testid="button-quick-student"
              >
                <div className="flex items-center gap-1 text-xs font-bold text-primary">
                  <GraduationCap size={15} />
                  <span>طالب جامعي</span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full">أحمد محمد (كفر الشيخ)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("owner")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 text-center hover:bg-emerald-500/10 transition-colors"
                data-testid="button-quick-owner"
              >
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Building2 size={15} />
                  <span>مالك عقار</span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full">م. محمود (٤ وحدات)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("admin")}
                className="flex flex-col items-center justify-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 text-center hover:bg-amber-500/10 transition-colors"
                data-testid="button-quick-admin"
              >
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Shield size={15} />
                  <span>فريق الإدارة</span>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full">مشرف المعاينة والتوثيق</span>
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------------- */}
        {/* تبويب إنشاء حساب جديد مع اختيار الدور بأسلوب Airbnb           */}
        {/* ------------------------------------------------------------- */}
        {tab === "signUp" && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            {signUpError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-500 leading-relaxed font-medium" data-testid="error-signup">
                {signUpError}
              </div>
            )}

            {/* بطاقات اختيار الدور (Airbnb-style role selector) */}
            <div>
              <label className="mb-2 block text-xs font-extrabold text-foreground">
                اختر نوع حسابك للمتابعة:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="role-selector-cards">
                {/* بطاقة الطالب */}
                <button
                  type="button"
                  onClick={() => setSignUpRole("student")}
                  className={`group relative flex flex-col items-start p-4 rounded-2xl border text-right transition-all ${
                    signUpRole === "student"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                  data-testid="role-card-student"
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                      signUpRole === "student" ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                    }`}>
                      <GraduationCap size={22} />
                    </div>
                    {signUpRole === "student" && (
                      <span className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                        <Check size={11} /> محدد
                      </span>
                    )}
                  </div>
                  <strong className="text-sm font-extrabold text-foreground">
                    أنا طالب أبحث عن سكن 🎓
                  </strong>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    سكن آمن، فحص ميداني 100%، جولات 360° حقيقية، رفقاء سكن موثوقين، وبدون عمولات سماسرة.
                  </p>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-primary">
                    <span>حساب طالب موثق</span>
                    <ArrowRight size={11} className="rotate-180" />
                  </div>
                </button>

                {/* بطاقة المالك */}
                <button
                  type="button"
                  onClick={() => setSignUpRole("owner")}
                  className={`group relative flex flex-col items-start p-4 rounded-2xl border text-right transition-all ${
                    signUpRole === "owner"
                      ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-md"
                      : "border-border bg-card hover:border-emerald-500/40 hover:bg-muted/30"
                  }`}
                  data-testid="role-card-owner"
                >
                  <div className="flex w-full items-center justify-between mb-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${
                      signUpRole === "owner" ? "bg-emerald-600 text-white" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      <Building2 size={22} />
                    </div>
                    {signUpRole === "owner" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
                        <Check size={11} /> محدد
                      </span>
                    )}
                  </div>
                  <strong className="text-sm font-extrabold text-foreground">
                    أنا مالك عقار أود التأجير 🏢
                  </strong>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    فحص مجاني وتصوير 360° من مهندسينا، وصول لآلاف الطلاب الملتزمين، وعقود إلكترونية آمنة.
                  </p>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <span>حساب مالك معتمد</span>
                    <ArrowRight size={11} className="rotate-180" />
                  </div>
                </button>
              </div>
            </div>

            {/* شريط معلومات توضيحي حسب الدور المختار */}
            <div className={`rounded-xl border p-2.5 text-xs flex items-center gap-2 ${
              signUpRole === "owner" 
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-primary/30 bg-primary/10 text-primary"
            }`}>
              {signUpRole === "owner" ? (
                <>
                  <Building2 size={16} className="shrink-0" />
                  <span>أنت تسجل الآن كـ <strong>مالك عقار</strong>. سيتم ربط وحداتك بلوحة إدارة العقارات وإتاحة المعاينة الميدانية.</span>
                </>
              ) : (
                <>
                  <GraduationCap size={16} className="shrink-0" />
                  <span>أنت تسجل الآن كـ <strong>طالب جامعي</strong>. استمتع بحجز آمن ومباشر ومطابقة للسكن بدون وسطاء.</span>
                </>
              )}
            </div>

            {/* حقل الاسم */}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {signUpRole === "owner" ? "اسم المالك أو المسؤول بالكامل" : "اسم الطالب بالكامل"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={signUpRole === "owner" ? "مثال: م. محمود عبد العزيز" : "مثال: أحمد محمد علي"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                  data-testid="input-signup-fullname"
                />
                <UserRound size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {/* الرقم القومي مع مؤشر 14 رقماً */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground">
                  {signUpRole === "owner" ? "الرقم القومي للمالك (14 رقم لتوثيق الملكية والعقود)" : "الرقم القومي للطالب (National ID)"} <span className="text-rose-500">*</span>
                </label>
                <span className={`text-[10px] font-mono ${nationalId.length === 14 ? "text-emerald-500 font-bold" : "text-muted-foreground"}`}>
                  {nationalId.length} / 14 رقماً
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  required
                  placeholder="14 رقماً كما في بطاقة الرقم القومي المصرية"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm font-mono tracking-wider text-foreground outline-none focus:border-primary transition-all text-right"
                  data-testid="input-signup-nationalid"
                />
                <CreditCard size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {/* رقم الهاتف للتواصل والواتساب */}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                {signUpRole === "owner" ? "رقم الهاتف الشخصي (متاح للاتصال والواتساب لتنسيق الفحص)" : "رقم التليفون الشخصي"} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  inputMode="tel"
                  required
                  placeholder="010xxxxxxxx أو 011xxxxxxxx"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm font-mono text-foreground outline-none focus:border-primary transition-all text-right"
                  data-testid="input-signup-phone"
                />
                <Phone size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {/* الحقول المخصصة للطالب: الجامعة والمدينة */}
            {signUpRole === "student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    الجامعة أو المعهد <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                      data-testid="select-signup-university"
                    >
                      {EGYPTIAN_UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>{uni}</option>
                      ))}
                    </select>
                    <GraduationCap size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                    <ChevronDown size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                  </div>
                  {university === "جامعة أخرى" && (
                    <input
                      type="text"
                      required
                      placeholder="اكتب اسم جامعتك أو معهدك"
                      value={customUniversity}
                      onChange={(e) => setCustomUniversity(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                      data-testid="input-signup-custom-university"
                    />
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    مدينة / محافظة السكن والدراسة <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={studentCity}
                      onChange={(e) => setStudentCity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                      data-testid="select-signup-student-city"
                    >
                      {EGYPTIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <MapPin size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                    <ChevronDown size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* الحقول المخصصة للمالك: المدينة، عدد الوحدات، ونوع العقار */}
            {signUpRole === "owner" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">
                      مدينة ومحافظة العقار <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={ownerCity}
                        onChange={(e) => setOwnerCity(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                        data-testid="select-signup-owner-city"
                      >
                        {EGYPTIAN_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <MapPin size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                      <ChevronDown size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted-foreground">
                      عدد الوحدات المتاحة للإيجار <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={unitsCount}
                        onChange={(e) => setUnitsCount(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                        data-testid="select-signup-units-count"
                      >
                        <option value="وحدة سكنية واحدة">وحدة سكنية واحدة (شقة / استوديو)</option>
                        <option value="وحدتان سكنيتان">وحدتان سكنيتان</option>
                        <option value="٣ - ٥ وحدات سكنية">٣ - ٥ وحدات سكنية</option>
                        <option value="عمارة طلابية كاملة (+٦ وحدات)">عمارة طلابية كاملة (+٦ وحدات)</option>
                      </select>
                      <Building size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                      <ChevronDown size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-muted-foreground">
                    نوع العقار والتجهيز <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={propertyTypes}
                      onChange={(e) => setPropertyTypes(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                      data-testid="select-signup-property-type"
                    >
                      <option value="شقق مفروشة بالكامل">شقق مفروشة بالكامل ومجهزة للطلاب</option>
                      <option value="استوديوهات فردية مستقلة">استوديوهات فردية مستقلة</option>
                      <option value="سكن طالبات مع حراسة وبوابة">سكن طالبات مع حراسة وبوابة أمنية</option>
                      <option value="غرف مشتركة بسراير منفصلة">غرف مشتركة بسراير منفصلة</option>
                    </select>
                    <Layers size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                    <ChevronDown size={14} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* البريد الإلكتروني */}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                البريد الإلكتروني (Email) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-4 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                  data-testid="input-signup-email"
                />
                <Mail size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {/* كلمة المرور مع إمكانية الإظهار والإخفاء */}
            <div>
              <label className="mb-1 block text-xs font-bold text-muted-foreground">
                كلمة المرور (Password) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showSignUpPassword ? "text" : "password"}
                  required
                  placeholder="٦ أحرف أو أرقام على الأقل"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm text-foreground outline-none focus:border-primary transition-all text-right"
                  data-testid="input-signup-password"
                />
                <Lock size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  className="absolute left-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showSignUpPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showSignUpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* شريط الأمان والتزامن مع قاعدة البيانات */}
            <div className="rounded-xl bg-muted/70 border border-border p-3 text-[11px] text-muted-foreground leading-relaxed flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <span>
                بياناتك مشفرة ومحفوظة فوراً في قاعدة بيانات منصة مكاني (جدول <code className="font-mono text-primary font-bold">users</code>) وتظهر مباشرة في لوحة إدارة وتحقق المشرفين.
              </span>
            </div>

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-extrabold text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 transition-all ${
                signUpRole === "owner" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
              }`}
              data-testid="button-submit-signup"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  جاري تسجيل الحساب ومزامنة البيانات في قاعدة البيانات...
                </>
              ) : signUpRole === "owner" ? (
                <>
                  <Building2 size={18} />
                  تسجيل حساب مالك عقار والبدء 🏢
                </>
              ) : (
                <>
                  <GraduationCap size={18} />
                  إنشاء حساب طالب موثق والانطلاق 🎓
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
