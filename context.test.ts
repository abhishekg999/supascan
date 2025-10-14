import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createCLIContext } from "./src/cli/context";

describe("createCLIContext", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("creates context with direct URL and key", async () => {
    const options = {
      url: "https://test.supabase.co",
      key: "test_key",
      debug: true,
      json: true,
    };

    const ctx = await createCLIContext(options);

    expect(ctx.url).toBe("https://test.supabase.co");
    expect(ctx.key).toBe("test_key");
    expect(ctx.debug).toBe(true);
    expect(ctx.json).toBe(true);
    expect(ctx.client).toBeDefined();
  });

  test("creates context with credential extraction", async () => {
    const mockFetch = mock(() => ({
      ok: true,
      text: () =>
        Promise.resolve(`
        const supabase = createBrowserClient)("https://extracted.supabase.co", "extracted_key");
      `),
      headers: {
        get: () => "application/javascript",
      },
    })) as any;

    global.fetch = mockFetch;

    const options = {
      extract: "https://example.com/test.js",
      debug: false,
    };

    const ctx = await createCLIContext(options);

    expect(ctx.url).toBe("https://extracted.supabase.co");
    expect(ctx.key).toBe("extracted_key");
    expect(ctx.debug).toBe(false);
  });

  test("validates required credentials", async () => {
    const options = {};

    await expect(createCLIContext(options)).rejects.toThrow(
      "Either provide --url and --key, or use --extract <url>",
    );
  });

  test("handles extraction failures", async () => {
    const mockFetch = mock(() => ({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: () => Promise.resolve(""),
      headers: {
        get: () => "text/html",
      },
    })) as any;

    global.fetch = mockFetch;

    const options = {
      extract: "https://example.com/test.js",
    };

    await expect(createCLIContext(options)).rejects.toThrow(
      "Failed to extract credentials",
    );
  });

  test("sets suppressExperimentalWarnings correctly", async () => {
    const options = {
      url: "https://test.supabase.co",
      key: "test_key",
      suppressExperimentalWarnings: true,
    };

    const ctx = await createCLIContext(options);

    expect(ctx.suppressExperimentalWarnings).toBe(true);
  });
});
