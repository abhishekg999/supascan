import type { ExtractedCredentials, ExtractorEvent } from "./extractor.types";
import type { Result } from "./result.types";
import { err, ok } from "./result.types";

const URL_PATTERNS = [
  /https:\/\/[a-z0-9-]+\.supabase\.co\/?/g,
  /['"`]https:\/\/[a-z0-9-]+\.supabase\.co\/?['"`]/g,
];

const KEY_PATTERNS = [
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  /['"`]eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+['"`]/g,
];

const CREATE_BROWSER_CLIENT_PATTERN =
  /createBrowserClient\)\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']/g;

const SCRIPT_SRC_PATTERN = /<script[^>]+src=["']([^"']+)["']/gi;
const INLINE_SCRIPT_PATTERN = /<script[^>]*>([\s\S]*?)<\/script>/gi;

export async function* extractFromUrl(
  url: string,
): AsyncGenerator<ExtractorEvent, Result<ExtractedCredentials>> {
  yield { type: "extraction_started", data: { url } };

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

  yield {
    type: "content_fetched",
    data: { url, size: content.length, contentType },
  };

  const isHtml =
    contentType.includes("text/html") ||
    content.trim().startsWith("<!DOCTYPE") ||
    content.trim().startsWith("<html");
  const isJs =
    url.endsWith(".js") ||
    contentType.includes("javascript") ||
    contentType.includes("ecmascript");

  if (isJs) {
    const result = extractFromContent(content, url);
    if (result.success) {
      yield { type: "credentials_found", data: { source: url } };
      yield {
        type: "extraction_completed",
        data: { credentials: result.value },
      };
    }
    return result;
  }

  if (isHtml) {
    const gen = extractFromHtml(content, url);
    while (true) {
      const next = await gen.next();
      if (next.done) {
        return next.value;
      }
      yield next.value;
    }
  }

  const result = extractFromContent(content, url);
  if (result.success) {
    yield { type: "credentials_found", data: { source: url } };
    yield { type: "extraction_completed", data: { credentials: result.value } };
  }
  return result;
}

async function* extractFromHtml(
  html: string,
  baseUrl: string,
): AsyncGenerator<ExtractorEvent, Result<ExtractedCredentials>> {
  const inlineScripts = Array.from(html.matchAll(INLINE_SCRIPT_PATTERN));
  const scriptSrcs = Array.from(html.matchAll(SCRIPT_SRC_PATTERN));

  yield {
    type: "html_detected",
    data: { scriptCount: inlineScripts.length + scriptSrcs.length },
  };

  for (const match of inlineScripts) {
    const scriptContent = match[1];
    if (!scriptContent) continue;

    const result = extractFromContent(scriptContent, "inline script");
    if (result.success) {
      yield { type: "credentials_found", data: { source: "inline script" } };
      yield {
        type: "extraction_completed",
        data: { credentials: result.value },
      };
      return result;
    }
  }

  for (const match of scriptSrcs) {
    const scriptSrc = match[1];
    if (!scriptSrc) continue;

    const scriptUrl = resolveUrl(scriptSrc, baseUrl);
    yield { type: "script_checking", data: { scriptUrl } };

    const response = await fetch(scriptUrl);
    if (!response.ok) {
      continue;
    }

    const content = await response.text();
    const result = extractFromContent(content, scriptUrl);

    if (result.success) {
      yield { type: "credentials_found", data: { source: scriptUrl } };
      yield {
        type: "extraction_completed",
        data: { credentials: result.value },
      };
      return result;
    }
  }

  return err(new Error("No Supabase credentials found in any scripts"));
}

function extractFromContent(
  content: string,
  source?: string,
): Result<ExtractedCredentials> {
  const createBrowserClientMatch = CREATE_BROWSER_CLIENT_PATTERN.exec(content);
  if (createBrowserClientMatch) {
    const url = createBrowserClientMatch[1];
    const key = createBrowserClientMatch[2];

    if (url && key) {
      return ok({ url, key, source });
    }
  }

  const pairs = findClosestPairs(content);

  if (pairs.length === 0) {
    return err(new Error("No Supabase URL-key pairs found in content"));
  }

  const pair = pairs[0];
  if (!pair) {
    return err(new Error("No valid URL-key pairs found"));
  }

  const { url, key } = pair;

  return ok({ url, key, source });
}

function resolveUrl(url: string, baseUrl: string): string {
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

function findClosestPairs(
  content: string,
): Array<{ url: string; key: string; distance: number }> {
  const urlMatches = findAllMatches(content, URL_PATTERNS);
  const keyMatches = findAllMatches(content, KEY_PATTERNS);

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

function findAllMatches(
  content: string,
  patterns: RegExp[],
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
