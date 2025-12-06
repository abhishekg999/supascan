import {
  analyze,
  type AnalysisResult,
  type RPCParameter,
} from "@supascan/core";
import pc from "picocolors";
import type { CLIContext } from "../context";
import { log } from "../formatters/console";
import { handleEvent } from "../formatters/events";

export async function executeAnalyzeCommand(
  ctx: CLIContext,
  options: { schema?: string }
): Promise<void> {
  if (ctx.html) {
    const { reportTemplate } = await import("../embedded-report");
    const { generateTempFilePath, writeHtmlFile } = await import(
      "../utils/files"
    );
    const { openInBrowser } = await import("../utils/browser");

    const config = {
      url: ctx.url,
      key: ctx.key,
      headers: ctx.headers,
      autorun: true,
    };
    const encoded = Buffer.from(JSON.stringify(config)).toString("base64");

    const filePath = generateTempFilePath();
    const htmlContent = reportTemplate.replace(
      "</head>",
      `<script>window.__SUPASCAN_CONFIG__ = "${encoded}";</script></head>`
    );
    writeHtmlFile(filePath, htmlContent);

    openInBrowser(filePath);
    log.success(`HTML report generated: ${filePath}`);
    return;
  }

  const analysisGen = analyze(ctx.client, ctx.url, ctx.key, options);
  let analysisResult;

  while (true) {
    const next = await analysisGen.next();
    if (next.done) {
      analysisResult = next.value;
      break;
    }
    handleEvent(ctx, next.value);
  }

  if (!analysisResult || !analysisResult.success) {
    log.error(
      "Analysis failed",
      analysisResult?.error.message ?? "Unknown error"
    );
    process.exit(1);
  }

  if (ctx.json) {
    console.log(JSON.stringify(analysisResult.value, null, 2));
  } else {
    displayAnalysisResult(analysisResult.value);
  }
}

function displayAnalysisResult(result: AnalysisResult): void {
  console.log();
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log(pc.bold(pc.cyan("  SUPABASE DATABASE ANALYSIS")));
  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();

  console.log(pc.bold(pc.yellow("TARGET SUMMARY")));
  console.log(pc.dim("-".repeat(20)));
  console.log(pc.bold("Domain:"), pc.white(result.summary.domain));

  if (result.summary.metadata?.service) {
    console.log(pc.bold("Service:"), pc.white(result.summary.metadata.service));
  }

  if (result.summary.metadata?.region) {
    console.log(
      pc.bold("Project ID:"),
      pc.white(result.summary.metadata.region)
    );
  }

  if (result.summary.metadata?.title) {
    console.log(pc.bold("Title:"), pc.white(result.summary.metadata.title));
  }

  if (result.summary.metadata?.version) {
    console.log(pc.bold("Version:"), pc.white(result.summary.metadata.version));
  }

  if (result.summary.jwtInfo) {
    console.log();
    console.log(pc.bold(pc.yellow("JWT TOKEN INFO")));
    console.log(pc.dim("-".repeat(20)));

    if (result.summary.jwtInfo.iss) {
      console.log(pc.bold("Issuer:"), pc.white(result.summary.jwtInfo.iss));
    }
    if (result.summary.jwtInfo.aud) {
      console.log(pc.bold("Audience:"), pc.white(result.summary.jwtInfo.aud));
    }
    if (result.summary.jwtInfo.role) {
      console.log(pc.bold("Role:"), pc.white(result.summary.jwtInfo.role));
    }
    if (result.summary.jwtInfo.exp) {
      const expDate = new Date(result.summary.jwtInfo.exp * 1000);
      console.log(pc.bold("Expires:"), pc.white(expDate.toISOString()));
    }
    if (result.summary.jwtInfo.iat) {
      const iatDate = new Date(result.summary.jwtInfo.iat * 1000);
      console.log(pc.bold("Issued:"), pc.white(iatDate.toISOString()));
    }
  }

  console.log();
  console.log(pc.bold(pc.cyan("DATABASE ANALYSIS")));
  console.log(pc.dim("-".repeat(20)));
  console.log(
    pc.bold("Schemas discovered:"),
    pc.green(result.schemas.length.toString())
  );
  console.log();

  Object.entries(result.schemaDetails).forEach(([schema, analysis]) => {
    console.log(pc.bold(pc.cyan(`Schema: ${schema}`)));
    console.log();

    const exposedCount = Object.values(analysis.tableAccess).filter(
      (a) => a.status === "readable"
    ).length;
    const deniedCount = Object.values(analysis.tableAccess).filter(
      (a) => a.status === "denied"
    ).length;
    const emptyCount = Object.values(analysis.tableAccess).filter(
      (a) => a.status === "empty"
    ).length;

    console.log(
      pc.bold("Tables:"),
      pc.green(analysis.tables.length.toString())
    );
    console.log(
      pc.dim(
        `  ${exposedCount} exposed | ${emptyCount} empty/protected | ${deniedCount} denied`
      )
    );
    console.log();

    if (analysis.tables.length > 0) {
      analysis.tables.forEach((table) => {
        const access = analysis.tableAccess[table];
        let indicator = "";
        let description = "";

        switch (access?.status) {
          case "readable":
            indicator = pc.green("[+]");
            description = pc.dim(`(~${access.rowCount ?? "?"} rows exposed)`);
            break;
          case "empty":
            indicator = pc.yellow("[-]");
            description = pc.dim("(0 rows - empty or RLS)");
            break;
          case "denied":
            indicator = pc.red("[X]");
            description = pc.dim("(access denied)");
            break;
        }

        console.log(`  ${indicator} ${pc.white(table)} ${description}`);
      });
    } else {
      console.log(pc.dim("  No tables found"));
    }
    console.log();

    console.log(pc.bold("RPCs:"), pc.green(analysis.rpcs.length.toString()));
    if (analysis.rpcFunctions.length > 0) {
      analysis.rpcFunctions.forEach((rpc) => {
        console.log(`  * ${pc.white(rpc.name)}`);
        if (rpc.parameters.length > 0) {
          rpc.parameters.forEach((param: RPCParameter) => {
            const required = param.required
              ? pc.red("(required)")
              : pc.dim("(optional)");
            const type = param.format
              ? `${param.type} (${param.format})`
              : param.type;
            console.log(
              `    - ${pc.cyan(param.name)}: ${pc.yellow(type)} ${required}`
            );
          });
        } else {
          console.log(pc.dim("    No parameters"));
        }
      });
    } else {
      console.log(pc.dim("  No RPCs found"));
    }
    console.log();
  });

  console.log(pc.bold(pc.cyan("=".repeat(60))));
  console.log();
}
