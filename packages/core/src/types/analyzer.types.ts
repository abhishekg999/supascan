import type { Event } from "./event.types";
import type { RPCFunction, TableAccessResult } from "./supabase.types";

export type SchemaAnalysis = {
  tables: string[];
  rpcs: string[];
  rpcFunctions: RPCFunction[];
  tableAccess: Record<string, TableAccessResult>;
};

export type JWTInfo = {
  iss?: string;
  aud?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  role?: string;
  [key: string]: unknown;
};

export type SummaryMetadata = {
  service?: string;
  region?: string;
  protocol?: string;
  port?: string;
  version?: string;
  title?: string;
  description?: string;
};

export type AnalysisResult = {
  schemas: string[];
  schemaDetails: Record<string, SchemaAnalysis>;
  summary: {
    domain: string;
    jwtInfo?: JWTInfo;
    metadata?: SummaryMetadata;
  };
};

export interface AnalysisStartedEvent
  extends Event<"analysis_started", Record<string, never>> {
  type: "analysis_started";
  data: Record<string, never>;
}

export interface SchemaAnalysisStartedEvent
  extends Event<"schema_analysis_started", { schema: string }> {
  type: "schema_analysis_started";
  data: { schema: string };
}

export interface SchemaAnalysisCompletedEvent
  extends Event<
    "schema_analysis_completed",
    { schema: string; analysis: SchemaAnalysis }
  > {
  type: "schema_analysis_completed";
  data: { schema: string; analysis: SchemaAnalysis };
}

export interface AnalysisCompletedEvent
  extends Event<"analysis_completed", { result: AnalysisResult }> {
  type: "analysis_completed";
  data: { result: AnalysisResult };
}

export type AnalyzerEvent =
  | AnalysisStartedEvent
  | SchemaAnalysisStartedEvent
  | SchemaAnalysisCompletedEvent
  | AnalysisCompletedEvent;
