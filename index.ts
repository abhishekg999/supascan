import { Command } from "@commander-js/extra-typings";
import { createClient } from "@supabase/supabase-js";
import pc from "picocolors";
import { AnalyzerService } from "./services/analyzer.service";
import { ExtractorService } from "./services/extractor.service";
import {
  SupabaseService,
  type RPCFunction,
  type RPCParameter,
} from "./services/supabase.service";
import {
  experimentalWarning,
  log,
  parseRPCArgs,
  setExperimentalWarnings,
} from "./utils";
import { VERSION } from "./version";

const program = new Command();

program
  .name("supadump")
  .description("Security analysis tool for Supabase")
  .version(VERSION)
  .option("-u, --url <url>", "Supabase URL")
  .option("-k, --key <key>", "Supabase anon key")
  .option("-s, --schema <schema>", "Schema to analyze (default: all schemas)")
  .option(
    "-x, --extract <url>",
    "Extract credentials from JS file URL (experimental)",
  )
  .option(
    "--dump <schema.table|schema>",
    "Dump data from specific table or swagger JSON from schema",
  )
  .option("--limit <number>", "Limit rows for dump", "10")
  .option(
    "--rpc <schema.rpc_name>",
    "Call an RPC function (read-only operations only)",
  )
  .option(
    "--args <json>",
    "JSON arguments for RPC call (use $VAR for environment variables)",
  )
  .option("--json", "Output as JSON")
  .option("-d, --debug", "Enable debug mode")
  .option("--explain", "Show query execution plan")
  .option("--suppress-experimental-warnings", "Suppress experimental warnings")
  .action(async (options) => {
    if (options.suppressExperimentalWarnings) {
      setExperimentalWarnings(true);
    }

    if (options.debug) {
      log.debug("CLI Options", options);
    }

    let url = options.url;
    let key = options.key;

    if (options.extract) {
      experimentalWarning();

      const extractResult = await ExtractorService.extractFromUrl(
        options.extract,
        options.debug,
      );

      if (!extractResult.success) {
        log.error("Failed to extract credentials", extractResult.error.message);
        process.exit(1);
      }

      url = extractResult.value.url;
      key = extractResult.value.key;

      if (extractResult.value.source) {
        log.success(
          `Extracted credentials from: ${extractResult.value.source}`,
        );
      } else {
        log.success("Extracted credentials from target");
      }

      if (options.debug) {
        log.debug(`URL: ${url}`);
        log.debug(`Key: ${key.substring(0, 20)}...`);
      }
    }

    if (!url || !key) {
      log.error("Either provide --url and --key, or use --extract <url>");
      process.exit(1);
    }

    const client = createClient(url, key);

    if (options.rpc) {
      const parts = options.rpc.split(".");

      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        log.error("Invalid RPC format. Use: schema.rpc_name");
        process.exit(1);
      }

      const schema = parts[0];
      const rpcName = parts[1];

      const rpcFunctionsResult = await SupabaseService.getRPCsWithParameters(
        client,
        schema,
        options.debug,
      );

      let rpcFunction: RPCFunction | null = null;

      if (rpcFunctionsResult.success) {
        rpcFunction =
          rpcFunctionsResult.value.find(
            (rpc) => rpc.name === `rpc/${rpcName}`,
          ) || null;
      } else {
        log.warn(
          "Failed to get RPC functions from schema, proceeding without validation",
          rpcFunctionsResult.error.message,
        );
      }

      if (!options.args) {
        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log(pc.bold(pc.cyan(`  RPC HELP: ${schema}.${rpcName}`)));
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();

        if (rpcFunction && rpcFunction.parameters.length > 0) {
          console.log(pc.bold("Parameters:"));
          rpcFunction.parameters.forEach((param: RPCParameter) => {
            const required = param.required
              ? pc.red("(required)")
              : pc.dim("(optional)");
            const type = param.format
              ? `${param.type} (${param.format})`
              : param.type;
            console.log(
              `  • ${pc.cyan(param.name)}: ${pc.yellow(type)} ${required}`,
            );
            if (param.description) {
              console.log(pc.dim(`    ${param.description}`));
            }
          });
          console.log();
          console.log(pc.bold("Usage:"));
          console.log(
            pc.dim(
              `supadump --rpc "${schema}.${rpcName}" --args '{"param1": "value1", "param2": "value2"}'`,
            ),
          );
        } else if (rpcFunction) {
          console.log(pc.dim("No parameters required"));
          console.log();
          console.log(pc.bold("Usage:"));
          console.log(pc.dim(`supadump --rpc "${schema}.${rpcName}"`));
        } else {
          console.log(
            pc.yellow(
              "⚠️  Schema introspection failed - parameter information unavailable",
            ),
          );
          console.log();
          console.log(pc.bold("Usage:"));
          console.log(
            pc.dim(
              `supadump --rpc "${schema}.${rpcName}" --args '{"param1": "value1"}'`,
            ),
          );
          console.log();
          console.log(
            pc.dim(
              "Note: You can still call the RPC, but parameter validation is disabled",
            ),
          );
        }
        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();
        return;
      }

      let args: Record<string, any> = {};
      try {
        args = parseRPCArgs(options.args);
      } catch (error) {
        log.error(
          "Failed to parse RPC arguments",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }

      if (rpcFunction) {
        const requiredParams = rpcFunction.parameters.filter(
          (p: RPCParameter) => p.required,
        );
        const missingParams = requiredParams.filter(
          (p: RPCParameter) => !(p.name in args),
        );

        if (missingParams.length > 0) {
          log.error(
            `Missing required parameters: ${missingParams.map((p: RPCParameter) => p.name).join(", ")}`,
          );
          process.exit(1);
        }
      } else {
        log.warn(
          "Skipping parameter validation due to schema introspection failure",
        );
      }

      const rpcResult = await SupabaseService.callRPC(
        client,
        schema,
        rpcName,
        args,
        options.debug,
        {
          get: true,
          explain: options.explain,
        },
      );

      if (!rpcResult.success) {
        log.error("RPC call failed", rpcResult.error.message);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(rpcResult.value, null, 2));
      } else {
        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        if (options.explain) {
          console.log(pc.bold(pc.cyan(`  QUERY PLAN: ${schema}.${rpcName}`)));
        } else {
          console.log(pc.bold(pc.cyan(`  RPC RESULT: ${schema}.${rpcName}`)));
        }
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();

        if (options.explain) {
          console.log(pc.bold("Execution Plan:"));
          console.log();
          if (typeof rpcResult.value === "string") {
            console.log(pc.yellow(rpcResult.value));
          } else {
            console.log(JSON.stringify(rpcResult.value, null, 2));
          }
        } else if (Array.isArray(rpcResult.value)) {
          console.log(
            pc.bold("Results:"),
            pc.green(rpcResult.value.length.toString()),
          );
          console.log();
          if (rpcResult.value.length > 0) {
            console.table(rpcResult.value);
          } else {
            console.log(pc.dim("No results returned"));
          }
        } else if (
          typeof rpcResult.value === "object" &&
          rpcResult.value !== null
        ) {
          console.log(pc.bold("Result:"));
          console.table([rpcResult.value]);
        } else {
          console.log(pc.bold("Result:"), pc.green(String(rpcResult.value)));
        }

        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();
      }

      return;
    }

    if (options.dump) {
      const parts = options.dump.split(".");

      if (parts.length === 1 && parts[0]) {
        const schema = parts[0];

        const swaggerResult = await SupabaseService.getSwagger(
          client,
          schema,
          options.debug,
        );

        if (!swaggerResult.success) {
          log.error("Failed to get swagger", swaggerResult.error.message);
          process.exit(1);
        }

        console.log(JSON.stringify(swaggerResult.value, null, 2));
        return;
      }

      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        log.error("Invalid format. Use: schema.table or schema");
        process.exit(1);
      }

      const schema = parts[0];
      const table = parts[1];
      const limit = parseInt(options.limit);

      const dumpResult = await SupabaseService.dumpTable(
        client,
        schema,
        table,
        limit,
        options.debug,
      );

      if (!dumpResult.success) {
        log.error("Failed to dump table", dumpResult.error.message);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(dumpResult.value, null, 2));
      } else {
        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log(pc.bold(pc.cyan(`  TABLE DUMP: ${schema}.${table}`)));
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();
        console.log(
          pc.bold("Total rows:"),
          pc.green(dumpResult.value.count.toString()),
        );
        console.log(
          pc.bold("Showing:"),
          pc.green(dumpResult.value.rows.length.toString()),
        );
        console.log(
          pc.bold("Columns:"),
          pc.green(dumpResult.value.columns.length.toString()),
        );
        console.log();
        console.log(pc.dim(dumpResult.value.columns.join(", ")));
        console.log();

        if (dumpResult.value.rows.length > 0) {
          console.table(dumpResult.value.rows);
        } else {
          console.log(pc.dim("No rows found"));
        }

        console.log();
        console.log(pc.bold(pc.cyan("━".repeat(60))));
        console.log();
      }

      return;
    }

    const analysisResult = await AnalyzerService.analyze(
      client,
      options.schema,
      url,
      key,
      options.debug,
    );

    if (!analysisResult.success) {
      log.error("Analysis failed", analysisResult.error.message);
      process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(analysisResult.value, null, 2));
    } else {
      AnalyzerService.display(analysisResult.value);
    }
  });

if (import.meta.main) {
  await program.parseAsync(process.argv);
}
