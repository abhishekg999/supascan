import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

export interface SupascanConfig {
  url: string;
  key: string;
  headers?: Record<string, string>;
  autorun: boolean;
}

export type SupabaseClient = SupabaseClientType;

export type AsyncState<T, E = Error> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E };
