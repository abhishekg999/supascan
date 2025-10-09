import { createClient } from "@supabase/supabase-js";
import { Command } from "@commander-js/extra-typings";
import { VERSION } from "./version";
import { log, setExperimentalWarnings, experimentalWarning } from "./utils";
import { AnalyzerService } from "./services/analyzer.service";
import { ExtractorService } from "./services/extractor.service";

const program = new Command();

program
  .name("supadump")
  .description("Security analysis tool for Supabase")
  .version(VERSION)
  .option("-u, --url <url>", "Supabase URL")
  .option("-k, --key <key>", "Supabase anon key")
  .option("-s, --schema <schema>", "Schema to analyze", "public")
  .option(
    "-x, --extract <url>",
    "Extract credentials from JS file URL (experimental)",
  )
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
      AnalyzerService.display(analysisResult.value, options.schema);
    }
  });

if (import.meta.main) {
  await program.parseAsync(process.argv);
}
