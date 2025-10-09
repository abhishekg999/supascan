import { type Result, ok, err, log } from "../utils";

export type ExtractedCredentials = {
  url: string;
  key: string;
  source?: string;
};

export abstract class ExtractorService {
  private static readonly URL_PATTERNS = [
    /https:\/\/[a-z0-9-]+\.supabase\.co/g,
    /['"`]https:\/\/[a-z0-9-]+\.supabase\.co['"`]/g,
  ];

  private static readonly KEY_PATTERNS = [
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    /['"`]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"`]/g,
  ];

  private static readonly SCRIPT_SRC_PATTERN =
    /<script[^>]+src=["']([^"']+)["']/gi;
  private static readonly INLINE_SCRIPT_PATTERN =
    /<script[^>]*>([\s\S]*?)<\/script>/gi;

  public static async extractFromUrl(
    url: string,
    debug = false,
  ): Promise<Result<ExtractedCredentials>> {
    if (debug) log.debug(`Fetching content from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      return err(
        new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`,
        ),
      );
    }

    const content = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (debug) log.debug(`Fetched ${content.length} bytes (${contentType})`);

    const isHtml =
      contentType.includes("text/html") ||
      content.trim().startsWith("<!DOCTYPE") ||
      content.trim().startsWith("<html");
    const isJs =
      url.endsWith(".js") ||
      contentType.includes("javascript") ||
      contentType.includes("ecmascript");

    if (isJs) {
      return this.extractFromContent(content, debug, url);
    }

    if (isHtml) {
      return await this.extractFromHtml(content, url, debug);
    }

    return this.extractFromContent(content, debug, url);
  }

  public static async extractFromHtml(
    html: string,
    baseUrl: string,
    debug = false,
  ): Promise<Result<ExtractedCredentials>> {
    if (debug) log.debug("Detected HTML content, searching for JS files...");

    const inlineScripts = Array.from(html.matchAll(this.INLINE_SCRIPT_PATTERN));
    if (debug) log.debug(`Found ${inlineScripts.length} inline scripts`);

    for (const match of inlineScripts) {
      const scriptContent = match[1];
      if (!scriptContent) continue;

      const result = this.extractFromContent(
        scriptContent,
        false,
        "inline script",
      );
      if (result.success) {
        if (debug) log.debug("Found credentials in inline script");
        return result;
      }
    }

    const scriptSrcs = Array.from(html.matchAll(this.SCRIPT_SRC_PATTERN));
    if (debug) log.debug(`Found ${scriptSrcs.length} external scripts`);

    for (const match of scriptSrcs) {
      const scriptSrc = match[1];
      if (!scriptSrc) continue;

      const scriptUrl = this.resolveUrl(scriptSrc, baseUrl);
      if (debug) log.debug(`Checking script: ${scriptUrl}`);

      const response = await fetch(scriptUrl);
      if (!response.ok) {
        if (debug) log.debug(`Failed to fetch ${scriptUrl}`);
        continue;
      }

      const content = await response.text();
      const result = this.extractFromContent(content, false, scriptUrl);

      if (result.success) {
        if (debug) log.debug(`Found credentials in ${scriptUrl}`);
        return result;
      }
    }

    return err(new Error("No Supabase credentials found in any scripts"));
  }

  public static extractFromContent(
    content: string,
    debug = false,
    source?: string,
  ): Result<ExtractedCredentials> {
    if (debug) log.debug("Extracting Supabase credentials...");

    const urls = this.extractUrls(content);
    const keys = this.extractKeys(content);

    if (debug) {
      log.debug(`Found ${urls.length} potential URLs`);
      log.debug(`Found ${keys.length} potential keys`);
    }

    if (urls.length === 0) {
      return err(new Error("No Supabase URL found in content"));
    }

    if (keys.length === 0) {
      return err(new Error("No Supabase API key found in content"));
    }

    const url = urls[0]?.replace(/['"`;]/g, "") ?? "";
    const key = keys[0]?.replace(/['"`;]/g, "") ?? "";

    if (debug) {
      log.debug(`Extracted URL: ${url}`);
      log.debug(`Extracted key: ${key.substring(0, 20)}...`);
    }

    return ok({ url, key, source });
  }

  private static resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    const base = new URL(baseUrl);

    if (url.startsWith("//")) {
      return `${base.protocol}${url}`;
    }

    if (url.startsWith("/")) {
      return `${base.origin}${url}`;
    }

    const basePath = base.pathname.substring(
      0,
      base.pathname.lastIndexOf("/") + 1,
    );
    return `${base.origin}${basePath}${url}`;
  }

  private static extractUrls(content: string): string[] {
    const matches = new Set<string>();

    this.URL_PATTERNS.forEach((pattern) => {
      const found = content.match(pattern);
      if (found) {
        found.forEach((match) => matches.add(match));
      }
    });

    return Array.from(matches);
  }

  private static extractKeys(content: string): string[] {
    const matches = new Set<string>();

    this.KEY_PATTERNS.forEach((pattern) => {
      const found = content.match(pattern);
      if (found) {
        found.forEach((match) => matches.add(match));
      }
    });

    return Array.from(matches);
  }
}
