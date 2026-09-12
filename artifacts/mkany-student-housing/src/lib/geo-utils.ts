/**
 * منظومة الخرائط وحساب المسافات المجانية 100%
 * معتمدة بالكامل على OpenStreetMap و Leaflet.js
 * بدون أي تكلفة أو API keys مدفوعة
 */

export interface LatLngCoord {
  lat: number;
  lng: number;
}

export interface RouteCalculationResult {
  distanceMeters: number;
  distanceFormatted: string;
  walkMinutes: number;
  walkTimeFormatted: string;
  transitMinutes: number;
  transitTimeFormatted: string;
  coordinates: [number, number][]; // [lat, lng] array for Leaflet polyline
  isRealStreetRoute: boolean;
}

/**
 * حساب المسافة الجغرافية الدقيقة بين نقطتين بالأمتار (Haversine Formula)
 */
export function calcHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // نصف قطر الأرض بالمتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * تنسيق المسافة باللغة العربية بطريقة أنيقة للطلاب
 */
export function formatDistanceArabic(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} م`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km.replace(".", "٫")} كم`;
}

/**
 * حساب وقت المشي المستغرق (بناءً على متوسط سرعة مشي 4.8 كم/س = 80 متر/دقيقة)
 */
export function formatWalkingTimeArabic(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 80));
  if (minutes === 1) return "دقيقة واحدة مشياً";
  if (minutes === 2) return "دقيقتان مشياً";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق مشياً`;
  return `${minutes} دقيقة مشياً`;
}

/**
 * حساب وقت المواصلات / السرفيس (بناءً على سرعة ميكروباص وسط المدينة مع التوقف = 300 متر/دقيقة)
 */
export function formatTransitTimeArabic(meters: number): string {
  const minutes = Math.max(1, Math.round(meters / 300));
  if (minutes === 1) return "دقيقة واحدة بالسرفيس";
  if (minutes === 2) return "دقيقتان بالسرفيس";
  if (minutes >= 3 && minutes <= 10) return `${minutes} دقائق بالمواصلات`;
  return `${minutes} دقيقة بالمواصلات`;
}

/**
 * الحصول على مسار السير الفعلي للشوارع عبر محرك OSRM المفتوح المصدر (Open Source Routing Machine)
 * يستعلم من خادم المنصة الموثق لضمان الأمان والخصوصية وحماية الهوية الجغرافية للأفراد.
 */
export async function getRouteBetween(
  start: LatLngCoord,
  end: LatLngCoord,
  mode: "walking" | "driving"
): Promise<RouteCalculationResult> {
  const straightDistance = calcHaversineDistanceMeters(
    start.lat,
    start.lng,
    end.lat,
    end.lng
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `/api/geo/route?originLat=${start.lat}&originLng=${start.lng}&destinationLat=${end.lat}&destinationLng=${end.lng}&mode=${mode}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          distanceMeters: data.distanceMeters,
          distanceFormatted: data.distanceFormatted,
          walkMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
          walkTimeFormatted: data.durationFormatted,
          transitMinutes: Math.max(1, Math.round(data.durationSeconds / 60)),
          transitTimeFormatted: data.durationFormatted,
          coordinates: data.coordinates || [],
          isRealStreetRoute: true,
        };
      }
    }
  } catch (err) {
    console.error(`Route fetching failed for mode ${mode}:`, err);
  }

  // Fallback safe: Return a structured error response with geographic distance as fallback without inventing travel times
  return {
    distanceMeters: straightDistance,
    distanceFormatted: formatDistanceArabic(straightDistance),
    walkMinutes: 0,
    walkTimeFormatted: mode === "walking" ? "تعذر حساب مسار المشي" : "تعذر حساب مسار السيارة",
    transitMinutes: 0,
    transitTimeFormatted: mode === "walking" ? "تعذر حساب مسار المشي" : "تعذر حساب مسار السيارة",
    coordinates: [[start.lat, start.lng], [end.lat, end.lng]],
    isRealStreetRoute: false,
  };
}

export async function getWalkingRouteBetween(
  start: LatLngCoord,
  end: LatLngCoord
): Promise<RouteCalculationResult> {
  return getRouteBetween(start, end, "walking");
}

/**
 * إحداثيات المدن والجامعات المصرية الافتراضية
 */
export function getCityDefaultCoordinates(city: string = "", university: string = ""): LatLngCoord {
  const c = city.toLowerCase();
  const u = university.toLowerCase();

  if (c.includes("كفر الشيخ") || u.includes("كفر الشيخ")) {
    return { lat: 31.1128, lng: 30.9392 }; // قرب جامعة كفر الشيخ وكلية الزراعة
  }
  if (c.includes("منصورة") || u.includes("منصورة")) {
    return { lat: 31.0425, lng: 31.365 }; // قرب جامعة المنصورة وبوابة الجلاء
  }
  if (c.includes("طنطا") || u.includes("طنطا")) {
    return { lat: 30.7865, lng: 31.0004 }; // مجمع الكليات الطبي بطنطا
  }
  if (c.includes("إسكندرية") || u.includes("إسكندرية")) {
    return { lat: 31.2001, lng: 29.9187 }; // جامعة الإسكندرية الشاطبي
  }
  if (c.includes("قاهرة") || u.includes("قاهرة")) {
    return { lat: 30.0263, lng: 31.2114 }; // جامعة القاهرة بين السرايات
  }
  if (c.includes("عين شمس") || u.includes("عين شمس")) {
    return { lat: 30.0771, lng: 31.2854 }; // جامعة عين شمس العباسية
  }
  if (c.includes("حلوان") || u.includes("حلوان")) {
    return { lat: 29.8667, lng: 31.3167 }; // جامعة حلوان
  }
  if (c.includes("أسيوط") || u.includes("أسيوط")) {
    return { lat: 27.1866, lng: 31.1718 }; // جامعة أسيوط
  }
  if (c.includes("زقازيق") || u.includes("زقازيق")) {
    return { lat: 30.5877, lng: 31.5035 }; // جامعة الزقازيق
  }
  if (c.includes("منوفية") || u.includes("منوفية")) {
    return { lat: 30.5594, lng: 31.0089 }; // جامعة المنوفية شبين الكوم
  }

  // الافتراضي: كفر الشيخ
  return { lat: 31.1128, lng: 30.9392 };
}

/**
 * توليد إحداثيات واقعية للخدمات الست المحيطة بالعقار عند عدم توفر إحداثيات محددة مسبقاً
 */
export function getDerivedAmenityCoords(
  baseLat: number,
  baseLng: number,
  key: string
): LatLngCoord {
  // إزاحات جغرافية دقيقة تعكس مسافات بين 50 متر إلى 800 متر
  switch (key) {
    case "pharmacy":
      // ~100-150 متر
      return { lat: baseLat - 0.0011, lng: baseLng + 0.0009 };
    case "cafeRestaurant":
      // ~80-120 متر
      return { lat: baseLat + 0.0007, lng: baseLng - 0.0008 };
    case "transportation":
      // ~180-220 متر
      return { lat: baseLat + 0.0016, lng: baseLng + 0.0014 };
    case "supermarket":
      // ~250-320 متر
      return { lat: baseLat - 0.0022, lng: baseLng - 0.0018 };
    case "hospital":
      // ~450-550 متر
      return { lat: baseLat + 0.0036, lng: baseLng - 0.0032 };
    case "universityGate":
    default:
      // ~600-800 متر
      return { lat: baseLat + 0.0052, lng: baseLng + 0.0048 };
  }
}

/**
 * توليد رابط التوجيه المباشر في OpenStreetMap
 */
export function getOpenStreetMapDirectionsUrl(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${fromLat}%2C${fromLng}%3B${toLat}%2C${toLng}`;
}
