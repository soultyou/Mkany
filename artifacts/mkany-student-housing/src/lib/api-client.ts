import { customFetch, ApiError, type CustomFetchOptions } from "@workspace/api-client-react";

/**
 * Centralized Authenticated API Client for MKANY Student Housing
 * 
 * Automatically attaches the Clerk session Bearer token from the registered auth getter.
 * Formats errors with clear HTTP status distinctions (401, 403, 404, 500).
 */

export class ApplicationApiError extends Error {
  status: number;
  statusText: string;
  data: any;

  constructor(status: number, statusText: string, data: any, message?: string) {
    super(message || data?.message || data?.error || `API Error: ${status} ${statusText}`);
    this.name = "ApplicationApiError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Generic authenticated API fetch wrapper
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: CustomFetchOptions = {}
): Promise<T> {
  try {
    return await customFetch<T>(endpoint, options);
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw new ApplicationApiError(
        err.status,
        err.statusText,
        err.data,
        err.data?.message || err.data?.error || `Request failed with status ${err.status}`
      );
    }
    throw err;
  }
}

// ==========================================
// User Profile API
// ==========================================

export async function getProfileApi() {
  return apiFetch("/api/profile", { method: "GET" });
}

export async function updateProfileApi(data: {
  fullName?: string;
  nationalId?: string;
  phoneNumber?: string;
  university?: string;
  avatarUrl?: string | null;
}) {
  return apiFetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ==========================================
// Supabase Storage Image Upload API
// ==========================================

export async function uploadSingleImageApi(file: File): Promise<{ url: string; path: string; filename: string }> {
  const formData = new FormData();
  formData.append("image", file);

  return apiFetch("/api/upload/single", {
    method: "POST",
    body: formData,
  });
}

export async function uploadMultipleImagesApi(files: File[]): Promise<{ urls: string[]; files: any[] }> {
  if (files.length === 0) return { urls: [], files: [] };
  
  const formData = new FormData();
  for (const f of files) {
    formData.append("images", f);
  }

  return apiFetch("/api/upload/multiple", {
    method: "POST",
    body: formData,
  });
}

// ==========================================
// Inspections API
// ==========================================

export async function getInspectionsApi() {
  return apiFetch("/api/inspections", { method: "GET" });
}

export async function getInspectionByIdApi(id: string) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function createInspectionApi(data: any) {
  return apiFetch("/api/inspections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateInspectionApi(id: string, data: any) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function publishInspectionApi(id: string, data: any) {
  return apiFetch(`/api/inspections/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// ==========================================
// Apartments API
// ==========================================

export async function getApartmentsApi(params?: Record<string, any>) {
  let url = "/api/apartments";
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  return apiFetch(url, { method: "GET" });
}

export async function getMyApartmentsApi() {
  return apiFetch("/api/apartments/mine", { method: "GET" });
}

export async function getApartmentByIdApi(id: number) {
  return apiFetch(`/api/apartments/${id}`, { method: "GET" });
}

export async function createApartmentApi(data: any) {
  return apiFetch("/api/apartments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateApartmentApi(id: number, data: any) {
  return apiFetch(`/api/apartments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteApartmentApi(id: number) {
  return apiFetch(`/api/apartments/${id}`, {
    method: "DELETE",
  });
}

export async function addApartmentPhotoApi(apartmentId: number, data: { url: string; isCover?: boolean; displayOrder?: number }) {
  return apiFetch(`/api/apartments/${apartmentId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteApartmentPhotoApi(apartmentId: number, photoId: string) {
  return apiFetch(`/api/apartments/${apartmentId}/photos/${photoId}`, {
    method: "DELETE",
  });
}
