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

/**
 * نظام إدارة طلبات المعاينة وتوثيق العقارات (Inspection Cycle & Properties Store)
 * يدير دورة حياة العقار:
 * 1. إرسال المالك لطلب معاينة أولي مع صور العقار
 * 2. حفظ الطلب وتنسيق مراجعة الـ Admin وتحديد موعد المعاينة الميدانية
 * 3. نزول فريق المعاينة الفعلي وتوثيق العقار والتقاط صور 360°
 * 4. تفعيل العقار ونشره فوراً على المنصة للطلاب
 */

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
  
  // دورة الحالة:
  // pending: طلب جديد ينتظر مراجعة الإدارة وتنسيق الموعد
  // scheduled: تم تحديد موعد المعاينة الميدانية واسم المهندس المعاين
  // inspected: تمت المعاينة الميدانية وجاهز للاعتماد النهائي
  // approved: تم تفعيل العقار ورفع جولة 360° ونشره للطلاب
  // rejected: مرفوض مع توضيح السبب
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
  distance: string; // مثال: "٥٠٠م" أو "1.2 كم"
  time: string;     // مثال: "٨ دقائق مشياً"
  name?: string;     // اسم المكان: مثال "مستشفى كفر الشيخ الجامعي"
  rating?: string;   // التقييم: مثال "4.7"
  lat?: number;      // إحداثيات خط العرض للخدمة
  lng?: number;      // إحداثيات خط الطول للخدمة
}

export interface NearbyAmenities {
  hospital: AmenityDetail;        // أقرب مستشفى
  pharmacy: AmenityDetail;        // صيدلية
  transportation: AmenityDetail;  // محطة مواصلات
  supermarket: AmenityDetail;     // سوبرماركت
  cafeRestaurant: AmenityDetail;  // كافيه / مطعم
  universityGate: AmenityDetail;  // بوابة الجامعة
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
  verified: boolean;
  premium: boolean;
  livabilityScore: number;
  status: "متاح" | "مشغول" | "قيد المراجعة";
  ownerId?: string;
  inspectionId?: string;
  lat?: number;
  lng?: number;
  nearbyAmenities?: NearbyAmenities;
}

const STORAGE_INSPECTIONS_KEY = "mkany_inspections_requests_v1";
const STORAGE_PROPERTIES_KEY = "mkany_platform_properties_v1";

// عينات أولية لطلبات المعاينة لتجربة واقعية فورية
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
  const isKafr = city.includes("كفر الشيخ") || university.includes("كفر الشيخ");
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

  // كفر الشيخ والمدن الأخرى الافتراضية
  return {
    hospital: { distance: "٥٠٠م", time: "٨ دقائق مشياً", name: "مستشفى كفر الشيخ الجامعي العام", rating: "4.6" },
    pharmacy: { distance: "١٥٠م", time: "دقيقتان", name: "صيدلية العزبي (خدمة توصيل ٢٤ ساعة)", rating: "5.0" },
    transportation: { distance: "٢٠٠م", time: "٣ دقائق", name: "محطة سرفيس الجلاء والجامعة وموقف السرفيس", rating: "4.4" },
    supermarket: { distance: "٣٠٠م", time: "٥ دقائق", name: "هايبر كازيون وسوبرماركت خير زمان", rating: "4.4" },
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

// الوحدات الست الأساسية للمنصة مع بيانات المنطقة المحيطة الكاملة
const BASE_PROPERTIES: PlatformProperty[] = [
  { 
    id: 1, 
    title: "غرفة مضيئة قرب الجلاء", 
    address: "شارع الجلاء، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 950, 
    roomType: "غرفة مزدوجة", 
    areaSqm: 105, 
    bedrooms: 3, 
    bathrooms: 2, 
    floor: "الثالث", 
    furnishing: "مفروشة بالكامل", 
    availableFrom: "١ سبتمبر ٢٠٢٤", 
    currentRoommates: 2, 
    images: [
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: "https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4", 
    verified: true, 
    premium: true, 
    livabilityScore: 87, 
    status: "متاح",
    ownerId: "usr_owner_01",
    nearbyAmenities: {
      hospital: { distance: "٥٠٠م", time: "٨ دقائق مشياً", name: "مستشفى كفر الشيخ الجامعي", rating: "4.6" },
      pharmacy: { distance: "١٥٠م", time: "دقيقتان", name: "صيدلية العزبي - شارع الجلاء", rating: "5.0" },
      transportation: { distance: "٢٠٠م", time: "٣ دقائق", name: "محطة سرفيس الجلاء وموقف الجامعة", rating: "4.4" },
      supermarket: { distance: "٣٠٠م", time: "٥ دقائق", name: "سوبرماركت كازيون ماركت", rating: "4.3" },
      cafeRestaurant: { distance: "١٠٠م", time: "دقيقة واحدة", name: "كافيه استراحة المذاكرة ومطعم فول وفلافل", rating: "4.7" },
      universityGate: { distance: "٨٠٠م", time: "١٠ دقائق مشياً", name: "بوابة كلية الزراعة الرئيسية", rating: "4.8" },
    }
  },
  { 
    id: 2, 
    title: "شقة هادئة للطالبات", 
    address: "شارع النباوي المهندس، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 750, 
    roomType: "غرفة في شقة", 
    areaSqm: 120, 
    bedrooms: 4, 
    bathrooms: 2, 
    floor: "الرابع", 
    furnishing: "مفروشة بالكامل", 
    availableFrom: "١٥ أغسطس ٢٠٢٤", 
    currentRoommates: 3, 
    images: [
      "https://images.pexels.com/photos/157811/pexels-photo-157811.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1743229/pexels-photo-1743229.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 92, 
    status: "متاح",
    ownerId: "usr_owner_01",
    nearbyAmenities: {
      hospital: { distance: "٦٥٠م", time: "٩ دقائق مشياً", name: "مستشفى العبور التخصصي", rating: "4.5" },
      pharmacy: { distance: "١٠٠م", time: "دقيقة ونصف", name: "صيدلية النبوي - خدمة طالبات", rating: "5.0" },
      transportation: { distance: "١٥٠م", time: "دقيقتان", name: "موقف ميكروباصات النبوي ومحطة السرفيس", rating: "4.6" },
      supermarket: { distance: "٢٥٠م", time: "٤ دقائق", name: "سوبرماركت الأهرام ماركت", rating: "4.4" },
      cafeRestaurant: { distance: "٨٠م", time: "دقيقة واحدة", name: "كافيه هادئ مخصص للدراسة", rating: "4.9" },
      universityGate: { distance: "٦٠٠م", time: "٧ دقائق مشياً", name: "بوابة مجمع الكليات الشرقي", rating: "4.9" },
    }
  },
  { 
    id: 3, 
    title: "استوديو جيهان العصري", 
    address: "شارع جيهان، المنصورة", 
    city: "المنصورة", 
    university: "جامعة المنصورة", 
    pricePerMonth: 1200, 
    roomType: "استوديو", 
    areaSqm: 55, 
    bedrooms: 1, 
    bathrooms: 1, 
    floor: "الثاني", 
    furnishing: "مفروشة بالكامل", 
    availableFrom: "١ أكتوبر ٢٠٢٤", 
    currentRoommates: 0, 
    images: [
      "https://images.pexels.com/photos/1571453/pexels-photo-1571453.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/276724/pexels-photo-276724.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/271816/pexels-photo-271816.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: true, 
    livabilityScore: 95, 
    status: "متاح",
    ownerId: "usr_owner_02",
    nearbyAmenities: {
      hospital: { distance: "٤٠٠م", time: "٥ دقائق مشياً", name: "مستشفى الطوارئ الجامعي بالمنصورة", rating: "4.7" },
      pharmacy: { distance: "٥٠م", time: "دقيقة واحدة", name: "صيدلية رشدي - شارع جيهان", rating: "5.0" },
      transportation: { distance: "١٠٠م", time: "دقيقة ونصف", name: "محطة سرفيس جيهان للجامعة", rating: "4.7" },
      supermarket: { distance: "٢٠٠م", time: "٣ دقائق", name: "هايبر ماركت سعودي بالمنصورة", rating: "4.6" },
      cafeRestaurant: { distance: "٥٠م", time: "دقيقة واحدة", name: "كافيه بوسطة ومساحات عمل للطلبة", rating: "4.8" },
      universityGate: { distance: "٣٠٠م", time: "٤ دقائق مشياً", name: "بوابة الجلاء - جامعة المنصورة", rating: "5.0" },
    }
  },
  { 
    id: 4, 
    title: "بيت الطلبة على شارع الجامعة", 
    address: "شارع الجامعة، طنطا", 
    city: "طنطا", 
    university: "جامعة طنطا", 
    pricePerMonth: 850, 
    roomType: "غرفة مزدوجة", 
    areaSqm: 98, 
    bedrooms: 3, 
    bathrooms: 2, 
    floor: "الخامس", 
    furnishing: "مفروشة جزئياً", 
    availableFrom: "١ سبتمبر ٢٠٢٤", 
    currentRoommates: 2, 
    images: [
      "https://images.pexels.com/photos/1669799/pexels-photo-1669799.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1648776/pexels-photo-1648776.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 84, 
    status: "متاح",
    ownerId: "usr_owner_02",
    nearbyAmenities: {
      hospital: { distance: "٦٠٠م", time: "٨ دقائق مشياً", name: "المستشفى التعليمي العالمي بطنطا", rating: "4.6" },
      pharmacy: { distance: "١٢٠م", time: "دقيقتان", name: "صيدلية د. محمد عادل", rating: "4.8" },
      transportation: { distance: "١٨٠م", time: "٣ دقائق", name: "محطة ميكروباص شارع البحر", rating: "4.3" },
      supermarket: { distance: "٣٥٠م", time: "٥ دقائق", name: "فتح الله ماركت جملة", rating: "4.5" },
      cafeRestaurant: { distance: "٩٠م", time: "دقيقة واحدة", name: "كافيه الطلاب ومطعم الشام", rating: "4.6" },
      universityGate: { distance: "٤٥٠م", time: "٦ دقائق مشياً", name: "بوابة المجمع الطبي - جامعة طنطا", rating: "4.8" },
    }
  },
  { 
    id: 5, 
    title: "شقة كاملة في ميت خميس", 
    address: "ميت خميس، المنصورة", 
    city: "المنصورة", 
    university: "جامعة المنصورة", 
    pricePerMonth: 1800, 
    roomType: "شقة كاملة", 
    areaSqm: 145, 
    bedrooms: 3, 
    bathrooms: 2, 
    floor: "الأول", 
    furnishing: "مفروشة بالكامل", 
    availableFrom: "١ أغسطس ٢٠٢٤", 
    currentRoommates: 0, 
    images: [
      "https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/2029698/pexels-photo-2029698.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/2062431/pexels-photo-2062431.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: true, 
    livabilityScore: 89, 
    status: "مشغول",
    ownerId: "usr_owner_02",
    nearbyAmenities: {
      hospital: { distance: "١٫٢كم", time: "١٥ دقيقة مشياً", name: "مستشفى جامعة المنصورة الرئيسي", rating: "4.4" },
      pharmacy: { distance: "٢٠٠م", time: "٣ دقائق", name: "صيدلية الإيمان", rating: "4.7" },
      transportation: { distance: "٥٠م", time: "دقيقة واحدة", name: "موقف ميكروباصات ميت خميس للجامعة", rating: "4.5" },
      supermarket: { distance: "١٥٠م", time: "دقيقتان", name: "سوبرماركت البركة للمواد الغذائية", rating: "4.2" },
      cafeRestaurant: { distance: "١٢٠م", time: "دقيقتان", name: "مقهى ومطعم النيل الشبابي", rating: "4.3" },
      universityGate: { distance: "١٫٥كم", time: "١٨ دقيقة مشياً (٥ د سرفيس)", name: "بوابة كلية التجارة والآداب", rating: "4.6" },
    }
  },
  { 
    id: 6, 
    title: "سرير اقتصادي قريب من المواصلات", 
    address: "شارع بورسعيد، كفر الشيخ", 
    city: "كفر الشيخ", 
    university: "جامعة كفر الشيخ", 
    pricePerMonth: 650, 
    roomType: "سرير في غرفة مشتركة", 
    areaSqm: 88, 
    bedrooms: 4, 
    bathrooms: 2, 
    floor: "الثاني", 
    furnishing: "مفروشة بالكامل", 
    availableFrom: "١ أغسطس ٢٠٢٤", 
    currentRoommates: 3, 
    images: [
      "https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/276583/pexels-photo-276583.jpeg?auto=compress&cs=tinysrgb&w=1200", 
      "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=1200"
    ], 
    video360Url: null, 
    verified: true, 
    premium: false, 
    livabilityScore: 81, 
    status: "متاح",
    ownerId: "usr_owner_01",
    nearbyAmenities: {
      hospital: { distance: "٤٥٠م", time: "٧ دقائق مشياً", name: "مستشفى الهلال الأحمر بكفر الشيخ", rating: "4.5" },
      pharmacy: { distance: "٨٠م", time: "دقيقة واحدة", name: "صيدلية النور - شارع بورسعيد", rating: "4.9" },
      transportation: { distance: "١٠٠م", time: "دقيقة ونصف", name: "موقف محطة قطار كفر الشيخ وسرفيس الجامعة", rating: "4.8" },
      supermarket: { distance: "٢٠٠م", time: "٣ دقائق", name: "سوبرماركت أولاد رجب ومحل خضار", rating: "4.4" },
      cafeRestaurant: { distance: "٧٠م", time: "دقيقة واحدة", name: "كافيه استراحة ومطعم وجبات سريعة", rating: "4.5" },
      universityGate: { distance: "٩٥٠م", time: "١٢ دقيقة مشياً", name: "بوابة الجامعة الرئيسية (شارع الجيش)", rating: "4.7" },
    }
  },
];

export const INSPECTIONS_CHANGE_EVENT = "mkany_inspections_updated";
export const PROPERTIES_CHANGE_EVENT = "mkany_properties_updated";

/**
 * Upload single image file to server storage
 */
export async function uploadImageFile(file: File): Promise<string> {
  const data = await uploadSingleImageApi(file);
  return data.url;
}

/**
 * Upload multiple image files to server storage
 */
export async function uploadImageFiles(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const data = await uploadMultipleImagesApi(files);
  return data.urls;
}

/**
 * Synchronize inspections from PostgreSQL database via API
 */
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

/**
 * استرجاع كافة طلبات المعاينة
 */
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

/**
 * حفظ طلبات المعاينة محلياً وإطلاق الحدث
 */
function saveInspections(list: PropertyInspection[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_INSPECTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(INSPECTIONS_CHANGE_EVENT));
  } catch (e) {
    console.error("Failed to save inspections:", e);
  }
}

/**
 * إنشاء طلب معاينة جديد من قِبل المالك وحفظه في PostgreSQL عبر الـ API
 */
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

  // Send to backend PostgreSQL API with Bearer token
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

/**
 * النسخة غير المتزامنة لإنشاء طلب المعاينة
 */
export async function createInspectionRequestAsync(
  data: Omit<PropertyInspection, "id" | "status" | "createdAt" | "updatedAt">
): Promise<PropertyInspection> {
  const current = getAllInspections();

  // Call the authenticated API - throws on 401/403/500 so UI can display proper error
  const saved = await createInspectionApi(data);
  const updated = [saved, ...current.filter((x) => x.id !== saved.id)];
  saveInspections(updated);
  return saved;
}

/**
 * جدولة موعد المعاينة الميدانية بواسطة الآدمن وحفظ التعديل في PostgreSQL
 */
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

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "scheduled",
    scheduledDate,
    inspectorName,
    inspectorReport: inspectorNotes || list[index].inspectorReport,
  }).catch((e) => console.error("Failed to patch inspection schedule in DB:", e));

  return updated;
}

/**
 * تسجيل نزول المعاينة الفعلية بواسطة الآدمن وحفظ النتيجة في PostgreSQL
 */
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

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "inspected",
    inspectorReport,
    livabilityScore,
  }).catch((e) => console.error("Failed to patch inspection completion in DB:", e));

  return updated;
}

/**
 * رفض طلب المعاينة مع توضيح السبب وحفظ الرفض في PostgreSQL
 */
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

  // Sync to PostgreSQL backend via authenticated API
  updateInspectionApi(id, {
    status: "rejected",
    rejectionReason,
  }).catch((e) => console.error("Failed to patch inspection rejection in DB:", e));

  return updated;
}

/**
 * استرجاع العقارات المنشورة ومزامنتها مع PostgreSQL
 */
export async function syncPlatformPropertiesFromApi(): Promise<PlatformProperty[]> {
  try {
    const dbApartments = await getApartmentsApi();
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

/**
 * جلب جميع العقارات المعتمدة والمنشورة على المنصة
 */
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
      // التأكد من شمول كافة العقارات لبيانات المنطقة المحيطة الحية
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

/**
 * حفظ قائمة العقارات المنشورة وإخطار جميع واجهات العرض فورياً
 */
function savePlatformProperties(props: PlatformProperty[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PROPERTIES_KEY, JSON.stringify(props));
    window.dispatchEvent(new CustomEvent("mkany_properties_updated"));
  } catch (e) {
    console.error("Failed to save platform properties:", e);
  }
}

/**
 * تفعيل العقار رسمياً بعد المعاينة الميدانية ونشره للطلاب مع صور 360° وتفاصيل المنطقة المحيطة وحفظه في PostgreSQL
 */
export function activateAndPublishProperty(
  inspectionId: string,
  details: {
    video360Url?: string;
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

  // إنشاء العقار المنشور في الكتالوج الرئيسي للطلاب
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

  // إضافة العقار في الكتالوج
  savePlatformProperties([newProperty, ...properties]);

  // تحديث حالة المعاينة إلى approved
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

  // Sync publish operation to backend PostgreSQL using authenticated api-client
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

/**
 * النسخة غير المتزامنة لنشر وتفعيل العقار بعد المعاينة
 */
export async function activateAndPublishPropertyAsync(
  inspectionId: string,
  details: {
    video360Url?: string;
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

// Auto-sync initial data on browser startup
if (typeof window !== "undefined") {
  setTimeout(() => {
    syncInspectionsFromApi();
    syncPlatformPropertiesFromApi();
  }, 100);
}

/**
 * تحديث بيانات عقار منشور مباشرة من قِبل الآدمن (تعديل السعر، الصور، جولة 360°، العنوان، الحالة)
 */
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

/**
 * حذف أو إلغاء نشر عقار من الكتالوج الرئيسي للطلاب
 */
export function deletePlatformProperty(id: number): boolean {
  const properties = getAllPlatformProperties();
  const filtered = properties.filter((p) => p.id !== id);
  if (filtered.length === properties.length) return false;
  savePlatformProperties(filtered);
  return true;
}

/**
 * إضافة عقار جديد مباشرة إلى الكتالوج بواسطة الآدمن مع جولة 360°
 */
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
