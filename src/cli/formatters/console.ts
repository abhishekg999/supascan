import pc from "picocolors";

const formatMessage = (level: string, message: any, ...args: any[]) => {
  const msg = [message, ...args]
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
    .join(" ");
  return `${level} ${msg}`;
};

export const log = {
  debug: (message: any, ...args: any[]) => {
    console.error(formatMessage(pc.gray("[DEBUG]"), message, ...args));
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

let suppressExperimentalWarnings = false;

export const setExperimentalWarnings = (suppress: boolean) => {
  suppressExperimentalWarnings = suppress;
};

const experimentalWarningCalled = { value: false };

export const experimentalWarning = () => {
  if (!experimentalWarningCalled.value && !suppressExperimentalWarnings) {
    log.warn(
      "This feature is experimental and may have bugs. You can suppress this with --suppress-experimental-warnings.",
    );
    experimentalWarningCalled.value = true;
  }
};
