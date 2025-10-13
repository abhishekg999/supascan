import type { AnalysisResult } from "../core/analyzer.types";
import type { ReportData } from "../report/types";
import template from "../../dist/report-template.html";

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

  const templateContent = await Bun.file(template.index).text();

  const rewriter = new HTMLRewriter().on("title", {
    text(text) {
      if (text.text.includes("Supabase Security Analysis Report")) {
        text.replace(`${result.summary.domain} - Security Analysis`);
      }
    },
  });

  let html = rewriter.transform(templateContent);

  html = html.replace(
    "__REPORT_DATA_PLACEHOLDER__",
    JSON.stringify(reportData).replace(/</g, "\\u003c"),
  );

  return html;
}
