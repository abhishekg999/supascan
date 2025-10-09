import { type Result, err, log, ok } from "../utils";

export type ExtractedCredentials = {
  url: string;
  key: string;
  source?: string;
};

export abstract class ExtractorService {
  private static readonly URL_PATTERNS = [
    /https:\/\/[a-z0-9-]+\.supabase\.co\/?/g,
    /['"`]https:\/\/[a-z0-9-]+\.supabase\.co\/?['"`]/g,
  ];

  private static readonly KEY_PATTERNS = [
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    /['"`]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"`]/g,
  ];

  private static readonly CREATE_BROWSER_CLIENT_PATTERN =
    /createBrowserClient\)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g;

  private static readonly SCRIPT_SRC_PATTERN =
    /<script[^>]+src=["']([^"']+)["']/gi;
  private static readonly INLINE_SCRIPT_PATTERN =
    /<script[^>]*>([\s\S]*?)<\/script>/gi;

  public static async extractFromUrl(
    url: string,
    debug = false
  ): Promise<Result<ExtractedCredentials>> {
    if (debug) log.debug(`Fetching content from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      return err(
        new Error(
          `Failed to fetch URL: ${response.status} ${response.statusText}`
        )
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
    debug = false
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
        "inline script"
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
    source?: string
  ): Result<ExtractedCredentials> {
    if (debug) log.debug("Extracting Supabase credentials...");

    // First, try to find createBrowserClient pattern (most specific)
    const createBrowserClientMatch =
      this.CREATE_BROWSER_CLIENT_PATTERN.exec(content);
    if (createBrowserClientMatch) {
      const url = createBrowserClientMatch[1];
      const key = createBrowserClientMatch[2];

      if (url && key) {
        if (debug) {
          log.debug("Found createBrowserClient pattern");
          log.debug(`Extracted URL: ${url}`);
          log.debug(`Extracted key: ${key.substring(0, 20)}...`);
        }

        return ok({ url, key, source });
      }
    }

    // Fallback to the original closest pairs method
    const pairs = this.findClosestPairs(content);

    if (debug) {
      log.debug(`Found ${pairs.length} potential URL-key pairs`);
    }

    if (pairs.length === 0) {
      return err(new Error("No Supabase URL-key pairs found in content"));
    }

    const pair = pairs[0];
    if (!pair) {
      return err(new Error("No valid URL-key pairs found"));
    }

    const { url, key } = pair;

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
      base.pathname.lastIndexOf("/") + 1
    );
    return `${base.origin}${basePath}${url}`;
  }

  private static findClosestPairs(
    content: string
  ): Array<{ url: string; key: string; distance: number }> {
    const urlMatches = this.findAllMatches(content, this.URL_PATTERNS);
    const keyMatches = this.findAllMatches(content, this.KEY_PATTERNS);

    const pairs: Array<{ url: string; key: string; distance: number }> = [];

    for (const urlMatch of urlMatches) {
      for (const keyMatch of keyMatches) {
        const distance = Math.abs(urlMatch.index - keyMatch.index);
        pairs.push({
          url: urlMatch.text.replace(/['"`;]/g, ""),
          key: keyMatch.text.replace(/['"`;]/g, ""),
          distance,
        });
      }
    }

    return pairs.sort((a, b) => a.distance - b.distance);
  }

  private static findAllMatches(
    content: string,
    patterns: RegExp[]
  ): Array<{ text: string; index: number }> {
    const matches: Array<{ text: string; index: number }> = [];

    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        matches.push({
          text: match[0],
          index: match.index,
        });
      }
    });

    return matches;
  }
}
