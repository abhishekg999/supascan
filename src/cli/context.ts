import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractFromUrl } from "../core/extractor";
import { log } from "./formatters/console";
import { parseHeaders } from "./utils/args";

export type CLIContext = {
  debug: boolean;
  json: boolean;
  html: boolean;
  suppressExperimentalWarnings: boolean;
  url: string;
  key: string;
  headers?: Record<string, string>;
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
  header?: string[];
}): Promise<CLIContext> {
  let url = options.url;
  let key = options.key;

  if (options.extract) {
    const extractGen = extractFromUrl(options.extract);
    let extractResult;

    while (true) {
      const next = await extractGen.next();
      if (next.done) {
        extractResult = next.value;
        break;
      }

      if (options.debug) {
        const event = next.value;
        if (event.type === "content_fetched") {
          console.error(
            `[DEBUG] Fetched ${event.data.size} bytes (${event.data.contentType})`,
          );
        } else if (event.type === "script_checking") {
          console.error(`[DEBUG] Checking script: ${event.data.scriptUrl}`);
        }
      }
    }

    if (!extractResult || !extractResult.success) {
      throw new Error(
        `Failed to extract credentials: ${extractResult?.error.message ?? "Unknown error"}`,
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
      console.error(`[DEBUG] URL: ${url}`);
      console.error(`[DEBUG] Key: ${key?.substring(0, 20)}...`);
    }
  }

  if (!url || !key) {
    throw new Error("Either provide --url and --key, or use --extract <url>");
  }

  const headers =
    options.header && options.header.length > 0
      ? parseHeaders(options.header)
      : undefined;

  const clientOptions = headers ? { global: { headers } } : undefined;
  const client = createClient(url, key, clientOptions);

  return {
    debug: options.debug || false,
    json: options.json || false,
    html: options.html || false,
    suppressExperimentalWarnings: options.suppressExperimentalWarnings || false,
    url,
    key,
    headers,
    client,
  };
}
