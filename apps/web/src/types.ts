import type { SupabaseClient as SupabaseClientType } from "@supabase/supabase-js";
import type { AnalysisResult, RPCFunction } from "@supascan/core";

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

export type TabType = "table" | "rpc";

export interface TableTab {
  type: "table";
  id: string;
  schema: string;
  table: string;
}

export interface RPCTab {
  type: "rpc";
  id: string;
  schema: string;
  rpc: RPCFunction;
}

export type Tab = TableTab | RPCTab;

export interface EditorState {
  analysis: AnalysisResult;
  selectedSchema: string;
  tabs: Tab[];
  activeTabId: string | null;
}
