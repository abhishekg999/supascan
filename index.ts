import { createClient } from "@supabase/supabase-js";
import { Command } from "@commander-js/extra-typings";
import { VERSION } from "./version";
import { log, setExperimentalWarnings, experimentalWarning } from "./utils";
import { AnalyzerService } from "./services/analyzer.service";
import { ExtractorService } from "./services/extractor.service";
import { SupabaseService } from "./services/supabase.service";
import pc from "picocolors";

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
  .option("--dump <schema.table>", "Dump data from specific table")
  .option("--limit <number>", "Limit rows for dump", "10")
  .option("--json", "Output as JSON")
  .option("-d, --debug", "Enable debug mode")
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

    if (options.dump) {
      const parts = options.dump.split(".");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        log.error("Invalid format. Use: schema.table");
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
        console.log(pc.bold("Total rows:"), pc.green(dumpResult.value.count.toString()));
        console.log(pc.bold("Showing:"), pc.green(dumpResult.value.rows.length.toString()));
        console.log(pc.bold("Columns:"), pc.green(dumpResult.value.columns.length.toString()));
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
