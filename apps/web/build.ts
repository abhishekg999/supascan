import { $ } from "bun";

console.log("Building web app...");

await $`tsc --noEmit`;

const reportBundle = await Bun.build({
  entrypoints: ["./index.html"],
  minify: true,
  target: "browser",
  splitting: false,
  define: { "process.env.NODE_ENV": '"production"' },
});

if (!reportBundle.success) {
  console.error("Failed to bundle web app");
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
        `<script>window.global=window.global||window;window.process=window.process||{env:{NODE_ENV:'production'}};</script>`,
        { html: true },
      );
    },
  })
  .transform(html);

const { mkdir } = await import("fs/promises");
await mkdir("./dist", { recursive: true });

await Bun.write("./dist/index.html", html);

console.log("✓ Web app built: dist/index.html");
