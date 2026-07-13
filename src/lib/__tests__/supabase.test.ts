import { describe, it, expect, vi, beforeEach } from "vitest";

describe("supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("throws if VITE_SUPABASE_URL is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");

    await expect(async () => {
      await import("../supabase");
    }).rejects.toThrow(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
    );
  });

  it("throws if VITE_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    await expect(async () => {
      await import("../supabase");
    }).rejects.toThrow(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
    );
  });

  it("creates a supabase client with correct config when env vars are set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

    const { supabase } = await import("../supabase");

    expect(supabase).toBeDefined();
  });
});

describe("expiring storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes expired sessions on getItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    const expiredSession = JSON.stringify({
      data: "test-data",
      expiry: Date.now() - 1000, // Expired 1 second ago
    });

    localStorage.setItem("test-key", expiredSession);

    const result = storage.getItem("test-key");

    expect(result).toBeNull();
    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("returns valid sessions on getItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    const validSession = JSON.stringify({
      data: "test-data",
      expiry: Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
    });

    localStorage.setItem("test-key", validSession);

    const result = storage.getItem("test-key");

    expect(result).not.toBeNull();
    expect(JSON.parse(result as string).data).toBe("test-data");
  });

  it("returns null for non-existent sessions", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    const result = storage.getItem("non-existent-key");

    expect(result).toBeNull();
  });

  it("adds expiry timestamp on setItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    const sessionData = JSON.stringify({ data: "test-data" });
    storage.setItem("test-key", sessionData);

    const stored = localStorage.getItem("test-key");
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored as string);
    expect(parsed.expiry).toBeDefined();
    expect(parsed.expiry).toBeGreaterThan(Date.now());
    expect(parsed.expiry).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000 + 1000);
  });

  it("removes items on removeItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    localStorage.setItem("test-key", "test-value");

    storage.removeItem("test-key");

    expect(localStorage.getItem("test-key")).toBeNull();
  });

  it("handles malformed JSON gracefully on getItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    localStorage.setItem("test-key", "invalid-json");

    const result = storage.getItem("test-key");
    // Should return null on error instead of throwing
    expect(result).toBeNull();
  });

  it("handles malformed JSON gracefully on setItem", async () => {
    const { createExpiringStorage } = await import("../storage");
    const storage = createExpiringStorage();

    // Should not throw on invalid JSON
    storage.setItem("test-key", "invalid-json");

    const stored = localStorage.getItem("test-key");
    expect(stored).toBe("invalid-json"); // Fallback: store as-is
  });
});