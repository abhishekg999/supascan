import { $ } from "bun";
import { mkdir } from "fs/promises";

console.log("Building Node.js bundle...");

console.log("Step 1: Type checking...");
await $`bun run lint`;

console.log("Step 2: Pre-bundling React report app...");
await mkdir("./dist", { recursive: true });

const reportBundle = await Bun.build({
  entrypoints: ["./src/report/index.html"],
  minify: true,
  target: "browser",
  naming: "[dir]/[name].[ext]",
  splitting: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!reportBundle.success) {
  console.error("Failed to bundle report:");
  for (const log of reportBundle.logs) {
    console.error(log);
  }
  process.exit(1);
}

const htmlOutput = reportBundle.outputs.find((o) => o.path.endsWith(".html"));
if (!htmlOutput) {
  console.error("No HTML output generated");
  process.exit(1);
}

const jsMap = new Map<string, string>();
for (const output of reportBundle.outputs) {
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
          element.setInnerContent(content, { html: true });
        }
      }
    },
  })
  .on("head", {
    element(element) {
      const polyfillScript = `
  <script>
    window.global = window.global || window;
    window.process = window.process || { env: { NODE_ENV: 'production' } };
    window.__REPORT_DATA__ = __REPORT_DATA_PLACEHOLDER__;
  </script>`;
      element.prepend(polyfillScript, { html: true });
    },
  });

html = rewriter.transform(html);

await Bun.write("./dist/report-template.html", html);
console.log("✓ Report template built: dist/report-template.html");

console.log("Step 3: Bundling CLI for Node.js...");
const nodeBuild = await Bun.build({
  entrypoints: ["./src/cli/index.ts"],
  outdir: "./dist",
  minify: true,
  target: "node",
  naming: "[name].js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

if (!nodeBuild.success) {
  console.error("Failed to bundle for Node.js:");
  for (const log of nodeBuild.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✓ Node.js bundle built successfully: dist/supascan.js");
