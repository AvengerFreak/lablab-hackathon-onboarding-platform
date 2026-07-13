/**
 * Custom storage adapter for Supabase that adds session expiration.
 * Sessions expire after 24 hours to prevent stale authentication.
 */

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createExpiringStorage(): StorageAdapter {
  return {
    getItem: (key: string): string | null => {
      console.log("[Storage] Getting item for key:", key);
      try {
        const item = localStorage.getItem(key);
        if (!item) {
          console.log("[Storage] No item found for key:", key);
          return null;
        }

        console.log("[Storage] Item found for key:", key, "length:", item.length);

        const data = JSON.parse(item);

        // Check if session has expired
        if (data.expiry && Date.now() > data.expiry) {
          console.log("[Storage] Session expired for key:", key, "expired at:", new Date(data.expiry).toISOString());
          localStorage.removeItem(key);
          return null;
        }

        console.log("[Storage] Session valid for key:", key, "expires at:", new Date(data.expiry).toISOString());
        return item;
      } catch (error) {
        console.error("[Storage] Error reading from storage for key:", key, error);
        return null;
      }
    },

    setItem: (key: string, value: string): void => {
      console.log("[Storage] Setting item for key:", key, "value length:", value.length);
      try {
        const data = JSON.parse(value);
        // Add expiry timestamp (24 hours from now)
        data.expiry = Date.now() + SESSION_EXPIRY_MS;
        const expiryDate = new Date(data.expiry).toISOString();
        console.log("[Storage] Setting expiry for key:", key, "at:", expiryDate);
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error("[Storage] Error writing to storage for key:", key, error);
        // Fallback: store as-is if JSON parsing fails
        console.log("[Storage] Fallback: storing value as-is for key:", key);
        localStorage.setItem(key, value);
      }
    },

    removeItem: (key: string): void => {
      console.log("[Storage] Removing item for key:", key);
      try {
        localStorage.removeItem(key);
        console.log("[Storage] Successfully removed item for key:", key);
      } catch (error) {
        console.error("[Storage] Error removing from storage for key:", key, error);
      }
    },
  };
}

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}
