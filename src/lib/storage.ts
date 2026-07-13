/**
 * Custom storage adapter for Supabase that adds session expiration.
 * Sessions expire after 24 hours to prevent stale authentication.
 */

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createExpiringStorage(): StorageAdapter {
  return {
    getItem: (key: string): string | null => {
      try {
        const item = localStorage.getItem(key);
        if (!item) return null;

        const data = JSON.parse(item);

        // Check if session has expired
        if (data.expiry && Date.now() > data.expiry) {
          localStorage.removeItem(key);
          return null;
        }

        return item;
      } catch (error) {
        console.error("Error reading from storage:", error);
        return null;
      }
    },

    setItem: (key: string, value: string): void => {
      try {
        const data = JSON.parse(value);
        // Add expiry timestamp (24 hours from now)
        data.expiry = Date.now() + SESSION_EXPIRY_MS;
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error("Error writing to storage:", error);
        // Fallback: store as-is if JSON parsing fails
        localStorage.setItem(key, value);
      }
    },

    removeItem: (key: string): void => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error("Error removing from storage:", error);
      }
    },
  };
}

export interface StorageAdapter {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}
