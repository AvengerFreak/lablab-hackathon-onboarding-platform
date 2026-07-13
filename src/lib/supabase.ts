import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { createExpiringStorage } from "./storage";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("[Supabase] Initializing client with URL:", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] Missing environment variables:", { supabaseUrl: !!supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables."
  );
}

const storage = createExpiringStorage();

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storage: storage,
  },
});

console.log("[Supabase] Client initialized successfully");

// Log auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log("[Supabase] Auth state changed:", { event, session: session ? "exists" : "null" });
  if (session) {
    console.log("[Supabase] Session user:", session.user.id);
  }
});