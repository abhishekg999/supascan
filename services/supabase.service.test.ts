import { beforeEach, describe, expect, mock, test } from "bun:test";
import { createMockCLIContext } from "../mocks";
import { SupabaseService } from "./supabase.service";

describe("SupabaseService", () => {
  let ctx: ReturnType<typeof createMockCLIContext>;

  beforeEach(() => {
    ctx = createMockCLIContext();
    mock.restore();
  });

  describe("getSchemas", () => {
    test("parses schemas from error message", async () => {
      const mockSelect = mock(() => ({
        data: null,
        error: {
          message:
            'relation "" does not exist. Available schemas following: public, auth, storage',
        },
      }));

      const mockFrom = mock(() => ({
        select: mockSelect,
      }));

      const mockSchema = mock(() => ({
        from: mockFrom,
      }));

      const mockClient = {
        schema: mockSchema,
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.getSchemas(ctx);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(["public", "auth", "storage"]);
      }
    });

    test("handles empty schema list", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              data: null,
              error: {
                message: 'relation "" does not exist. Available schemas:',
              },
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.getSchemas(ctx);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe("getTables", () => {
    test("filters RPC paths from swagger", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              data: {
                paths: {
                  "/users": {},
                  "/posts": {},
                  "/rpc/get_user": {},
                  "/rpc/create_post": {},
                },
              },
              error: null,
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.getTables(ctx, "public");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(["users", "posts"]);
      }
    });
  });

  describe("getRPCs", () => {
    test("filters table paths from swagger", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              data: {
                paths: {
                  "/users": {},
                  "/posts": {},
                  "/rpc/get_user": {},
                  "/rpc/create_post": {},
                },
              },
              error: null,
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.getRPCs(ctx, "public");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual(["rpc/get_user", "rpc/create_post"]);
      }
    });
  });

  describe("getRPCsWithParameters", () => {
    test("extracts parameters from swagger", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              data: {
                paths: {
                  "/rpc/get_user": {
                    post: {
                      parameters: [
                        {
                          in: "body",
                          schema: {
                            properties: {
                              id: {
                                type: "string",
                                description: "User ID",
                              },
                              name: {
                                type: "string",
                                format: "email",
                              },
                            },
                            required: ["id"],
                          },
                        },
                      ],
                    },
                  },
                },
              },
              error: null,
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.getRPCsWithParameters(ctx, "public");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.name).toBe("rpc/get_user");
        expect(result.value[0]?.parameters).toHaveLength(2);
        expect(result.value[0]?.parameters[0]).toEqual({
          name: "id",
          type: "string",
          required: true,
          description: "User ID",
        });
        expect(result.value[0]?.parameters[1]).toEqual({
          name: "name",
          type: "string",
          format: "email",
          required: false,
          description: undefined,
        });
      }
    });
  });

  describe("testTableRead", () => {
    test("returns readable status when data exists", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              limit: mock(() => ({
                data: [{ id: 1, name: "test" }],
                error: null,
              })),
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.testTableRead(
        ctx,
        "public",
        "users"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          status: "readable",
          accessible: true,
          hasData: true,
        });
      }
    });

    test("returns denied status when access denied", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              limit: mock(() => ({
                data: null,
                error: { message: "permission denied" },
              })),
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.testTableRead(
        ctx,
        "public",
        "users"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          status: "denied",
          accessible: false,
          hasData: false,
        });
      }
    });

    test("returns empty status when no data", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              limit: mock(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.testTableRead(
        ctx,
        "public",
        "users"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toEqual({
          status: "empty",
          accessible: true,
          hasData: false,
          rowCount: 0,
        });
      }
    });
  });

  describe("dumpTable", () => {
    test("returns columns and rows with count", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              limit: mock(() => ({
                data: [
                  { id: 1, name: "Alice" },
                  { id: 2, name: "Bob" },
                ],
                error: null,
                count: 100,
              })),
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.dumpTable(
        ctx,
        "public",
        "users",
        10
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.columns).toEqual(["id", "name"]);
        expect(result.value.rows).toHaveLength(2);
        expect(result.value.count).toBe(100);
      }
    });

    test("handles empty table", async () => {
      const mockClient = {
        schema: mock(() => ({
          from: mock(() => ({
            select: mock(() => ({
              limit: mock(() => ({
                data: [],
                error: null,
                count: 0,
              })),
            })),
          })),
        })),
      };
      ctx.client = mockClient as any;

      const result = await SupabaseService.dumpTable(
        ctx,
        "public",
        "users",
        10
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.columns).toEqual([]);
        expect(result.value.rows).toEqual([]);
        expect(result.value.count).toBe(0);
      }
    });
  });
});
