import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import pc from "picocolors";
import type { CLIContext } from "./context";

export type Ok<T> = {
  value: T;
  success: true;
  error?: undefined;
};

export type Err<T> = {
  value?: undefined;
  error: Error;
  success: false;
};

export type Result<T> = Ok<T> | Err<T>;

export const ok = <T>(value: T): Result<T> => ({ value, success: true });

export const err = <T>(error: Error): Result<T> => ({ error, success: false });

const formatMessage = (level: string, message: any, ...args: any[]) => {
  const msg = [message, ...args]
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ");
  return `${level} ${msg}`;
};

export const log = {
  debug: (ctx: CLIContext, message: any, ...args: any[]) => {
    if (ctx.debug) {
      console.error(formatMessage(pc.gray("[DEBUG]"), message, ...args));
    }
  },
  info: (message: any, ...args: any[]) =>
    console.error(formatMessage(pc.blue("[INFO]"), message, ...args)),
  success: (message: any, ...args: any[]) =>
    console.error(formatMessage(pc.green("[OK]"), message, ...args)),
  warn: (message: any, ...args: any[]) =>
    console.error(formatMessage(pc.yellow("[WARN]"), message, ...args)),
  error: (message: any, ...args: any[]) =>
    console.error(formatMessage(pc.red("[ERROR]"), message, ...args)),
};

export const onlyOnce = <T>(fn: () => T) => {
  let result = false;
  return () => {
    if (!result) {
      try {
        return fn();
      } catch (error) {
        result = true;
        throw error;
      } finally {
        result = true;
      }
    }
  };
};

export const parseRPCArgs = (argsString: string): Record<string, any> => {
  try {
    const processedString = argsString.replace(
      /\$([A-Z_][A-Z0-9_]*)/g,
      (match, varName) => {
        const envValue = process.env[varName];
        if (envValue === undefined) {
          throw new Error(`Environment variable ${varName} not found`);
        }
        return JSON.stringify(envValue);
      },
    );

    return JSON.parse(processedString);
  } catch (error) {
    throw new Error(
      `Failed to parse RPC arguments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

let suppressExperimentalWarnings = false;

export const setExperimentalWarnings = (suppress: boolean) => {
  suppressExperimentalWarnings = suppress;
};

export const experimentalWarning = onlyOnce(() => {
  if (!suppressExperimentalWarnings) {
    log.warn(
      "This feature is experimental and may have bugs. You can suppress this with --suppress-experimental-warnings.",
    );
  }
});

export const generateTempFilePath = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(tmpdir(), `supascan-${timestamp}.html`);
};

export const writeHtmlFile = (filePath: string, content: string): void => {
  writeFileSync(filePath, content, "utf8");
};

export const openInBrowser = (filePath: string): void => {
  const platform = process.platform;
  let command: string;
  let args: string[];

  switch (platform) {
    case "darwin":
      command = "open";
      args = [filePath];
      break;
    case "win32":
      command = "start";
      args = [filePath];
      break;
    default:
      command = "xdg-open";
      args = [filePath];
      break;
  }

  spawn(command, args, { detached: true, stdio: "ignore" });
};
