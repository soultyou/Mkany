import { StudentUser } from "@/components/auth/clerk-auth";

export type RegisteredUser = StudentUser;
export const USERS_CHANGE_EVENT = "mkany_users_updated";

// In-memory stub for compatibility with existing UI components during the transition.
// This eliminates the insecure localStorage database and hardcoded passwords.
let mockUsers: RegisteredUser[] = [];

// TODO: Migrate to real backend API in the next phase.
export function getAllRegisteredUsers(): RegisteredUser[] {
  return mockUsers;
}

// TODO: Migrate to real backend API in the next phase.
export function toggleUserVerification(userId: string): RegisteredUser | null {
  return null;
}

// TODO: Migrate to real backend API in the next phase.
export function deleteUserFromDb(userId: string): boolean {
  return false;
}

// Keep favorites in localStorage since it's just non-sensitive preferences
export function getUserFavoritesKey(userId?: string): string {
  if (!userId || userId.trim() === "") return "mkany_favorites_guest_v1";
  return `mkany_favorites_${userId.trim()}_v1`;
}

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
    return [];
  }
}

export type { StudentUser } from "@/components/auth/clerk-auth";
