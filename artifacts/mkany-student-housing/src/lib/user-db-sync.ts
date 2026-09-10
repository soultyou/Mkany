/**
 * نظام إدارة ومزامنة بيانات الطلاب والملاك والمستخدمين محلياً
 * متوافق مع جدول users في Drizzle / PostgreSQL
 */

export interface RegisteredUser {
  id: string;
  clerkUserId?: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  email: string;
  password?: string;
  university?: string; // للطلاب
  city?: string; // للملاك أو الطلاب
  unitsCount?: string; // للملاك: عدد الوحدات السكنية
  propertyTypes?: string; // للملاك: شقق طلابية، استوديوهات، غرف مشتركة
  avatarUrl?: string;
  role: "student" | "owner" | "admin";
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// التوافق مع الكود السابق
export type StudentUser = RegisteredUser;

export const STORAGE_USERS_KEY = "mkany_users_database_v1";
export const STORAGE_CURRENT_USER_KEY = "mkany_current_user";
export const STORAGE_STUDENT_SESSION_KEY = "mkany_session_student";
export const STORAGE_OWNER_SESSION_KEY = "mkany_session_owner";
export const STORAGE_ADMIN_SESSION_KEY = "mkany_session_admin";
export const USERS_CHANGE_EVENT = "mkany_users_updated";
export const USER_SESSION_CHANGE_EVENT = "mkany_session_updated";

// حسابات افتراضية أولية للمنصة مفصولة تماماً وموثقة
const DEFAULT_USERS: RegisteredUser[] = [
  {
    id: "usr_student_01",
    clerkUserId: "user_2test_student01",
    fullName: "أحمد محمد كمال",
    nationalId: "30208151234567",
    phoneNumber: "01098765432",
    email: "ahmed.kamal@kfs.edu.eg",
    password: "Password123",
    university: "جامعة كفر الشيخ",
    city: "كفر الشيخ",
    avatarUrl: "",
    role: "student",
    isVerified: true,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_student_02",
    clerkUserId: "user_2test_student02",
    fullName: "مريم أحمد الشربيني",
    nationalId: "30304201239876",
    phoneNumber: "01123456789",
    email: "mariam.sherbini@mans.edu.eg",
    password: "Password123",
    university: "جامعة المنصورة",
    city: "المنصورة",
    avatarUrl: "",
    role: "student",
    isVerified: true,
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_owner_01",
    clerkUserId: "user_2test_owner01",
    fullName: "المهندس محمود عبد العزيز",
    nationalId: "28503151234567",
    phoneNumber: "01287654321",
    email: "owner.mahmoud@mkany.eg",
    password: "Password123",
    university: "عقارات كفر الشيخ والمنصورة",
    city: "كفر الشيخ",
    unitsCount: "٤ وحدات سكنية",
    propertyTypes: "شقق فندقية واستوديوهات طلابية",
    avatarUrl: "",
    role: "owner",
    isVerified: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_owner_02",
    clerkUserId: "user_2test_owner02",
    fullName: "الحاج إبراهيم الدسوقي",
    nationalId: "27812101234567",
    phoneNumber: "01011223344",
    email: "desouky.re@gmail.com",
    password: "Password123",
    university: "عقارات حي الجامعة - طنطا",
    city: "طنطا",
    unitsCount: "عمارة كاملة (٦ شقق)",
    propertyTypes: "سكن طالبات مع حراسة ومصعد",
    avatarUrl: "",
    role: "owner",
    isVerified: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "usr_admin_01",
    clerkUserId: "user_2test_admin01",
    fullName: "فريق فحص وتوثيق مكاني (Admin)",
    nationalId: "29001011234567",
    phoneNumber: "01000001234",
    email: "admin@mkany.eg",
    password: "Password123",
    university: "إدارة منصة مكاني",
    city: "القاهرة / المحافظات",
    avatarUrl: "",
    role: "admin",
    isVerified: true,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * إشعار بالحدث عند تعديل قاعدة بيانات المستخدمين
 */
function notifyUsersChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USERS_CHANGE_EVENT));
  }
}

/**
 * الاشتراك في تحديثات قاعدة بيانات المستخدمين
 */
export function subscribeToUsersDatabase(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(USERS_CHANGE_EVENT, callback);
  return () => window.removeEventListener(USERS_CHANGE_EVENT, callback);
}

/**
 * جلب جميع المستخدمين المسجلين في قاعدة البيانات المحلية
 */
export function getAllRegisteredUsers(): RegisteredUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch (e) {
    console.warn("Failed to read users from localStorage:", e);
    return DEFAULT_USERS;
  }
}

/**
 * حفظ ومزامنة مستخدم جديد أو محدث مع قاعدة البيانات المحلية
 */
export function saveOrUpdateUserToDb(userData: Partial<RegisteredUser> & { fullName: string; email: string }): RegisteredUser {
  const allUsers = getAllRegisteredUsers();
  const now = new Date().toISOString();

  // فحص ما إذا كان المستخدم مسجلاً بالفعل
  const existingIndex = allUsers.findIndex(
    (u) => (userData.id && u.id === userData.id) || 
           (userData.email && u.email.toLowerCase() === userData.email.toLowerCase()) ||
           (userData.nationalId && userData.nationalId.length > 5 && u.nationalId === userData.nationalId)
  );

  let updatedUser: RegisteredUser;

  if (existingIndex >= 0) {
    updatedUser = {
      ...allUsers[existingIndex],
      ...userData,
      updatedAt: now,
    };
    allUsers[existingIndex] = updatedUser;
  } else {
    updatedUser = {
      id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clerkUserId: userData.clerkUserId || `clerk_${Date.now()}`,
      fullName: userData.fullName.trim(),
      nationalId: userData.nationalId?.trim() || "",
      phoneNumber: userData.phoneNumber?.trim() || "",
      email: userData.email.trim().toLowerCase(),
      password: userData.password || "Password123",
      university: userData.university?.trim() || (userData.role === "owner" ? "مالك عقار" : "جامعة كفر الشيخ"),
      city: userData.city?.trim() || "كفر الشيخ",
      unitsCount: userData.unitsCount?.trim() || (userData.role === "owner" ? "وحدة سكنية أو أكثر" : undefined),
      propertyTypes: userData.propertyTypes?.trim() || undefined,
      avatarUrl: userData.avatarUrl || "",
      role: userData.role || "student",
      isVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    allUsers.push(updatedUser);
  }

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(allUsers));
    notifyUsersChanged();
  } catch (e) {
    console.error("Failed to save users database:", e);
  }

  return updatedUser;
}

/**
 * تبديل حالة توثيق المستخدم من لوحة الإدارة
 */
export function toggleUserVerification(userId: string): RegisteredUser | null {
  const allUsers = getAllRegisteredUsers();
  const idx = allUsers.findIndex((u) => u.id === userId);
  if (idx < 0) return null;

  allUsers[idx].isVerified = !allUsers[idx].isVerified;
  allUsers[idx].updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(allUsers));
    notifyUsersChanged();
  } catch (e) {
    console.error("Failed to toggle verification:", e);
  }

  return allUsers[idx];
}

/**
 * حذف مستخدم من قاعدة البيانات (للأدمن)
 */
export function deleteUserFromDb(userId: string): boolean {
  const allUsers = getAllRegisteredUsers();
  const filtered = allUsers.filter((u) => u.id !== userId);
  if (filtered.length === allUsers.length) return false;

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(filtered));
    notifyUsersChanged();
    return true;
  } catch (e) {
    console.error("Failed to delete user:", e);
    return false;
  }
}

/**
 * إشعار بتغير جلسة المستخدم الحالي
 */
function notifySessionChanged(user: RegisteredUser | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(USER_SESSION_CHANGE_EVENT, { detail: user }));
  }
}

/**
 * الاشتراك في تحديثات جلسة المستخدم الحالي
 */
export function subscribeToSessionUser(callback: (user: RegisteredUser | null) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<RegisteredUser | null>;
    callback(custom.detail);
  };
  window.addEventListener(USER_SESSION_CHANGE_EVENT, handler);
  return () => window.removeEventListener(USER_SESSION_CHANGE_EVENT, handler);
}

/**
 * جلب المستخدم المسجل دخوله حالياً مع التحقق الصارم من العزل والدور
 */
export function getCurrentSessionUser(): RegisteredUser | null {
  if (typeof window === "undefined") return null;
  try {
    // محاولة جلب الجلسة النشطة من المفتاح الرئيسي المعياري
    let raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    
    // التوافق التلقائي مع أي مفتاح قديم
    if (!raw) {
      raw = localStorage.getItem("mkany_authenticated_user_v1");
      if (raw) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, raw);
        localStorage.removeItem("mkany_authenticated_user_v1");
      }
    }

    if (!raw) return null;
    const parsed: RegisteredUser = JSON.parse(raw);
    
    // التحقق الصارم من بنية الحساب والدور (Strict Role Verification)
    if (!parsed || !parsed.id || !parsed.email) {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      return null;
    }

    // التأكد من أن الدور محدد وصحيح
    if (parsed.role !== "student" && parsed.role !== "owner" && parsed.role !== "admin") {
      parsed.role = "student";
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(parsed));
    }

    return parsed;
  } catch (e) {
    console.warn("Failed to read session user from localStorage:", e);
    return null;
  }
}

/**
 * حفظ وتعيين جلسة المستخدم الحالي مع العزل التام للمفاتيح
 */
export function setCurrentSessionUser(user: RegisteredUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      // التحقق الصارم من تحديد الدور
      const sanitizedUser: RegisteredUser = {
        ...user,
        role: user.role === "owner" ? "owner" : user.role === "admin" ? "admin" : "student",
      };

      // 1. حفظ في مفتاح الجلسة النشطة الأساسي
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(sanitizedUser));

      // 2. حفظ في المفتاح الخاص بالدور (Isolated Role Session Cache) لتمكين التبديل السلس مثل Airbnb
      if (sanitizedUser.role === "student") {
        localStorage.setItem(STORAGE_STUDENT_SESSION_KEY, JSON.stringify(sanitizedUser));
      } else if (sanitizedUser.role === "owner") {
        localStorage.setItem(STORAGE_OWNER_SESSION_KEY, JSON.stringify(sanitizedUser));
      } else if (sanitizedUser.role === "admin") {
        localStorage.setItem(STORAGE_ADMIN_SESSION_KEY, JSON.stringify(sanitizedUser));
      }

      notifySessionChanged(sanitizedUser);
    } else {
      // تسجيل الخروج: حذف الجلسة النشطة فقط مع الاحتفاظ بقاعدة بيانات المستخدمين
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      localStorage.removeItem("mkany_authenticated_user_v1");
      notifySessionChanged(null);
    }
  } catch (e) {
    console.error("Failed to update session user:", e);
  }
}

/**
 * تبديل الدور أو الحساب بسلاسة وعزل تام (Airbnb-Style Role Switcher)
 * يتيح الانتقال بين وضع الطالب ووضع المالك دون فقدان أي بيانات
 */
export function switchSessionRole(targetRole: "student" | "owner" | "admin"): RegisteredUser | null {
  if (typeof window === "undefined") return null;

  try {
    const allUsers = getAllRegisteredUsers();
    let targetUser: RegisteredUser | null = null;

    // 1. فحص إذا كان هناك جلسة مخزنة مسبقاً لهذا الدور
    const roleKey = 
      targetRole === "student" ? STORAGE_STUDENT_SESSION_KEY :
      targetRole === "owner" ? STORAGE_OWNER_SESSION_KEY :
      STORAGE_ADMIN_SESSION_KEY;

    const cachedRaw = localStorage.getItem(roleKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.role === targetRole) {
          // التأكد من وجوده في قاعدة البيانات
          const fresh = allUsers.find((u) => u.id === cached.id || u.email.toLowerCase() === cached.email.toLowerCase());
          targetUser = fresh || cached;
        }
      } catch (err) {}
    }

    // 2. إذا لم توجد جلسة سابقة لهذا الدور، اختر الحساب النموذجي المطابق من قاعدة البيانات
    if (!targetUser) {
      targetUser = allUsers.find((u) => u.role === targetRole) || null;
    }

    // 3. إذا لم يوجد أي حساب، استعن بالقائمة الافتراضية
    if (!targetUser) {
      targetUser = DEFAULT_USERS.find((u) => u.role === targetRole) || null;
    }

    if (targetUser) {
      setCurrentSessionUser(targetUser);
      return targetUser;
    }

    return null;
  } catch (e) {
    console.error("Failed to switch session role:", e);
    return null;
  }
}

/**
 * مفتاح التخزين الخاص بمفضلة العقارات معزول تماماً لكل مستخدم (User-Scoped Favorites)
 */
export function getUserFavoritesKey(userId?: string): string {
  if (!userId || userId.trim() === "") return "mkany_favorites_guest_v1";
  return `mkany_favorites_${userId.trim()}_v1`;
}

/**
 * جلب المفضلة المعزولة للمستخدم
 */
export function getUserFavorites(userId?: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getUserFavoritesKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * حفظ وتبديل حالة المفضلة لعقار معين للمستخدم الحالي
 */
export function toggleUserFavorite(userId: string | undefined, propertyId: number): number[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getUserFavoritesKey(userId);
    const current = getUserFavorites(userId);
    const updated = current.includes(propertyId)
      ? current.filter((id) => id !== propertyId)
      : [...current, propertyId];
    
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to toggle user favorite:", e);
    return [];
  }
}


