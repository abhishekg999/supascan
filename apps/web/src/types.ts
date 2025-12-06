import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

export interface Credentials {
  url: string;
  key: string;
  headers?: Record<string, string>;
}

export type SupabaseClient = SupabaseClientType;

export type AsyncState<T, E = Error> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E };
