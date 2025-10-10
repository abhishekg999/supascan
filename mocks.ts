import type { SupabaseClient } from "@supabase/supabase-js";
import { mock } from "bun:test";
import type { CLIContext } from "./context";

export const createMockSupabaseClient = () => {
  const mockClient = {
    schema: mock(() => ({
      from: mock(() => ({
        select: mock(() => ({
          data: null,
          error: null,
          count: 0,
        })),
        limit: mock(() => ({
          data: [],
          error: null,
          count: 0,
        })),
      })),
      rpc: mock(() => ({
        data: null,
        error: null,
      })),
    })),
  } as unknown as SupabaseClient;

  return mockClient;
};

export const createMockCLIContext = (
  overrides: Partial<CLIContext> = {},
): CLIContext => ({
  debug: false,
  json: false,
  html: false,
  suppressExperimentalWarnings: false,
  url: "https://test.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test",
  client: createMockSupabaseClient(),
  ...overrides,
});

export const mockFetch = mock(() => ({
  ok: true,
  text: () => Promise.resolve(""),
  headers: {
    get: () => "text/html",
  },
}));

export const testCredentials = {
  url: "https://test.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.test",
};

export const testSwaggerData = {
  swagger: "2.0",
  paths: {
    "/users": {},
    "/posts": {},
    "/rpc/get_user": {},
    "/rpc/create_post": {},
  },
  info: {
    title: "Test API",
    version: "1.0.0",
  },
};

export const testJWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImF1ZCI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImV4cCI6MTY0MDk5NTIwMCwiaWF0IjoxNjQwOTA4ODAwfQ.test";
