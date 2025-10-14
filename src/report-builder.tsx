import type { AnalysisResult } from "./core/analyzer.types";
import type { ReportData } from "./report/types";
import { reportTemplate } from "./embedded-report";

export async function buildHtmlReport(
  result: AnalysisResult,
  url: string,
  key: string,
): Promise<string> {
  const reportData: ReportData = {
    analysis: result,
    url,
    apiKey: key,
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
