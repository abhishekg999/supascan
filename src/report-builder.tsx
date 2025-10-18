import type { AnalysisResult } from "./core/analyzer.types";
import { reportTemplate } from "./embedded-report";
import type { ReportData } from "./report/types";

export async function buildHtmlReport(
  result: AnalysisResult,
  url: string,
  key: string,
  headers?: Record<string, string>,
): Promise<string> {
  const reportData: ReportData = {
    analysis: result,
    url,
    apiKey: key,
    headers,
    generatedAt: new Date().toISOString(),
  };

  return reportTemplate
    .replace(
      "Supabase Security Analysis Report",
      `${result.summary.domain} - Security Analysis`,
    )
    .replace(
      "__REPORT_DATA_PLACEHOLDER__",
      JSON.stringify(reportData).replace(/</g, "\\u003c"),
    );
}
