import type { AnalysisResult } from "../core/analyzer.types";
import type { ReportData } from "../report/types";

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

  const bundleResult = await Bun.build({
    entrypoints: [new URL("../report/index.html", import.meta.url).pathname],
    minify: true,
    target: "browser",
    naming: "[dir]/[name].[ext]",
    splitting: false,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  if (!bundleResult.success) {
    throw new Error(
      `Failed to bundle report: ${bundleResult.logs.map((l) => l.message).join("\n")}`,
    );
  }

  const htmlOutput = bundleResult.outputs.find((o) => o.path.endsWith(".html"));
  if (!htmlOutput) {
    throw new Error("No HTML output generated");
  }

  const jsMap = new Map<string, string>();
  for (const output of bundleResult.outputs) {
    if (output.path.endsWith(".js")) {
      const filename = output.path.split("/").pop();
      if (filename) {
        const content = await output.text();
        jsMap.set(filename, content.replace(/<\/script>/g, "<\\/script>"));
      }
    }
  }

  let html = await htmlOutput.text();

  const rewriter = new HTMLRewriter()
    .on("script[src]", {
      element(element) {
        const src = element.getAttribute("src");
        if (src && src.startsWith("./")) {
          const filename = src.replace("./", "");
          const content = jsMap.get(filename);

          if (content) {
            element.removeAttribute("src");
            element.removeAttribute("crossorigin");
            element.removeAttribute("type");
            element.setInnerContent(content, { html: true });
          }
        }
      },
    })
    .on("title", {
      text(text) {
        if (text.text.includes("Supabase Security Analysis Report")) {
          text.replace(`${result.summary.domain} - Security Analysis`);
        }
      },
    })
    .on("head", {
      element(element) {
        const polyfillScript = `
  <script>
    window.global = window.global || window;
    window.process = window.process || { env: { NODE_ENV: 'production' } };
    window.__REPORT_DATA__ = ${JSON.stringify(reportData).replace(/</g, "\\u003c")};
  </script>`;
        element.prepend(polyfillScript, { html: true });
      },
    });

  html = rewriter.transform(html);

  return html;
}
