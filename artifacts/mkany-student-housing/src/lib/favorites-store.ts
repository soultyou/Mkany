/**
 * مخزن مفضلة الطلاب (Student Favorites Store)
 * متصل بقاعدة بيانات PostgreSQL عبر /api/favorites
 */

export interface StudentFavorite {
  id: string;
  studentId: string;
  propertyId: number;
  createdAt: string;
  property: {
    id: number;
    title: string;
    address: string;
    city: string;
    university: string;
    pricePerMonth: number;
    roomType: string;
    areaSqm?: number;
    bedrooms?: number;
    bathrooms?: number;
    floor?: string;
    furnishing?: string;
    availableFrom?: string;
    images: string[];
    video360Url?: string | null;
    verified: boolean;
    premium: boolean;
    livabilityScore: number;
    status: string;
    photos?: Array<{ id: number; url: string; isCover: boolean }>;
  };
}

export interface FavoritesResponse {
  favorites: StudentFavorite[];
  propertyIds: number[];
}

/**
 * جلب قائمة العقارات المفضلة للطالب من PostgreSQL
 */
export async function getStudentFavoritesApi(): Promise<FavoritesResponse> {
  try {
    const res = await fetch("/api/favorites");
    if (!res.ok) {
      return { favorites: [], propertyIds: [] };
    }
    const data = await res.json();
    return {
      favorites: Array.isArray(data.favorites) ? data.favorites : [],
      propertyIds: Array.isArray(data.propertyIds) ? data.propertyIds : [],
    };
  } catch (err) {
    console.error("Failed to fetch student favorites:", err);
    return { favorites: [], propertyIds: [] };
  }
}

/**
 * إضافة عقار إلى مفضلة الطالب في PostgreSQL
 */
export async function addFavoriteApi(propertyId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { 
        success: false, 
        message: data.message || "فشل في إضافة العقار للمفضلة" 
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to add favorite:", err);
    return { success: false, message: err?.message || "فشل الاتصال بالخادم" };
  }
}

/**
 * حذف عقار من مفضلة الطالب في PostgreSQL
 */
export async function removeFavoriteApi(propertyId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`/api/favorites/${propertyId}`, {
      method: "DELETE",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { 
        success: false, 
        message: data.message || "فشل في إزالة العقار من المفضلة" 
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to remove favorite:", err);
    return { success: false, message: err?.message || "فشل الاتصال بالخادم" };
  }
}
