import { beforeEach, describe, expect, mock, test } from "bun:test";
import {
  err,
  experimentalWarning,
  ok,
  parseRPCArgs,
  setExperimentalWarnings,
} from "./utils";

describe("Result types", () => {
  test("ok returns success result with value", () => {
    const result = ok("test value");
    expect(result.success).toBe(true);
    expect(result.value).toBe("test value");
    expect(result.error).toBeUndefined();
  });

  test("err returns error result with error", () => {
    const error = new Error("test error");
    const result = err(error);
    expect(result.success).toBe(false);
    expect(result.error).toBe(error);
    expect(result.value).toBeUndefined();
  });
});

describe("parseRPCArgs", () => {
  test("parses simple JSON arguments", () => {
    const result = parseRPCArgs('{"name": "test", "age": 25}');
    expect(result).toEqual({ name: "test", age: 25 });
  });

  test("parses RPC args with environment variables", () => {
    process.env.TEST_VAR = "env_value";
    const result = parseRPCArgs('{"name": "test", "env": $TEST_VAR}');
    expect(result).toEqual({ name: "test", env: "env_value" });
    delete process.env.TEST_VAR;
  });

  test("throws error for invalid JSON", () => {
    expect(() => parseRPCArgs('{"invalid": json}')).toThrow(
      "Failed to parse RPC arguments",
    );
  });

  test("throws error for missing environment variable", () => {
    expect(() => parseRPCArgs('{"var": $MISSING_VAR}')).toThrow(
      "Environment variable MISSING_VAR not found",
    );
  });
});

describe("experimentalWarning", () => {
  beforeEach(() => {
    setExperimentalWarnings(false);
  });

  test("suppresses warning when enabled", () => {
    setExperimentalWarnings(true);
    const consoleSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleSpy;

    experimentalWarning();

    expect(consoleSpy).not.toHaveBeenCalled();
    console.warn = originalWarn;
  });
});
