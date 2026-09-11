import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { Clerk } from "@clerk/clerk-js";

export const EGYPTIAN_UNIVERSITIES = [
  "جامعة كفر الشيخ", "جامعة المنصورة", "جامعة طنطا", "جامعة الإسكندرية", "جامعة القاهرة",
  "جامعة عين شمس", "جامعة الزقازيق", "جامعة دمياط", "جامعة حلوان", "جامعة بنها",
  "جامعة أسيوط", "جامعة قناة السويس", "الجامعة المصرية اليابانية (E-JUST)", "جامعة زويل للعلوم والتكنولوجيا", "جامعة أخرى"
];

export const EGYPTIAN_CITIES = [
  "كفر الشيخ", "المنصورة (الدقهلية)", "طنطا (الغربية)", "الإسكندرية", "القاهرة", "الجيزة",
  "الزقازيق (الشرقية)", "دمياط", "شبين الكوم (المنوفية)", "بنها (القليوبية)", "أسيوط",
  "الإسماعيلية", "السويس", "بورسعيد", "محافظة / مدينة أخرى"
];

export interface StudentUser {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  email: string;
  university: string;
  city: string;
  unitsCount: string;
  propertyTypes: string;
  avatarUrl?: string;
  role: "student" | "owner" | "admin";
  isVerified: boolean;
}

interface AuthContextType {
  clerk: Clerk | null;
  clerkLoaded: boolean;
  clerkError: Error | null;
  user: StudentUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  updateUserProfile: (data: Partial<StudentUser>) => void;
  switchRole: (role: "student" | "owner" | "admin") => void;
  openSignIn: (props?: any) => void;
  openSignUp: (props?: any) => void;
  signOut: () => Promise<void>;
  localRoleOverride: "student" | "owner" | "admin" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

let clerkInstance: Clerk | null = null;

export function ClerkAuthProvider({ children, onToast }: { children: ReactNode; onToast?: (msg: string) => void }) {
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [clerkError, setClerkError] = useState<Error | null>(null);
  const [localRole, setLocalRole] = useState<"student" | "owner" | "admin" | null>(null);
  const [sessionUser, setSessionUser] = useState<StudentUser | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!publishableKey || !publishableKey.startsWith("pk_")) {
      setClerkError(new Error("Missing or invalid VITE_CLERK_PUBLISHABLE_KEY. It must start with pk_"));
      return;
    }

    if (import.meta.env.DEV) {
      console.log("Clerk origin:", window.location.origin);
      console.log("Clerk key prefix:", publishableKey.slice(0, 12));
    }

    const initClerk = async () => {
      if (!clerkInstance) {
        clerkInstance = new Clerk(publishableKey);
      }
      try {
        await clerkInstance.load({});
        console.log({ clerkLoaded: true, origin: window.location.origin });
        
        clerkInstance.addListener(({ user, session }) => {
          setIsSignedIn(!!session);
          if (user) {
            setSessionUser({
              id: user.id,
              fullName: user.fullName || user.primaryEmailAddress?.emailAddress || "",
              email: user.primaryEmailAddress?.emailAddress || "",
              avatarUrl: user.imageUrl,
              role: localRole || (user.publicMetadata?.role as "student" | "owner" | "admin") || "student",
              university: (user.publicMetadata?.university as string) || EGYPTIAN_UNIVERSITIES[0],
              city: (user.publicMetadata?.city as string) || EGYPTIAN_CITIES[0],
              nationalId: (user.unsafeMetadata?.nationalId as string) || "",
              phoneNumber: (user.unsafeMetadata?.phoneNumber as string) || "",
              unitsCount: (user.unsafeMetadata?.unitsCount as string) || "1",
              propertyTypes: (user.unsafeMetadata?.propertyTypes as string) || "شقة كاملة",
              isVerified: (user.publicMetadata?.isVerified as boolean) || false,
            });
          } else {
            setSessionUser(null);
          }
        });

        setClerkLoaded(true);
      } catch (error) {
        console.error("Clerk initialization failed", error);
        setClerkError(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initClerk();
  }, [localRole]);

  const switchRole = (role: "student" | "owner" | "admin") => {
    setLocalRole(role);
    if (sessionUser) {
      setSessionUser({ ...sessionUser, role });
    }
    onToast?.(`تم التبديل إلى حساب ${role === 'owner' ? 'المالك' : role === 'admin' ? 'المشرف' : 'الطالب'}`);
  };

  const updateUserProfile = (data: Partial<StudentUser>) => {
    if (data.role) {
      setLocalRole(data.role);
    }
    if (sessionUser) {
      setSessionUser({ ...sessionUser, ...data });
    }
    onToast?.("تم تحديث بيانات الحساب.");
  };

  if (clerkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4 text-center" dir="rtl">
        <h1 className="text-2xl font-bold text-rose-500 mb-2">تعذر تحميل خدمة تسجيل الدخول</h1>
        <p className="text-slate-400 mb-4">{clerkError.message}</p>
        <p className="text-xs text-slate-500">راجع console للمزيد من التفاصيل.</p>
      </div>
    );
  }

  if (!clerkLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4 text-center" dir="rtl">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
          <h1 className="text-lg font-bold text-slate-300">جاري تحميل خدمة تسجيل الدخول...</h1>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      clerk: clerkInstance,
      clerkLoaded,
      clerkError,
      user: sessionUser,
      isSignedIn,
      isLoaded: clerkLoaded,
      updateUserProfile,
      switchRole,
      openSignIn: (props?: any) => clerkInstance?.openSignIn(props),
      openSignUp: (props?: any) => clerkInstance?.openSignUp(props),
      signOut: async () => { await clerkInstance?.signOut(); },
      localRoleOverride: localRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a ClerkAuthProvider");
  }
  return context;
}

export function useUser() {
  const context = useAuth();
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user
  };
}

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  return !isSignedIn ? <>{children}</> : null;
}

export function SignInButton({ children, mode, ...props }: any) {
  const { openSignIn } = useAuth();
  const child = React.Children.only(children) as React.ReactElement;
  
  return React.cloneElement(child, {
    onClick: (e: any) => {
      if (child.props.onClick) {
        child.props.onClick(e);
      }
      openSignIn(props);
    }
  });
}

export function SignUpButton({ children, mode, ...props }: any) {
  const { openSignUp } = useAuth();
  const child = React.Children.only(children) as React.ReactElement;
  
  return React.cloneElement(child, {
    onClick: (e: any) => {
      if (child.props.onClick) {
        child.props.onClick(e);
      }
      openSignUp(props);
    }
  });
}

export function UserButton() {
  const { clerkLoaded, clerk } = useAuth();
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (clerkLoaded && clerk && containerRef.current) {
      clerk.mountUserButton(containerRef.current);
    }
    return () => {
      if (clerkLoaded && clerk && containerRef.current) {
        clerk.unmountUserButton(containerRef.current);
      }
    }
  }, [clerkLoaded, clerk]);

  return <div ref={containerRef} className="h-8 w-8 min-w-[32px] rounded-full overflow-hidden bg-muted" />;
}
