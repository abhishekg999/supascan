import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockCLIContext, testJWT } from "../mocks";
import { AnalyzerService } from "./analyzer.service";

mock.module("./supabase.service", () => ({
  SupabaseService: {
    getSchemas: mock(() => ({
      success: true,
      value: ["public", "auth"],
    })),
    getTables: mock(() => ({
      success: true,
      value: ["users", "posts"],
    })),
    getRPCs: mock(() => ({
      success: true,
      value: ["/rpc/get_user"],
    })),
    getRPCsWithParameters: mock(() => ({
      success: true,
      value: [
        {
          name: "/rpc/get_user",
          parameters: [
            {
              name: "id",
              type: "string",
              required: true,
            },
          ],
        },
      ],
    })),
    testTablesRead: mock(() => ({
      success: true,
      value: {
        users: { status: "readable", accessible: true, hasData: true },
        posts: { status: "empty", accessible: true, hasData: false },
      },
    })),
    getSwagger: mock(() => ({
      success: true,
      value: {
        info: {
          title: "Test API",
          version: "1.0.0",
        },
      },
    })),
  },
}));

describe("AnalyzerService", () => {
  let ctx: ReturnType<typeof createMockCLIContext>;

  beforeEach(() => {
    ctx = createMockCLIContext();
    mock.restore();
  });

  describe("analyze", () => {
    test("combines all schema details", async () => {
      const result = await AnalyzerService.analyze(ctx, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.schemas).toEqual(["public", "auth"]);
        expect(result.value.schemaDetails).toHaveProperty("public");
        expect(result.value.schemaDetails).toHaveProperty("auth");
        expect(result.value.schemaDetails.public?.tables).toEqual([
          "users",
          "posts",
        ]);
        expect(result.value.schemaDetails.public?.rpcs).toEqual([
          "/rpc/get_user",
        ]);
        expect(result.value.schemaDetails.public?.tableAccess).toHaveProperty(
          "users"
        );
        expect(result.value.schemaDetails.public?.tableAccess).toHaveProperty(
          "posts"
        );
      }
    });

    test("handles target schema filter", async () => {
      const result = await AnalyzerService.analyze(ctx, "public");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.schemaDetails).toHaveProperty("public");
        expect(result.value.schemaDetails).not.toHaveProperty("auth");
      }
    });

    test("includes summary with domain and JWT info", async () => {
      ctx.url = "https://test.supabase.co";
      ctx.key = testJWT;

      const result = await AnalyzerService.analyze(ctx, undefined);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.summary.domain).toBe("test.supabase.co");
        expect(result.value.summary.jwtInfo).toBeDefined();
        expect(result.value.summary.jwtInfo?.iss).toBe("supabase");
        expect(result.value.summary.jwtInfo?.aud).toBe("test");
        expect(result.value.summary.jwtInfo?.role).toBe("anon");
      }
    });
  });

  describe("extractDomain", () => {
    test("parses URL correctly", () => {
      const analyzer = AnalyzerService as any;
      expect(analyzer.extractDomain("https://test.supabase.co")).toBe(
        "test.supabase.co"
      );
      expect(analyzer.extractDomain("http://localhost:3000")).toBe("localhost");
    });

    test("handles invalid URL", () => {
      const analyzer = AnalyzerService as any;
      expect(analyzer.extractDomain("invalid-url")).toBe("invalid-url");
    });
  });

  describe("decodeJWT", () => {
    test("decodes valid JWT", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.decodeJWT(testJWT);

      expect(result).toEqual({
        iss: "supabase",
        aud: "test",
        role: "anon",
        exp: 1640995200,
        iat: 1640908800,
      });
    });

    test("handles invalid JWT", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.decodeJWT("invalid.jwt.token");

      expect(result).toBeUndefined();
    });

    test("handles malformed JWT", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.decodeJWT("not-a-jwt");

      expect(result).toBeUndefined();
    });
  });

  describe("extractMetadata", () => {
    test("extracts Supabase metadata from URL", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.extractMetadata(
        "https://test.supabase.co",
        false
      );

      expect(result).toEqual({
        protocol: "https:",
        port: "443",
        service: "Supabase",
        region: "test",
      });
    });

    test("handles non-Supabase URLs", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.extractMetadata("https://example.com", false);

      expect(result).toEqual({
        protocol: "https:",
        port: "443",
      });
    });

    test("handles URLs with custom ports", () => {
      const analyzer = AnalyzerService as any;
      const result = analyzer.extractMetadata("http://localhost:3000", false);

      expect(result).toEqual({
        protocol: "http:",
        port: "3000",
      });
    });
  });
});
