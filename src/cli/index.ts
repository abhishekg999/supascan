import { Command } from "@commander-js/extra-typings";
import { VERSION } from "../../version";
import { executeAnalyzeCommand } from "./commands/analyze";
import { executeDumpCommand } from "./commands/dump";
import { executeRPCCommand } from "./commands/rpc";
import { createCLIContext } from "./context";
import {
  experimentalWarning,
  log,
  setExperimentalWarnings,
} from "./formatters/console";

const program = new Command();

program
  .name("supascan")
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
  .option("--limit <number>", "Limit rows for dump or RPC results", "10")
  .option(
    "--rpc <schema.rpc_name>",
    "Call an RPC function (read-only operations only)",
  )
  .option(
    "--args <json>",
    "JSON arguments for RPC call (use $VAR for environment variables)",
  )
  .option("--json", "Output as JSON")
  .option("--html", "Generate HTML report")
  .option("-d, --debug", "Enable debug mode")
  .option("--explain", "Show query execution plan")
  .option("--suppress-experimental-warnings", "Suppress experimental warnings")
  .action(async (options) => {
    try {
      if (options.json && options.html) {
        log.error("Cannot use --json and --html together. Please choose one.");
        process.exit(1);
      }

      if (options.suppressExperimentalWarnings) {
        setExperimentalWarnings(true);
      }

      if (options.extract) {
        experimentalWarning();
      }

      const ctx = await createCLIContext(options);

      if (options.rpc) {
        await executeRPCCommand(ctx, {
          rpc: options.rpc,
          args: options.args,
          limit: options.limit,
          explain: options.explain,
        });
        return;
      }

      if (options.dump) {
        await executeDumpCommand(ctx, {
          dump: options.dump,
          limit: options.limit,
        });
        return;
      }

      await executeAnalyzeCommand(ctx, {
        schema: options.schema,
      });
    } catch (error) {
      log.error(
        "Command failed",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

if (import.meta.main) {
  await program.parseAsync(process.argv);
}
