// Real-time OSM Overpass integration and Haversine utility without external geo-utils dependencies.
import { db, serviceRatings } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

export interface AmenityDetail {
  distance: string; // e.g. "المسافة الجغرافية: ٤٥٠ م" or "مسافة الطريق: ٤٨٠ م"
  time: string;     // e.g. "٦ دقائق مشياً"
  name?: string;     // e.g. "مستشفى كفر الشيخ الجامعي"
  rating?: string;   // ONLY set by Mkany Admin (0–5 in 0.5 increments), or undefined if unrated ("لم يتم تقييمه بعد")
  lat?: number;      
  lng?: number;      
  osmType?: string;  // "node" | "way" | "relation"
  osmId?: string;    // real OSM element ID
  distanceMeters?: number;
  isGeographicOnly?: boolean;
  walkTimeFormatted?: string;
  driveTimeFormatted?: string;
}

export interface NearbyAmenities {
  hospital: AmenityDetail;        
  pharmacy: AmenityDetail;        
  transportation: AmenityDetail;  
  supermarket: AmenityDetail;     
  cafeRestaurant: AmenityDetail;  
  universityGate: AmenityDetail;  
  hospitalList: AmenityDetail[];
  pharmacyList: AmenityDetail[];
  transportationList: AmenityDetail[];
  supermarketList: AmenityDetail[];
  cafeRestaurantList: AmenityDetail[];
  universityGateList: AmenityDetail[];
}

/**
 * Calculates Haversine distance in meters
 */
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
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
 * Format distance in Arabic with label indicating whether it's geographic or road
 */
export function formatDistanceWithLabel(meters: number, isGeographicOnly: boolean): string {
  const formatted = meters < 1000 ? `${Math.round(meters)} م` : `${(meters / 1000).toFixed(1).replace(".", "٫")} كم`;
  return isGeographicOnly ? `المسافة الجغرافية: ${formatted}` : `مسافة الطريق: ${formatted}`;
}

/**
 * Fetch real amenities from OpenStreetMap Overpass API
 */
export async function fetchNearbyAmenitiesFromOverpass(lat: number, lng: number): Promise<NearbyAmenities> {
  const defaultEmptyDetail = (categoryAr: string): AmenityDetail => ({
    name: `لا توجد بيانات ${categoryAr} متاحة في النطاق الحالي`,
    distance: "لا توجد بيانات متاحة",
    time: "لا توجد بيانات متاحة",
    isGeographicOnly: true,
  });

  const amenitiesResult: NearbyAmenities = {
    hospital: defaultEmptyDetail("مستشفيات"),
    pharmacy: defaultEmptyDetail("صيدليات"),
    transportation: defaultEmptyDetail("مواصلات"),
    supermarket: defaultEmptyDetail("سوبرماركت"),
    cafeRestaurant: defaultEmptyDetail("مطاعم وكافيهات"),
    universityGate: defaultEmptyDetail("بوابات الجامعة والتعليم"),
    hospitalList: [],
    pharmacyList: [],
    transportationList: [],
    supermarketList: [],
    cafeRestaurantList: [],
    universityGateList: [],
  };

  // Validate coordinates
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180 || isNaN(lat) || isNaN(lng)) {
    return amenitiesResult;
  }

  // Overpass API Query
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const query = `[out:json][timeout:15];
(
  node(around:1000, ${lat}, ${lng})["amenity"~"hospital|clinic|pharmacy|bus_station|bus_stop|taxi|cafe|restaurant|fast_food|supermarket|convenience|marketplace|university|college|school"];
  way(around:1000, ${lat}, ${lng})["amenity"~"hospital|clinic|pharmacy|bus_station|bus_stop|taxi|cafe|restaurant|fast_food|supermarket|convenience|marketplace|university|college|school"];
);
out center;`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout

    const response = await fetch(overpassUrl, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.elements)) {
      return amenitiesResult;
    }

    const elements = data.elements;

    const parsedPlaces: Array<{
      name: string;
      lat: number;
      lng: number;
      type: string;
      distanceMeters: number;
      osmType: string;
      osmId: string;
    }> = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags["name:ar"] || tags["name"] || tags["name:en"];
      if (!name) continue; // Skip nameless amenities as requested

      const placeLat = el.lat !== undefined ? el.lat : (el.center ? el.center.lat : null);
      const placeLng = el.lon !== undefined ? el.lon : (el.center ? el.center.lon : null);

      if (placeLat === null || placeLng === null) continue;

      const distanceMeters = getHaversineDistance(lat, lng, placeLat, placeLng);
      if (distanceMeters > 1100) continue; // filter slightly strictly

      // Classify type
      let categoryType = "";
      const amenity = tags["amenity"] || "";
      const shop = tags["shop"] || "";

      if (["hospital", "clinic", "doctors", "dentist"].includes(amenity)) {
        categoryType = "hospital";
      } else if (amenity === "pharmacy") {
        categoryType = "pharmacy";
      } else if (["bus_station", "bus_stop", "taxi", "railway_station", "station"].includes(amenity)) {
        categoryType = "transportation";
      } else if (["supermarket", "convenience", "marketplace", "mall", "department_store"].includes(shop) || amenity === "marketplace") {
        categoryType = "supermarket";
      } else if (["cafe", "restaurant", "fast_food", "food_court"].includes(amenity)) {
        categoryType = "cafeRestaurant";
      } else if (["university", "college", "school", "kindergarten"].includes(amenity)) {
        categoryType = "universityGate";
      }

      if (!categoryType) continue;

      parsedPlaces.push({
        name,
        lat: placeLat,
        lng: placeLng,
        type: categoryType,
        distanceMeters,
        osmType: String(el.type || "node"),
        osmId: String(el.id || ""),
      });
    }

    // Filter duplicates (same category & very close coordinate or name)
    const uniquePlaces: typeof parsedPlaces = [];
    for (const p of parsedPlaces) {
      const isDuplicate = uniquePlaces.some(
        (u) =>
          u.type === p.type &&
          (u.name === p.name || (u.osmType === p.osmType && u.osmId === p.osmId) || getHaversineDistance(u.lat, u.lng, p.lat, p.lng) < 20)
      );
      if (!isDuplicate) {
        uniquePlaces.push(p);
      }
    }

    // Sort by proximity
    uniquePlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Group into lists
    const lists: Record<string, AmenityDetail[]> = {
      hospital: [],
      pharmacy: [],
      transportation: [],
      supermarket: [],
      cafeRestaurant: [],
      universityGate: [],
    };

    for (const p of uniquePlaces) {
      const minutesWalk = Math.max(1, Math.round(p.distanceMeters / 80));
      const formattedWalk = minutesWalk === 1 ? "دقيقة واحدة مشياً" : minutesWalk === 2 ? "دقيقتان مشياً" : `${minutesWalk} دقائق مشياً`;

      lists[p.type].push({
        name: p.name,
        distance: formatDistanceWithLabel(p.distanceMeters, true),
        time: formattedWalk,
        // Mkany Admin is the sole source of truth for service rating.
        // Unrated places display "لم يتم تقييمه بعد" or omit rating.
        rating: undefined,
        lat: p.lat,
        lng: p.lng,
        osmType: p.osmType,
        osmId: p.osmId,
        distanceMeters: p.distanceMeters,
        isGeographicOnly: true,
        walkTimeFormatted: "بيانات مسار المشي غير متاحة",
        driveTimeFormatted: "بيانات مسار السيارة غير متاحة",
      });
    }

    // Load any existing Mkany Admin ratings from service_ratings table
    try {
      const validOsmPlaces = uniquePlaces.filter((p) => p.osmType && p.osmId);
      if (validOsmPlaces.length > 0) {
        const osmConditions = validOsmPlaces.map((p) =>
          and(eq(serviceRatings.osmType, p.osmType), eq(serviceRatings.osmId, p.osmId))
        );
        const existingRatings = await db
          .select()
          .from(serviceRatings)
          .where(or(...osmConditions));

        const ratingMap = new Map<string, number>();
        for (const row of existingRatings) {
          ratingMap.set(`${row.osmType}_${row.osmId}`, row.rating);
        }

        for (const cat of Object.keys(lists)) {
          for (const item of lists[cat]) {
            if (item.osmType && item.osmId) {
              const key = `${item.osmType}_${item.osmId}`;
              if (ratingMap.has(key)) {
                const r = ratingMap.get(key)!;
                item.rating = Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1);
              }
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn("Could not query serviceRatings from DB:", dbErr);
    }

    // Assign to main object lists
    amenitiesResult.hospitalList = lists.hospital;
    amenitiesResult.pharmacyList = lists.pharmacy;
    amenitiesResult.transportationList = lists.transportation;
    amenitiesResult.supermarketList = lists.supermarket;
    amenitiesResult.cafeRestaurantList = lists.cafeRestaurant;
    amenitiesResult.universityGateList = lists.universityGate;

    // Set closest as the primary object
    const categoriesKeys = ["hospital", "pharmacy", "transportation", "supermarket", "cafeRestaurant", "universityGate"];
    for (const cat of categoriesKeys) {
      const catList = lists[cat];
      if (catList.length > 0) {
        (amenitiesResult as any)[cat] = { ...catList[0] };
      } else {
        const labels: Record<string, string> = {
          hospital: "سوبرماركت أو صيدلية أو مستشفى",
          pharmacy: "صيدلية",
          transportation: "محطة مواصلات",
          supermarket: "سوبرماركت",
          cafeRestaurant: "مطعم أو كافيه",
          universityGate: "بوابة جامعة أو تعليم",
        };
        (amenitiesResult as any)[cat] = {
          name: `لا توجد بيانات ${labels[cat] || cat} متاحة في النطاق الحالي`,
          distance: "لا توجد بيانات متاحة",
          time: "لا توجد بيانات متاحة",
          isGeographicOnly: true,
        };
      }
    }

  } catch (error) {
    console.error("Failed to query Overpass API or parse data:", error);
  }

  return amenitiesResult;
}

/**
 * Enriches a NearbyAmenities object with the latest Mkany Admin ratings from DB.
 */
export async function enrichAmenitiesWithAdminRatings(amenities: NearbyAmenities): Promise<NearbyAmenities> {
  if (!amenities) return amenities;
  try {
    const allItems: AmenityDetail[] = [];
    const categoriesKeys = ["hospital", "pharmacy", "transportation", "supermarket", "cafeRestaurant", "universityGate"] as const;
    for (const cat of categoriesKeys) {
      if ((amenities as any)[cat]?.osmType && (amenities as any)[cat]?.osmId) {
        allItems.push((amenities as any)[cat]);
      }
      const list = (amenities as any)[`${cat}List`];
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.osmType && item?.osmId) {
            allItems.push(item);
          }
        }
      }
    }

    if (allItems.length === 0) return amenities;

    const conditions = allItems.map((item) =>
      and(eq(serviceRatings.osmType, item.osmType!), eq(serviceRatings.osmId, item.osmId!))
    );

    const records = await db
      .select()
      .from(serviceRatings)
      .where(or(...conditions));

    const ratingMap = new Map<string, number>();
    for (const r of records) {
      ratingMap.set(`${r.osmType}_${r.osmId}`, r.rating);
    }

    for (const item of allItems) {
      const key = `${item.osmType}_${item.osmId}`;
      if (ratingMap.has(key)) {
        const val = ratingMap.get(key)!;
        item.rating = Number.isInteger(val) ? val.toFixed(0) : val.toFixed(1);
      }
    }
  } catch (err) {
    console.warn("Failed to enrich amenities with ratings:", err);
  }
  return amenities;
}
