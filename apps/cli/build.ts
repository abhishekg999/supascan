import { $ } from "bun";
import { mkdir, readFile } from "fs/promises";

console.log("Building CLI...");

await $`tsc --noEmit`;

console.log("Building web app for embedding...");
await $`cd ../web && bun run build`;

const webHtml = await readFile("../web/dist/index.html", "utf-8");

await Bun.write(
  "./src/embedded-report.ts",
  `export const reportTemplate = ${JSON.stringify(webHtml)};`,
);

await mkdir("./dist", { recursive: true });

const nodeBuild = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  minify: true,
  target: "node",
  banner: "#!/usr/bin/env node",
  naming: {
    entry: "supascan.js",
  },
});

if (!nodeBuild.success) {
  console.error("Failed to bundle CLI");
  for (const log of nodeBuild.logs) console.error(log);
  process.exit(1);
}

console.log("✓ CLI built: dist/supascan.js");
