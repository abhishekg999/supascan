import type { AnalysisResult } from "../core/analyzer.types";
import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";

export interface ReportData {
  analysis: AnalysisResult;
  url: string;
  apiKey: string;
  generatedAt: string;
}

export type SupabaseClient = SupabaseClientType;

export type AsyncState<T, E = Error> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: E };

declare global {
  interface Window {
    __REPORT_DATA__?: ReportData;
  }
}
