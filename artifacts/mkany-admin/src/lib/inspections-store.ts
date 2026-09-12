import { getDerivedAmenityCoords, getCityDefaultCoordinates } from "./geo-utils";
import {
  uploadSingleImageApi,
  uploadMultipleImagesApi,
  getInspectionsApi,
  getInspectionByIdApi,
  createInspectionApi,
  updateInspectionApi,
  publishInspectionApi,
  getApartmentsApi,
} from "./api-client";

export interface PropertyInspection {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  title: string;
  address: string;
  city: string;
  university: string;
  roomType: string;
  pricePerMonth: number;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  furnishing: string;
  initialPhotos: string[];
  notes?: string;
  preferredInspectionDate?: string;
  lat?: number;
  lng?: number;
  
  status: "pending" | "scheduled" | "inspected" | "approved" | "rejected";
  
  scheduledDate?: string;
  inspectorName?: string;
  inspectorReport?: string;
  livabilityScore?: number;
  video360Url?: string;
  finalImages?: string[];
  rejectionReason?: string;
  publishedPropertyId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmenityDetail {
  distance: string;
  time: string;
  name?: string;
  rating?: string;
  lat?: number;
  lng?: number;
}

export interface NearbyAmenities {
  hospital: AmenityDetail;
  pharmacy: AmenityDetail;
  transportation: AmenityDetail;
  supermarket: AmenityDetail;
  cafeRestaurant: AmenityDetail;
  universityGate: AmenityDetail;
}

export interface PlatformProperty {
  id: number;
  title: string;
  address: string;
  city: string;
  university: string;
  pricePerMonth: number;
  roomType: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  floor: string;
  furnishing: string;
  availableFrom: string;
  currentRoommates: number;
  images: string[];
  video360Url: string | null;
  model3dUrl?: string | null;
  verified: boolean;
  premium: boolean;
  livabilityScore: number;
  status: "متاح" | "مشغول" | "قيد المراجعة" | "مرفوض";
  ownerId?: string;
  inspectionId?: string;
  lat?: number;
  lng?: number;
  nearbyAmenities?: NearbyAmenities;
}

const STORAGE_INSPECTIONS_KEY = "mkany_inspections_requests_v1";
const STORAGE_PROPERTIES_KEY = "mkany_platform_properties_v1";

const INITIAL_INSPECTIONS: PropertyInspection[] = [
  {
    id: "insp_101",
    ownerId: "usr_owner_01",
    ownerName: "المهندس محمود عبد العزيز",
    ownerPhone: "01287654321",
    ownerEmail: "owner.mahmoud@mkany.eg",
    title: "شقة طلابية واسعة أمام بوابة الزراعة",
    address: "شارع معهد الكبد، أمام بوابة كلية الزراعة، كفر الشيخ",
    city: "كفر الشيخ",
    university: "جامعة كفر الشيخ",
    roomType: "شقة مشتركة",
    pricePerMonth: 850,
    areaSqm: 115,
    bedrooms: 3,
    bathrooms: 2,
    floor: "الدور الثاني",
    furnishing: "مفروشة بالكامل",
    initialPhotos: [
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ],
    notes: "شقة حديثة التشطيب، مجهزة بغسالة أتوماتيك وثلاجة وشبكة واي فاي فايبر سريعة، جاهزة للمعاينة يوم الأحد أو الإثنين.",
    preferredInspectionDate: "الأحد القادم - صباحاً",
    status: "scheduled",
    scheduledDate: "الأحد، الساعة ١١:٠٠ صباحاً",
    inspectorName: "م. طارق سالم (فريق المعاينة)",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "insp_102",
    ownerId: "usr_owner_01",
    ownerName: "المهندس محمود عبد العزيز",
    ownerPhone: "01287654321",
    ownerEmail: "owner.mahmoud@mkany.eg",
    title: "استوديو هادئ للمذاكرة شارع الجيش",
    address: "شارع الجيش، متفرع من شارع النبوي المهندس، كفر الشيخ",
    city: "كفر الشيخ",
    university: "جامعة كفر الشيخ",
    roomType: "استوديو",
    pricePerMonth: 1350,
    areaSqm: 55,
    bedrooms: 1,
    bathrooms: 1,
    floor: "الدور الثالث (يوجد أسانسير)",
    furnishing: "مفروشة بالكامل",
    initialPhotos: [
      "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200",
      "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ],
    notes: "مناسب لطالب دكتوراه أو ماجستير أو طب يبحث عن الهدوء التام والخصوصية.",
    preferredInspectionDate: "أي وقت في المساء",
    status: "pending",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export function getDefaultAmenities(city: string = "كفر الشيخ", university: string = "جامعة كفر الشيخ"): NearbyAmenities {
  const isMansoura = city.includes("المنصورة") || university.includes("المنصورة");
  const isTanta = city.includes("طنطا") || university.includes("طنطا");

  if (isMansoura) {
    return {
      hospital: { distance: "٤٠٠م", time: "٦ دقائق مشياً", name: "مستشفى الطوارئ الجامعي بالمنصورة", rating: "4.7" },
      pharmacy: { distance: "٥٠م", time: "دقيقة واحدة", name: "صيدلية د. رشدي (خدمة ٢٤ ساعة)", rating: "5.0" },
      transportation: { distance: "١٠٠م", time: "دقيقة ونصف", name: "محطة سرفيس جيهان - بوابة الجامعة", rating: "4.5" },
      supermarket: { distance: "٢٠٠م", time: "٣ دقائق", name: "سوبرماركت أولاد رجب وهايبر المحطة", rating: "4.3" },
      cafeRestaurant: { distance: "٥٠م", time: "دقيقة واحدة", name: "كافيه ومساحة مذاكرة بوسطة للطلاب", rating: "4.8" },
      universityGate: { distance: "٣٠٠م", time: "٤ دقائق مشياً", name: "بوابة الجلاء - جامعة المنصورة", rating: "4.9" },
    };
  }

  if (isTanta) {
    return {
      hospital: { distance: "٦٠٠م", time: "٨ دقائق مشياً", name: "المستشفى التعليمي العالمي بطنطا", rating: "4.6" },
      pharmacy: { distance: "١٢٠م", time: "دقيقتان", name: "صيدلية الشروق المركزية", rating: "4.9" },
      transportation: { distance: "١٨٠م", time: "٣ دقائق", name: "موقف ميكروباصات شارع البحر والمحطة", rating: "4.3" },
      supermarket: { distance: "٣٥٠م", time: "٥ دقائق", name: "فتح الله جملة ماركت", rating: "4.5" },
      cafeRestaurant: { distance: "٩٠م", time: "دقيقة واحدة", name: "كافيه لاونج الطلاب ومطاعم سريعة", rating: "4.6" },
      universityGate: { distance: "٤٥٠م", time: "٦ دقائق مشياً", name: "بوابة مجمع الكليات الطبي - جامعة طنطا", rating: "4.8" },
    };
  }

  return {
    hospital: { distance: "٥٠٠م", time: "٨ دقائق مشياً", name: "مستشفى كفر الشيخ الجامعي العام", rating: "4.6" },
    pharmacy: { distance: "١٥٠م", time: "دقيقتان", name: "صيدلية العزبي (خدمة توصيل ٢٤ ساعة)", rating: "5.0" },
    transportation: { distance: "٢٠٠م", time: "٣ دقائق", name: "محطة سرفيس الجلاء والجامعة وموقف السرفيس", rating: "4.4" },
    supermarket: { distance: "٣٠0م", time: "٥ دقائق", name: "هايبر كازيون وسوبرماركت خير زمان", rating: "4.4" },
    cafeRestaurant: { distance: "١٠٠م", time: "دقيقة واحدة", name: "كافيه ومطعم استراحة الطالب للمذاكرة", rating: "4.7" },
    universityGate: { distance: "٨٠٠م", time: "١٠ دقائق مشياً", name: "بوابة كلية الزراعة / مجمع الكليات", rating: "4.8" },
  };
}

export function getEffectiveAmenities(property: Partial<PlatformProperty>): NearbyAmenities {
  const def = getDefaultAmenities(property.city, property.university);
  if (!property.nearbyAmenities) return def;

  return {
    hospital: property.nearbyAmenities.hospital || def.hospital,
    pharmacy: property.nearbyAmenities.pharmacy || def.pharmacy,
    transportation: property.nearbyAmenities.transportation || def.transportation,
    supermarket: property.nearbyAmenities.supermarket || def.supermarket,
    cafeRestaurant: property.nearbyAmenities.cafeRestaurant || def.cafeRestaurant,
    universityGate: property.nearbyAmenities.universityGate || def.universityGate,
  };
}

export interface AmenityDisplayItem {
  key: keyof NearbyAmenities;
  categoryName: string;
  distance: string;
  time: string;
  name?: string;
  rating?: string;
  lat?: number;
  lng?: number;
  iconType: "hospital" | "pharmacy" | "transportation" | "supermarket" | "cafeRestaurant" | "universityGate";
}

export function getAmenitiesDisplayList(amenities: NearbyAmenities, propertyLat?: number, propertyLng?: number): AmenityDisplayItem[] {
  const baseLat = propertyLat || 31.1128;
  const baseLng = propertyLng || 30.9392;

  return [
    {
      key: "universityGate",
      categoryName: "بوابة الجامعة",
      distance: amenities.universityGate.distance || "٨٠٠م",
      time: amenities.universityGate.time || "١٠ دقائق",
      name: amenities.universityGate.name,
      rating: amenities.universityGate.rating || "4.8",
      lat: amenities.universityGate.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "universityGate").lat,
      lng: amenities.universityGate.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "universityGate").lng,
      iconType: "universityGate",
    },
    {
      key: "transportation",
      categoryName: "محطة مواصلات",
      distance: amenities.transportation.distance || "٢٠٠م",
      time: amenities.transportation.time || "٣ دقائق",
      name: amenities.transportation.name,
      rating: amenities.transportation.rating || "4.4",
      lat: amenities.transportation.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "transportation").lat,
      lng: amenities.transportation.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "transportation").lng,
      iconType: "transportation",
    },
    {
      key: "hospital",
      categoryName: "أقرب مستشفى",
      distance: amenities.hospital.distance || "٥٠٠م",
      time: amenities.hospital.time || "٨ دقائق",
      name: amenities.hospital.name,
      rating: amenities.hospital.rating || "4.6",
      lat: amenities.hospital.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "hospital").lat,
      lng: amenities.hospital.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "hospital").lng,
      iconType: "hospital",
    },
    {
      key: "pharmacy",
      categoryName: "صيدلية",
      distance: amenities.pharmacy.distance || "١٥٠م",
      time: amenities.pharmacy.time || "دقيقتان",
      name: amenities.pharmacy.name,
      rating: amenities.pharmacy.rating || "5.0",
      lat: amenities.pharmacy.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "pharmacy").lat,
      lng: amenities.pharmacy.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "pharmacy").lng,
      iconType: "pharmacy",
    },
    {
      key: "supermarket",
      categoryName: "سوبرماركت",
      distance: amenities.supermarket.distance || "٣٠٠م",
      time: amenities.supermarket.time || "٥ دقائق",
      name: amenities.supermarket.name,
      rating: amenities.supermarket.rating || "4.3",
      lat: amenities.supermarket.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "supermarket").lat,
      lng: amenities.supermarket.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "supermarket").lng,
      iconType: "supermarket",
    },
    {
      key: "cafeRestaurant",
      categoryName: "كافيه / مطعم",
      distance: amenities.cafeRestaurant.distance || "١٠٠م",
      time: amenities.cafeRestaurant.time || "دقيقة واحدة",
      name: amenities.cafeRestaurant.name,
      rating: amenities.cafeRestaurant.rating || "4.7",
      lat: amenities.cafeRestaurant.lat ?? getDerivedAmenityCoords(baseLat, baseLng, "cafeRestaurant").lat,
      lng: amenities.cafeRestaurant.lng ?? getDerivedAmenityCoords(baseLat, baseLng, "cafeRestaurant").lng,
      iconType: "cafeRestaurant",
    },
  ];
}

const BASE_PROPERTIES: PlatformProperty[] = [];

export const INSPECTIONS_CHANGE_EVENT = "mkany_inspections_updated";
export const PROPERTIES_CHANGE_EVENT = "mkany_properties_updated";

export async function uploadImageFile(file: File): Promise<string> {
  const data = await uploadSingleImageApi(file);
  return data.url;
}

export async function uploadImageFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const data = await uploadMultipleImagesApi(files);
  return data.urls;
}

export async function syncInspectionsFromApi(): Promise<PropertyInspection[]> {
  try {
    const data = await getInspectionsApi();
    if (Array.isArray(data) && data.length > 0) {
      saveInspections(data);
      return data;
    }
  } catch (err) {
    console.warn("Could not sync inspections from API:", err);
  }
  return getAllInspections();
}

export function getAllInspections(): PropertyInspection[] {
  if (typeof window === "undefined") return INITIAL_INSPECTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_INSPECTIONS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_INSPECTIONS_KEY, JSON.stringify(INITIAL_INSPECTIONS));
      return INITIAL_INSPECTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_INSPECTIONS;
  } catch (e) {
    return INITIAL_INSPECTIONS;
  }
}

function saveInspections(list: PropertyInspection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INSPECTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(INSPECTIONS_CHANGE_EVENT));
  } catch (e) {
    console.error("Failed to save inspections:", e);
  }
}

export function createInspectionRequest(
  data: Omit<PropertyInspection, "id" | "status" | "createdAt" | "updatedAt">
): PropertyInspection {
  const current = getAllInspections();
  const now = new Date().toISOString();
  const id = `insp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const newInspection: PropertyInspection = {
    ...data,
    id,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newInspection, ...current];
  saveInspections(updated);

  createInspectionApi(data)
    .then((saved) => {
      const refreshed = [saved, ...getAllInspections().filter((x) => x.id !== id && x.id !== saved.id)];
      saveInspections(refreshed);
    })
    .catch((err) => {
      console.error("Error persisting inspection to API:", err);
    });

  return newInspection;
}

export async function createInspectionRequestAsync(
  data: Omit<PropertyInspection, "id" | "status" | "createdAt" | "updatedAt">
): Promise<PropertyInspection> {
  const current = getAllInspections();

  const saved = await createInspectionApi(data);
  const updated = [saved, ...current.filter((x) => x.id !== saved.id)];
  saveInspections(updated);
  return saved;
}

export function scheduleInspectionVisit(
  id: string,
  scheduledDate: string,
  inspectorName: string,
  inspectorNotes?: string
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "scheduled",
    scheduledDate,
    inspectorName,
    inspectorReport: inspectorNotes || list[index].inspectorReport,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  updateInspectionApi(id, {
    status: "scheduled",
    scheduledDate,
    inspectorName,
    inspectorReport: inspectorNotes || list[index].inspectorReport,
  }).catch((e) => console.error("Failed to patch inspection schedule in DB:", e));

  return updated;
}

export function markInspectionCompleted(
  id: string,
  inspectorReport: string,
  livabilityScore: number
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "inspected",
    inspectorReport,
    livabilityScore,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  updateInspectionApi(id, {
    status: "inspected",
    inspectorReport,
    livabilityScore,
  }).catch((e) => console.error("Failed to patch inspection completion in DB:", e));

  return updated;
}

export function rejectInspectionRequest(
  id: string,
  rejectionReason: string
): PropertyInspection | null {
  const list = getAllInspections();
  const index = list.findIndex((x) => x.id === id);
  if (index === -1) return null;

  const updated: PropertyInspection = {
    ...list[index],
    status: "rejected",
    rejectionReason,
    updatedAt: new Date().toISOString(),
  };

  list[index] = updated;
  saveInspections(list);

  updateInspectionApi(id, {
    status: "rejected",
    rejectionReason,
  }).catch((e) => console.error("Failed to patch inspection rejection in DB:", e));

  return updated;
}

export async function syncPlatformPropertiesFromApi(statusParam: string = "all"): Promise<PlatformProperty[]> {
  try {
    const dbApartments = await getApartmentsApi({ status: statusParam });
    if (Array.isArray(dbApartments) && dbApartments.length > 0) {
      const mapped: PlatformProperty[] = dbApartments.map((a: any) => ({
        id: a.id,
        title: a.title,
        address: a.address,
        city: a.city,
        university: a.university,
        pricePerMonth: a.pricePerMonth || a.price,
        roomType: a.roomType || "شقة مشتركة",
        areaSqm: a.areaSqm,
        bedrooms: a.bedrooms,
        bathrooms: a.bathrooms,
        floor: a.floor,
        furnishing: a.furnishing,
        availableFrom: a.availableFrom || "متاح الآن فوراً",
        currentRoommates: a.currentRoommates || 0,
        images: Array.isArray(a.images) && a.images.length > 0
          ? a.images
          : (a.photos && a.photos.length > 0 ? a.photos.map((p: any) => p.url) : []),
        video360Url: a.video360Url || null,
        model3dUrl: a.model3dUrl || null,
        verified: a.verified ?? true,
        premium: a.premium ?? true,
        livabilityScore: a.livabilityScore || 90,
        status: a.status || "متاح",
        ownerId: a.ownerId,
        inspectionId: a.inspectionId,
        lat: a.lat,
        lng: a.lng,
        nearbyAmenities: a.nearbyAmenities || getEffectiveAmenities(a),
      }));
      savePlatformProperties(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("Failed to sync apartments from DB API:", err);
  }
  return getAllPlatformProperties();
}

export function getAllPlatformProperties(): PlatformProperty[] {
  if (typeof window === "undefined") return BASE_PROPERTIES;
  try {
    const raw = localStorage.getItem(STORAGE_PROPERTIES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PROPERTIES_KEY, JSON.stringify(BASE_PROPERTIES));
      return BASE_PROPERTIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((p: PlatformProperty) => ({
        ...p,
        nearbyAmenities: getEffectiveAmenities(p),
      }));
    }
    return BASE_PROPERTIES;
  } catch (e) {
    return BASE_PROPERTIES;
  }
}

function savePlatformProperties(props: PlatformProperty[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PROPERTIES_KEY, JSON.stringify(props));
    window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
  } catch (e) {
    console.error("Failed to save platform properties:", e);
  }
}

export function activateAndPublishProperty(
  inspectionId: string,
  details: {
    video360Url?: string;
    model3dUrl?: string;
    finalImages?: string[];
    livabilityScore?: number;
    inspectorReport?: string;
    nearbyAmenities?: NearbyAmenities;
  }
): { inspection: PropertyInspection; property: PlatformProperty } | null {
  const inspections = getAllInspections();
  const index = inspections.findIndex((x) => x.id === inspectionId);
  if (index === -1) return null;

  const insp = inspections[index];
  const properties = getAllPlatformProperties();
  const newPropertyId = properties.length ? Math.max(...properties.map((p) => p.id)) + 1 : 1;

  const score = details.livabilityScore || insp.livabilityScore || 92;
  const video360 = details.video360Url || "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4";
  const images = details.finalImages && details.finalImages.length > 0 
    ? details.finalImages 
    : (insp.initialPhotos.length > 0 ? insp.initialPhotos : [
        "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200"
      ]);

  const amenities = details.nearbyAmenities || getEffectiveAmenities({ city: insp.city, university: insp.university });

  const newProperty: PlatformProperty = {
    id: newPropertyId,
    title: insp.title,
    address: insp.address,
    city: insp.city,
    university: insp.university,
    pricePerMonth: insp.pricePerMonth,
    roomType: insp.roomType,
    areaSqm: insp.areaSqm,
    bedrooms: insp.bedrooms,
    bathrooms: insp.bathrooms,
    floor: insp.floor,
    furnishing: insp.furnishing,
    availableFrom: "متاح الآن فوراً",
    currentRoommates: 0,
    images: images,
    video360Url: video360,
    model3dUrl: details.model3dUrl || (insp as any).model3dUrl || null,
    verified: true,
    premium: true,
    livabilityScore: score,
    status: "متاح",
    ownerId: insp.ownerId,
    inspectionId: insp.id,
    lat: insp.lat,
    lng: insp.lng,
    nearbyAmenities: amenities,
  };

  savePlatformProperties([newProperty, ...properties]);

  const updatedInspection: PropertyInspection = {
    ...insp,
    status: "approved",
    video360Url: video360,
    finalImages: images,
    livabilityScore: score,
    inspectorReport: details.inspectorReport || insp.inspectorReport || "تمت المعاينة الميدانية واعتماد الوحدة بنجاح مع مطابقة المواصفات.",
    publishedPropertyId: newPropertyId,
    updatedAt: new Date().toISOString(),
  };

  inspections[index] = updatedInspection;
  saveInspections(inspections);

  publishInspectionApi(inspectionId, {
    video360Url: video360,
    finalImages: images,
    livabilityScore: score,
    inspectorReport: details.inspectorReport || insp.inspectorReport,
    nearbyAmenities: amenities,
  }).catch((err) => {
    console.error("Error publishing property to database:", err);
  });

  return { inspection: updatedInspection, property: newProperty };
}

export async function activateAndPublishPropertyAsync(
  inspectionId: string,
  details: {
    video360Url?: string;
    model3dUrl?: string;
    finalImages?: string[];
    livabilityScore?: number;
    inspectorReport?: string;
    nearbyAmenities?: NearbyAmenities;
  }
): Promise<{ inspection: PropertyInspection; property: PlatformProperty } | null> {
  const result = await publishInspectionApi(inspectionId, details);
  if (result) {
    await syncInspectionsFromApi();
    await syncPlatformPropertiesFromApi();
  }
  return activateAndPublishProperty(inspectionId, details);
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
  }, 100);
}

export function updatePlatformProperty(
  id: number,
  updatedData: Partial<PlatformProperty>
): PlatformProperty | null {
  const properties = getAllPlatformProperties();
  const index = properties.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const updated: PlatformProperty = {
    ...properties[index],
    ...updatedData,
  };

  properties[index] = updated;
  savePlatformProperties(properties);
  return updated;
}

export function deletePlatformProperty(id: number): boolean {
  const properties = getAllPlatformProperties();
  const filtered = properties.filter((p) => p.id !== id);
  if (filtered.length === properties.length) return false;
  savePlatformProperties(filtered);
  return true;
}

export function addNewPlatformProperty(
  data: Omit<PlatformProperty, "id">
): PlatformProperty {
  const properties = getAllPlatformProperties();
  const newId = properties.length ? Math.max(...properties.map((p) => p.id)) + 1 : 1;
  const newProperty: PlatformProperty = {
    ...data,
    id: newId,
  };

  const updated = [newProperty, ...properties];
  savePlatformProperties(updated);
  return newProperty;
}
