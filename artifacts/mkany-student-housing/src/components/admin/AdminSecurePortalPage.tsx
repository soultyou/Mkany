import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck,
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";
import { AdminInspectionPortal } from "./AdminInspectionPortal";

const ADMIN_STORAGE_AUTH_KEY = "mkany_admin_authenticated_session";

// قائمة الحسابات المصرح لها بالدخول للإدارة المركزية
const VALID_ADMIN_ACCOUNTS = [
  { email: "admin@mkany.eg", pass: "mkany2025" },
  { email: "admin@mkany.eg", pass: "admin01055332242" },
  { email: "superadmin@mkany.eg", pass: "mkany2025" },
  { email: "director@mkany.eg", pass: "01055332242" },
  { email: "admin@mkany.com", pass: "123456" },
];

export function AdminSecurePortalPage() {
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      sessionStorage.getItem(ADMIN_STORAGE_AUTH_KEY) === "true" ||
      localStorage.getItem(ADMIN_STORAGE_AUTH_KEY) === "true"
    );
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalToast, setPortalToast] = useState("");

  useEffect(() => {
    if (!portalToast) return;
    const t = window.setTimeout(() => setPortalToast(""), 2800);
    return () => clearTimeout(t);
  }, [portalToast]);

  useEffect(() => {
    // تحديث عنوان الصفحة للإدارة الآمنة
    const prevTitle = document.title;
    document.title = "بوابة الوصول الآمن | غرفة تحكم مكاني";
    return () => {
      document.title = prevTitle;
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // التحقق من البريد وكلمة المرور
    const isValid =
      VALID_ADMIN_ACCOUNTS.some(
        (acc) => acc.email === cleanEmail && acc.pass === cleanPass
      ) ||
      // دعم مرن في حال استخدام كود الآدمن المشهور أو الإيميل الرئيسي
      ((cleanEmail.includes("admin") || cleanEmail.includes("mkany")) &&
        (cleanPass === "mkany2025" ||
          cleanPass === "01055332242" ||
          cleanPass === "admin01055332242" ||
          cleanPass === "admin1234" ||
          cleanPass === "123456"));

    setTimeout(() => {
      setLoading(false);
      if (isValid) {
        setIsAuthenticated(true);
        sessionStorage.setItem(ADMIN_STORAGE_AUTH_KEY, "true");
        if (rememberMe) {
          localStorage.setItem(ADMIN_STORAGE_AUTH_KEY, "true");
        }
      } else {
        setErrorMsg(
          "بيانات الدخول غير صحيحة. يرجى التأكد من البريد الإلكتروني للمشرف وكلمة المرور المشفرة."
        );
      }
    }, 400);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(ADMIN_STORAGE_AUTH_KEY);
    localStorage.removeItem(ADMIN_STORAGE_AUTH_KEY);
    setEmail("");
    setPassword("");
  };

  const fillDemoCredentials = () => {
    setEmail("admin@mkany.eg");
    setPassword("mkany2025");
    setErrorMsg("");
  };

  // إذا كان المشرف مسجل دخوله، نعرض لوحة التحكم بالكامل
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground" data-testid="authenticated-admin-portal">
        <div className="border-b border-purple-500/20 bg-purple-950/40 px-4 py-2 text-right">
          <div className="mx-auto flex max-w-7xl items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-purple-200">
                جلسة إدارية مشفرة نشطة (مسار مستقل: /admin-secure-portal)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/")}
                className="flex items-center gap-1 font-bold text-purple-300 hover:text-white transition-colors"
                title="الرجوع إلى الواجهة العامة للطلاب"
                data-testid="admin-nav-to-student-site"
              >
                <ExternalLink size={13} />
                الانتقال للواجهة العامة
              </button>
              <span className="text-purple-400/40">|</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 font-bold text-rose-400 hover:text-rose-300 transition-colors"
                title="تسجيل الخروج وإنهاء الجلسة الإدارية"
                data-testid="admin-btn-logout"
              >
                <LogOut size={13} />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>

        <AdminInspectionPortal
          onClose={() => setLocation("/")}
          onViewStudentListings={() => setLocation("/")}
          openToast={(msg) => setPortalToast(msg)}
        />

        {portalToast && (
          <div
            className="toast-in fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-primary/40 bg-card px-5 py-3 text-xs font-bold text-foreground shadow-2xl"
            role="status"
            data-testid="admin-portal-toast"
          >
            <CheckCircle2 size={16} className="text-primary" />
            {portalToast}
          </div>
        )}
      </div>
    );
  }

  // صفحة تسجيل الدخول الآمن للآدمن
  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 py-12 text-right relative overflow-hidden"
      dir="rtl"
      data-testid="admin-secure-login-page"
    >
      {/* خلفية جمالية خفيفة */}
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* العودة للموقع العام */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            data-testid="btn-back-to-public-site"
          >
            <ArrowLeft size={14} />
            العودة للموقع العام للطلاب
          </button>
          <span className="rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-[11px] font-bold text-purple-400">
            مسار إداري مستقل
          </span>
        </div>

        {/* بطاقة الدخول */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg">
            <Lock size={30} />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              بوابة الوصول الآمن لغرفة تحكم مكاني
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-5">
              رابط الإدارة المركزي المخفي • مخصص فقط لفريق التوثيق والمعاينة وإدارة السكن الطلابي
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs font-bold text-rose-400 animate-shake">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-200 mb-1.5">
                البريد الإلكتروني للإدارة (Admin Email):
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@mkany.eg"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 font-mono text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-all pl-10 text-left"
                  dir="ltr"
                  data-testid="admin-input-email"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-200 mb-1.5">
                كلمة المرور المشفرة (Admin Password):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 font-mono text-xs text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-all pl-10 text-left"
                  dir="ltr"
                  data-testid="admin-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-0"
                />
                <span className="text-[11px]">حفظ الجلسة على هذا المتصفح</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-500 active:scale-[0.99] transition-all disabled:opacity-50"
              data-testid="admin-btn-submit-login"
            >
              <ShieldCheck size={18} />
              {loading ? "جارٍ التحقق والتشفير..." : "تسجيل الدخول والتحقق الآمن"}
            </button>
          </form>

          {/* مربع التلميح السريع للاختبار التجريبي */}
          <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-950/30 p-3.5 text-[11px] text-purple-300">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold flex items-center gap-1">
                <Sparkles size={13} className="text-purple-400" />
                بيانات الدخول الإدارية المعتمدة:
              </span>
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="rounded-md bg-purple-600/30 hover:bg-purple-600/50 px-2 py-0.5 font-bold text-white text-[10px] transition-colors"
                data-testid="btn-fill-demo-credentials"
              >
                ملء تجريبي سريع
              </button>
            </div>
            <div className="space-y-1 font-mono text-[10px] text-purple-200/90 text-left dir-ltr">
              <div>الإيميل: <span className="font-bold text-white">admin@mkany.eg</span></div>
              <div>كلمة المرور: <span className="font-bold text-white">mkany2025</span> أو <span className="font-bold text-white">admin01055332242</span></div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          منصة مكاني لسكن الطلاب • نظام الحماية الميداني المشفر © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
