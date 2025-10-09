import { createConsola } from "consola";

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

export const log = createConsola({
  level: 4,
  formatOptions: { compact: true },
});

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
