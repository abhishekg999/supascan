import type { AnalysisResult } from "@supascan/core";

export interface ReportData {
  analysis: AnalysisResult;
  url: string;
  apiKey: string;
  headers?: Record<string, string>;
  generatedAt: string;
}
