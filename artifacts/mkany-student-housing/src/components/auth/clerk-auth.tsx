import React, { createContext, useContext, ReactNode, useState } from "react";
import {
  ClerkProvider,
  SignInButton as ClerkSignInButton,
  SignUpButton as ClerkSignUpButton,
  UserButton as ClerkUserButton,
  useUser as useClerkUser,
  useAuth as useClerkAuth
} from "@clerk/react";

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

export const SignInButton = ClerkSignInButton;
export const SignUpButton = ClerkSignUpButton;
export const UserButton = ClerkUserButton;

export function SignedIn({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useClerkAuth();
  return isSignedIn ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useClerkAuth();
  return !isSignedIn ? <>{children}</> : null;
}

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

export type RegisteredUser = StudentUser;

interface AuthContextType {
  updateUserProfile: (data: Partial<StudentUser>) => void;
  switchRole: (role: "student" | "owner" | "admin") => void;
  openSignIn: () => void;
  openSignUp: () => void;
  localRoleOverride: "student" | "owner" | "admin" | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function ClerkAuthProvider({ children, onToast }: { children: ReactNode; onToast?: (msg: string) => void }) {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    console.warn("VITE_CLERK_PUBLISHABLE_KEY is not set.");
  }

  const [localRole, setLocalRole] = useState<"student" | "owner" | "admin" | null>(null);

  const switchRole = (role: "student" | "owner" | "admin") => {
    setLocalRole(role);
    onToast?.(`تم التبديل إلى حساب ${role === 'owner' ? 'المالك' : role === 'admin' ? 'المشرف' : 'الطالب'}`);
  };

  const updateUserProfile = (data: Partial<StudentUser>) => {
    if (data.role) {
      setLocalRole(data.role);
    }
    onToast?.("تم تحديث بيانات الحساب.");
  };

  const openSignIn = () => { /* Clerk native */ };
  const openSignUp = () => { /* Clerk native */ };

  const providerContent = (
    <AuthContext.Provider value={{ updateUserProfile, switchRole, openSignIn, openSignUp, localRoleOverride: localRole }}>
      {children}
    </AuthContext.Provider>
  );

  if (!publishableKey) {
    return providerContent;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} proxyUrl="/api/__clerk">
      {providerContent}
    </ClerkProvider>
  );
}

export function useAuth() {
  const clerkAuth = useClerkAuth();
  const context = useContext(AuthContext);
  const { user } = useUser();
  
  if (!context) {
    throw new Error("useAuth must be used within a ClerkAuthProvider");
  }

  return {
    ...clerkAuth,
    ...context,
    user,
  };
}

export function useUser() {
  const { isLoaded, isSignedIn, user: clerkUser } = useClerkUser();
  const context = useContext(AuthContext);

  if (!isLoaded || !isSignedIn || !clerkUser) {
    return { isLoaded, isSignedIn, user: null };
  }

  const defaultRole = (clerkUser.publicMetadata?.role as "student" | "owner" | "admin") || "student";
  const role = context?.localRoleOverride || defaultRole;
  
  const user: StudentUser = {
    id: clerkUser.id,
    fullName: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress || "",
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    avatarUrl: clerkUser.imageUrl,
    role: role,
    university: (clerkUser.publicMetadata?.university as string) || EGYPTIAN_UNIVERSITIES[0],
    city: (clerkUser.publicMetadata?.city as string) || EGYPTIAN_CITIES[0],
    nationalId: (clerkUser.unsafeMetadata?.nationalId as string) || "",
    phoneNumber: (clerkUser.unsafeMetadata?.phoneNumber as string) || "",
    unitsCount: (clerkUser.unsafeMetadata?.unitsCount as string) || "1",
    propertyTypes: (clerkUser.unsafeMetadata?.propertyTypes as string) || "شقة كاملة",
    isVerified: (clerkUser.publicMetadata?.isVerified as boolean) || false,
  };

  return { isLoaded, isSignedIn, user };
}
