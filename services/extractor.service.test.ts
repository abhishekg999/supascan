import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockCLIContext } from "../mocks";
import { ExtractorService } from "./extractor.service";

const mockFetch = mock(() => ({
  ok: true,
  text: () => Promise.resolve(""),
  headers: {
    get: () => "text/html",
  },
})) as any;

global.fetch = mockFetch;

describe("ExtractorService", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("extractFromContent", () => {
    test("extracts from createBrowserClient pattern", () => {
      const content = `
        const supabase = createBrowserClient(
          "https://test.supabase.co",
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test"
        );
      `;
      const ctx = createMockCLIContext();

      const result = ExtractorService.extractFromContent(content, ctx);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.url).toBe("https://test.supabase.co");
        expect(result.value.key).toBe(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test",
        );
      }
    });

    test("extracts from closest URL-key pairs", () => {
      const content = `
        const url = "https://test.supabase.co";
        const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test";
      `;
      const ctx = createMockCLIContext();

      const result = ExtractorService.extractFromContent(content, ctx);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.url).toBe("https://test.supabase.co");
        expect(result.value.key).toBe(
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test",
        );
      }
    });

    test("returns error when no credentials found", () => {
      const content = "const x = 1;";
      const ctx = createMockCLIContext();

      const result = ExtractorService.extractFromContent(content, ctx);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe(
          "No Supabase URL-key pairs found in content",
        );
      }
    });
  });

  describe("extractFromUrl", () => {
    test("handles JavaScript files", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(`
            const supabase = createBrowserClient(
              "https://test.supabase.co",
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test"
            );
          `),
        headers: {
          get: () => "application/javascript",
        },
      });

      const ctx = createMockCLIContext();
      const result = await ExtractorService.extractFromUrl(
        "https://example.com/app.js",
        ctx,
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("https://example.com/app.js");
    });

    test("handles HTML files with inline scripts", async () => {
      const htmlContent = `
        <html>
          <script>
            const supabase = createBrowserClient(
              "https://test.supabase.co",
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test"
            );
          </script>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(htmlContent),
        headers: {
          get: () => "text/html",
        },
      });

      const ctx = createMockCLIContext();
      const result = await ExtractorService.extractFromUrl(
        "https://example.com/index.html",
        ctx,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.url).toBe("https://test.supabase.co");
      }
    });

    test("handles HTML files with external scripts", async () => {
      const htmlContent = `
        <html>
          <script src="/app.js"></script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(htmlContent),
          headers: {
            get: () => "text/html",
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () =>
            Promise.resolve(`
              const supabase = createBrowserClient(
                "https://test.supabase.co",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test"
              );
            `),
          headers: {
            get: () => "application/javascript",
          },
        });

      const ctx = createMockCLIContext();
      const result = await ExtractorService.extractFromUrl(
        "https://example.com/index.html",
        ctx,
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    test("returns error when fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: () => Promise.resolve(""),
        headers: {
          get: () => "text/html",
        },
      });

      const ctx = createMockCLIContext();
      const result = await ExtractorService.extractFromUrl(
        "https://example.com/missing.html",
        ctx,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe("Failed to fetch URL: 404 Not Found");
      }
    });
  });
});
