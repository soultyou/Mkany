import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  Crosshair,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Building,
  GraduationCap
} from "lucide-react";
import { getCityDefaultCoordinates, LatLngCoord } from "@/lib/geo-utils";

interface PropertyLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  city?: string;
  university?: string;
  onLocationChange: (coords: LatLngCoord) => void;
  className?: string;
}

export function PropertyLocationPicker({
  initialLat,
  initialLng,
  city = "كفر الشيخ",
  university = "جامعة كفر الشيخ",
  onLocationChange,
  className = "",
}: PropertyLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const defaultCoords = getCityDefaultCoordinates(city, university);
  const [selectedCoords, setSelectedCoords] = useState<LatLngCoord>({
    lat: initialLat || defaultCoords.lat,
    lng: initialLng || defaultCoords.lng,
  });

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationSource, setLocationSource] = useState<"gps" | "manual" | "default">(
    initialLat ? "manual" : "default"
  );

  // تحديث الإحداثيات وإشعار المكوّن الأب
  const updatePosition = useCallback(
    (lat: number, lng: number, source: "gps" | "manual") => {
      const roundedLat = Number(lat.toFixed(6));
      const roundedLng = Number(lng.toFixed(6));
      const newCoords = { lat: roundedLat, lng: roundedLng };
      setSelectedCoords(newCoords);
      setLocationSource(source);
      onLocationChange(newCoords);

      if (markerRef.current) {
        markerRef.current.setLatLng([roundedLat, roundedLng]);
      }
    },
    [onLocationChange]
  );

  // إعداد وتجهيز خريطة Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [selectedCoords.lat, selectedCoords.lng],
      zoom: 16,
      zoomControl: false,
    });

    // إضافة طبقة OpenStreetMap المفتوحة والمجانية
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapInstanceRef.current = map;

    // دبوس تحديد الموقع التفاعلي القابل للسحب (Draggable Marker)
    const markerHtml = `
      <div class="relative flex flex-col items-center cursor-grab active:cursor-grabbing">
        <div class="flex items-center gap-1.5 bg-primary text-primary-foreground px-2.5 py-1 rounded-full shadow-lg border-2 border-white font-bold text-xs whitespace-nowrap animate-bounce">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
          <span>موقع العقار</span>
        </div>
        <div class="w-2.5 h-2.5 -mt-1 rotate-45 bg-primary border-r-2 border-b-2 border-white"></div>
        <div class="w-4 h-1.5 bg-black/30 rounded-full blur-[1px] mt-0.5"></div>
      </div>
    `;

    const marker = L.marker([selectedCoords.lat, selectedCoords.lng], {
      draggable: true,
      icon: L.divIcon({
        html: markerHtml,
        className: "custom-picker-pin",
        iconSize: [110, 48],
        iconAnchor: [55, 44],
      }),
    }).addTo(map);

    // عند سحب الدبوس
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      updatePosition(pos.lat, pos.lng, "manual");
    });

    markerRef.current = marker;

    // عند النقر على أي مكان في الخريطة لتحريك الدبوس
    map.on("click", (e: L.LeafletMouseEvent) => {
      updatePosition(e.latlng.lat, e.latlng.lng, "manual");
      map.panTo(e.latlng, { animate: true });
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // مشاركة الموقع الحالي عبر GPS (HTML5 Geolocation)
  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("المتصفح لا يدعم تحديد الموقع الجغرافي");
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updatePosition(latitude, longitude, "gps");

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, {
            animate: true,
            duration: 1,
          });
        }
        setIsLocatingGps(false);
      },
      (err) => {
        setIsLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError("تم رفض إذن الوصول للموقع، يمكنك النقر على الخريطة لتحديده يدوياً.");
        } else {
          setGpsError("تعذر التقاط الموقع بدقة، يرجى تحديد العقار بالضغط على الخريطة.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // إعادة ضبط الموقع على مركز المدينة / الجامعة
  const handleResetToCityDefault = () => {
    const coords = getCityDefaultCoordinates(city, university);
    updatePosition(coords.lat, coords.lng, "manual");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, {
        animate: true,
      });
    }
  };

  return (
    <div
      className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}
      data-testid="property-location-picker"
    >
      {/* شريط الإجراءات والتحكم في تحديد الموقع */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/30 p-3">
        <div>
          <div className="flex items-center gap-1.5">
            <MapPin size={16} className="text-primary" />
            <h4 className="text-xs font-bold text-foreground">
              تحديد موقع العقار على الخريطة (Leaflet & OSM)
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            شارك موقعك الحالي أو انقر واسحب الدبوس فوق العقار مباشرة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* زر مشاركة اللوكيشن GPS */}
          <button
            type="button"
            onClick={handleShareCurrentLocation}
            disabled={isLocatingGps}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-60"
            data-testid="gps-share-btn"
          >
            {isLocatingGps ? (
              <>
                <span className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin"></span>
                <span>جاري التقاط GPS...</span>
              </>
            ) : (
              <>
                <Navigation size={13} />
                <span>مشاركة موقعي الحالي (GPS)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetToCityDefault}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            title="إعادة التمركز نحو مركز المدينة"
            data-testid="reset-city-center-btn"
          >
            <RotateCcw size={12} className="text-muted-foreground" />
            <span className="hidden sm:inline">مركز المدينة</span>
          </button>
        </div>
      </div>

      {/* رسالة الخطأ إن وجدت */}
      {gpsError && (
        <div className="flex items-center gap-2 bg-destructive/10 px-3 py-2 text-xs text-destructive border-b border-destructive/20">
          <AlertCircle size={14} className="shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* مساحة الخريطة التفاعلية */}
      <div className="relative">
        <div
          ref={mapContainerRef}
          className="h-[220px] sm:h-[260px] w-full bg-muted"
        />

        <div className="absolute top-2 right-2 z-[400] rounded-md bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur-xs border border-border/80 pointer-events-none">
          💡 انقر في أي مكان أو اسحب الدبوس لضبط الموقع بدقة
        </div>
      </div>

      {/* بطاقة الإحداثيات وحالة الموقع */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 px-3 py-2 text-xs border-t border-border/80">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-muted-foreground">
            خط العرض: <strong className="text-foreground">{selectedCoords.lat}</strong>
          </span>
          <span className="text-border">|</span>
          <span className="text-muted-foreground">
            خط الطول: <strong className="text-foreground">{selectedCoords.lng}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          {locationSource === "gps" ? (
            <span className="flex items-center gap-1 text-emerald-600 font-bold">
              <CheckCircle2 size={13} /> تم التحديد بدقة عبر GPS الحقيقي
            </span>
          ) : locationSource === "manual" ? (
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <Crosshair size={13} /> تم التحديد يدوياً على الخريطة
            </span>
          ) : (
            <span className="text-muted-foreground">الموقع الافتراضي بالمدينة</span>
          )}
        </div>
      </div>
    </div>
  );
}
