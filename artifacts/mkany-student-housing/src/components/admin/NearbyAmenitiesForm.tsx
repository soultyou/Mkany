import React from "react";
import {
  Building2,
  Pill,
  Bus,
  ShoppingCart,
  Coffee,
  GraduationCap,
  Sparkles,
  MapPin,
  Clock,
  Star,
} from "lucide-react";
import { NearbyAmenities, AmenityDetail } from "@/lib/inspections-store";
import {
  calcHaversineDistanceMeters,
  formatDistanceArabic,
  formatWalkingTimeArabic,
  getDerivedAmenityCoords,
  getCityDefaultCoordinates,
} from "@/lib/geo-utils";

interface NearbyAmenitiesFormProps {
  amenities: NearbyAmenities;
  onChange: (updated: NearbyAmenities) => void;
  city?: string;
  university?: string;
  propertyLat?: number;
  propertyLng?: number;
}

export function NearbyAmenitiesForm({
  amenities,
  onChange,
  city,
  university,
  propertyLat,
  propertyLng,
}: NearbyAmenitiesFormProps) {
  const updateAmenity = (
    key: keyof NearbyAmenities,
    field: keyof AmenityDetail,
    value: string
  ) => {
    onChange({
      ...amenities,
      [key]: {
        ...amenities[key],
        [field]: value,
      },
    });
  };

  const amenityConfig: Array<{
    key: keyof NearbyAmenities;
    label: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    distancePlaceholder: string;
    timePlaceholder: string;
    namePlaceholder: string;
    exampleName: string;
  }> = [
    {
      key: "universityGate",
      label: "بوابة الجامعة",
      icon: <GraduationCap size={18} />,
      color: "text-purple-600",
      bgColor: "bg-purple-600/10 border-purple-200",
      distancePlaceholder: "مثال: ٨٠٠م أو ١٫٢كم",
      timePlaceholder: "مثال: ١٠ دقائق مشياً",
      namePlaceholder: "اسم البوابة أو المجمع",
      exampleName: university ? `بوابة ${university} الرئيسية` : "بوابة مجمع الكليات",
    },
    {
      key: "transportation",
      label: "محطة مواصلات / موقف سرفيس",
      icon: <Bus size={18} />,
      color: "text-sky-600",
      bgColor: "bg-sky-500/10 border-sky-200",
      distancePlaceholder: "مثال: ٢٠٠م",
      timePlaceholder: "مثال: ٣ دقائق مشياً",
      namePlaceholder: "اسم المحطة أو الموقف",
      exampleName: "موقف سرفيس الجامعة والمحطة",
    },
    {
      key: "hospital",
      label: "أقرب مستشفى أو مركز طبي",
      icon: <Building2 size={18} />,
      color: "text-rose-600",
      bgColor: "bg-rose-500/10 border-rose-200",
      distancePlaceholder: "مثال: ٥٠٠م",
      timePlaceholder: "مثال: ٨ دقائق مشياً",
      namePlaceholder: "اسم المستشفى",
      exampleName: city ? `مستشفى ${city} العام` : "مستشفى الطلبة الجامعي",
    },
    {
      key: "pharmacy",
      label: "صيدلية (خدمة طلابية ٢٤ ساعة)",
      icon: <Pill size={18} />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10 border-emerald-200",
      distancePlaceholder: "مثال: ١٥٠م",
      timePlaceholder: "مثال: دقيقتان",
      namePlaceholder: "اسم الصيدلية",
      exampleName: "صيدلية العزبي / رشدي ٢٤ ساعة",
    },
    {
      key: "supermarket",
      label: "سوبرماركت / هايبر ماركت",
      icon: <ShoppingCart size={18} />,
      color: "text-amber-600",
      bgColor: "bg-amber-500/10 border-amber-200",
      distancePlaceholder: "مثال: ٣٠٠م",
      timePlaceholder: "مثال: ٥ دقائق مشياً",
      namePlaceholder: "اسم السوبرماركت",
      exampleName: "سوبرماركت كازيون / أولاد رجب",
    },
    {
      key: "cafeRestaurant",
      label: "كافيه ومطعم ومساحة مذاكرة",
      icon: <Coffee size={18} />,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10 border-orange-200",
      distancePlaceholder: "مثال: ١٠٠م",
      timePlaceholder: "مثال: دقيقة واحدة",
      namePlaceholder: "اسم الكافيه أو المطعم",
      exampleName: "كافيه واستراحة المذاكرة للطلاب",
    },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5" data-testid="nearby-amenities-editor">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin size={16} />
            </span>
            <h4 className="text-sm font-black text-foreground">
              كل ما تحتاجه حولك (إدارة تفاصيل المنطقة المحيطة)
            </h4>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-5">
            حدد المسافات وأوقات السير بالدقيقة لكل خدمة أساسية. تنعكس التعديلات فوراً في كارت وتفاصيل العقار المعروضة للطلاب.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const baseCoords = propertyLat && propertyLng
                ? { lat: propertyLat, lng: propertyLng }
                : getCityDefaultCoordinates(city, university);

              const keys: Array<keyof NearbyAmenities> = [
                "universityGate",
                "transportation",
                "hospital",
                "pharmacy",
                "supermarket",
                "cafeRestaurant",
              ];

              const updated: any = { ...amenities };

              keys.forEach((k) => {
                const targetCoord = amenities[k]?.lat && amenities[k]?.lng
                  ? { lat: amenities[k].lat!, lng: amenities[k].lng! }
                  : getDerivedAmenityCoords(baseCoords.lat, baseCoords.lng, k);

                const meters = calcHaversineDistanceMeters(
                  baseCoords.lat,
                  baseCoords.lng,
                  targetCoord.lat,
                  targetCoord.lng
                );

                updated[k] = {
                  ...updated[k],
                  lat: targetCoord.lat,
                  lng: targetCoord.lng,
                  distance: formatDistanceArabic(meters),
                  time: formatWalkingTimeArabic(meters),
                };
              });

              onChange(updated);
            }}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-500/20 transition-colors"
            title="حساب المسافات الجغرافية الفعلية عبر خوارزميات OpenStreetMap"
            data-testid="btn-recalculate-osm-distances"
          >
            <MapPin size={13} className="text-emerald-600" />
            حساب المسافات تلقائياً (OpenStreetMap)
          </button>

          <button
            type="button"
            onClick={() => {
              const cityName = city || "كفر الشيخ";
              const uniName = university || "جامعة كفر الشيخ";
              onChange({
                universityGate: { distance: "٨٠٠م", time: "١٠ دقائق مشياً", name: `بوابة ${uniName} الرئيسية`, rating: "4.8" },
                transportation: { distance: "٢٠٠م", time: "٣ دقائق مشياً", name: "محطة سرفيس وموقف الكليات", rating: "4.5" },
                hospital: { distance: "٥٠٠م", time: "٨ دقائق مشياً", name: `مستشفى ${cityName} الجامعي التخصصي`, rating: "4.6" },
                pharmacy: { distance: "١٥٠م", time: "دقيقتان", name: "صيدلية ٢٤ ساعة خدمة وتوصيل", rating: "5.0" },
                supermarket: { distance: "٣٠٠م", time: "٥ دقائق مشياً", name: "سوبرماركت وهايبر غذائي متكامل", rating: "4.4" },
                cafeRestaurant: { distance: "١٠٠م", time: "دقيقة واحدة", name: "كافيه ومساحة مذاكرة هادئة", rating: "4.7" },
              });
            }}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 transition-colors"
            title="تعبئة بيانات استرشادية ذكية بحسب المدينة"
          >
            <Sparkles size={13} />
            قيم افتراضية
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {amenityConfig.map((item) => {
          const current = amenities[item.key] || {
            distance: "",
            time: "",
            name: "",
            rating: "4.5",
          };

          return (
            <div
              key={item.key}
              className={`rounded-xl border p-3.5 transition-all ${item.bgColor}`}
              data-testid={`amenity-card-${item.key}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-background shadow-xs ${item.color}`}>
                    {item.icon}
                  </span>
                  <span className="text-xs font-black text-foreground">
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <input
                    type="text"
                    value={current.rating || "4.5"}
                    onChange={(e) => updateAmenity(item.key, "rating", e.target.value)}
                    placeholder="4.5"
                    className="w-10 rounded border border-border/80 bg-background px-1 py-0.5 text-center text-[10px] font-bold text-foreground outline-none"
                    title="التقييم من 5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-foreground">
                      <MapPin size={10} className={item.color} />
                      المسافة (بالأمتار / كم):
                    </label>
                    <input
                      type="text"
                      required
                      value={current.distance}
                      onChange={(e) => updateAmenity(item.key, "distance", e.target.value)}
                      placeholder={item.distancePlaceholder}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="mb-1 flex items-center gap-1 text-[10px] font-bold text-foreground">
                      <Clock size={10} className={item.color} />
                      الوقت التقريبي:
                    </label>
                    <input
                      type="text"
                      required
                      value={current.time}
                      onChange={(e) => updateAmenity(item.key, "time", e.target.value)}
                      placeholder={item.timePlaceholder}
                      className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-muted-foreground">
                    اسم المكان أو الخدمة التوضيحي (اختياري):
                  </label>
                  <input
                    type="text"
                    value={current.name || ""}
                    onChange={(e) => updateAmenity(item.key, "name", e.target.value)}
                    placeholder={item.exampleName}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
