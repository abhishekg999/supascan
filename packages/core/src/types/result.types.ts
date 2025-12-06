export type Ok<T> = {
  value: T;
  success: true;
  error?: undefined;
};

export type Err = {
  value?: undefined;
  error: Error;
  success: false;
};

export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Result<T> => ({ value, success: true });

export const err = <T>(error: Error): Result<T> => ({ error, success: false });
