import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ExtractorService } from "./services/extractor.service";
import { log } from "./utils";

export type CLIContext = {
  debug: boolean;
  json: boolean;
  html: boolean;
  suppressExperimentalWarnings: boolean;
  url: string;
  key: string;
  client: SupabaseClient;
};

export async function createCLIContext(options: {
  url?: string;
  key?: string;
  extract?: string;
  debug?: boolean;
  json?: boolean;
  html?: boolean;
  suppressExperimentalWarnings?: boolean;
}): Promise<CLIContext> {
  let url = options.url;
  let key = options.key;

  if (options.extract) {
    const tempCtx: CLIContext = {
      debug: options.debug || false,
      json: false,
      html: false,
      suppressExperimentalWarnings:
        options.suppressExperimentalWarnings || false,
      url: "",
      key: "",
      client: createClient("https://temp.supabase.co", "temp_key"),
    };

    const extractResult = await ExtractorService.extractFromUrl(
      options.extract,
      tempCtx,
    );

    if (!extractResult.success) {
      throw new Error(
        `Failed to extract credentials: ${extractResult.error.message}`,
      );
    }

    url = extractResult.value.url;
    key = extractResult.value.key;

    if (extractResult.value.source) {
      log.success(`Extracted credentials from: ${extractResult.value.source}`);
    } else {
      log.success("Extracted credentials from target");
    }

    if (options.debug) {
      log.debug(tempCtx, `URL: ${url}`);
      log.debug(tempCtx, `Key: ${key?.substring(0, 20)}...`);
    }
  }

  if (!url || !key) {
    throw new Error("Either provide --url and --key, or use --extract <url>");
  }

  const client = createClient(url, key);

  return {
    debug: options.debug || false,
    json: options.json || false,
    html: options.html || false,
    suppressExperimentalWarnings: options.suppressExperimentalWarnings || false,
    url,
    key,
    client,
  };
}
