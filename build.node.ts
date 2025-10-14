import { $ } from "bun";
import { mkdir } from "fs/promises";

console.log("Building Node.js bundle...");

await $`tsc --noEmit`;

const reportBundle = await Bun.build({
  entrypoints: ["./src/report/index.html"],
  minify: true,
  target: "browser",
  splitting: false,
  define: { "process.env.NODE_ENV": '"production"' },
});

if (!reportBundle.success) {
  console.error("Failed to bundle report");
  for (const log of reportBundle.logs) console.error(log);
  process.exit(1);
}

const htmlOutput = reportBundle.outputs.find((o) => o.path.endsWith(".html"));
if (!htmlOutput) throw new Error("No HTML output");

const jsMap = new Map<string, string>();
for (const output of reportBundle.outputs) {
  if (output.path.endsWith(".js")) {
    const filename = output.path.split("/").pop();
    if (filename) {
      jsMap.set(
        filename,
        (await output.text()).replace(/<\/script>/g, "<\\/script>"),
      );
    }
  }
}

let html = await htmlOutput.text();

html = new HTMLRewriter()
  .on("script[src]", {
    element(element) {
      const src = element.getAttribute("src");
      if (src?.startsWith("./")) {
        const content = jsMap.get(src.replace("./", ""));
        if (content) {
          element.removeAttribute("src");
          element.removeAttribute("crossorigin");
          element.setInnerContent(content, { html: true });
        }
      }
    },
  })
  .on("head", {
    element(element) {
      element.prepend(
        `<script>window.global=window.global||window;window.process=window.process||{env:{NODE_ENV:'production'}};window.__REPORT_DATA__=__REPORT_DATA_PLACEHOLDER__;</script>`,
        { html: true },
      );
    },
  })
  .transform(html);

await Bun.write(
  "./src/embedded-report.ts",
  `export const reportTemplate = ${JSON.stringify(html)};`,
);

await mkdir("./dist", { recursive: true });

const nodeBuild = await Bun.build({
  entrypoints: ["./src/cli/index.ts"],
  outdir: "./dist",
  minify: true,
  target: "node",
  naming: {
    entry: "supascan.js",
  },
});

if (!nodeBuild.success) {
  console.error("Failed to bundle for Node.js");
  for (const log of nodeBuild.logs) console.error(log);
  process.exit(1);
}

console.log("✓ Node.js bundle built: dist/supascan.js");
