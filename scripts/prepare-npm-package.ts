import { readFileSync, writeFileSync } from "fs";

const cliPkg = JSON.parse(readFileSync("apps/cli/package.json", "utf-8"));
cliPkg.name = "supascan";

writeFileSync("dist/package.json", JSON.stringify(cliPkg, null, 2));
console.log("✓ Created dist/package.json with name: supascan");
