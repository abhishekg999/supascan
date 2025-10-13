import { useCallback, useState } from "react";
import type { AsyncState } from "../types";

export function useAsync<T, E = Error>() {
  const [state, setState] = useState<AsyncState<T, E>>({ status: "idle" });

  const execute = useCallback(async (promise: Promise<T>) => {
    setState({ status: "loading" });
    try {
      const data = await promise;
      setState({ status: "success", data });
      return data;
    } catch (error) {
      const err =
        error instanceof Error
          ? (error as unknown as E)
          : (new Error(String(error)) as unknown as E);
      setState({ status: "error", error: err });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, execute, reset };
}
