import type { AnalyzerEvent } from "./analyzer.types";
import type { ExtractorEvent } from "./extractor.types";
import type { SupabaseEvent } from "./supabase.types";

export type CoreEvent = AnalyzerEvent | SupabaseEvent | ExtractorEvent;
