import { useCallback, useState } from "react";
import type { SupabaseClient, AsyncState } from "../types";

type RPCResult =
  | Record<string, unknown>[]
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null;

export function useRPC(
  client: SupabaseClient,
  schema: string,
  rpcName: string,
) {
  const [state, setState] = useState<AsyncState<RPCResult>>({ status: "idle" });

  const execute = useCallback(
    async (params: Record<string, unknown> = {}) => {
      setState({ status: "loading" });

      try {
        const actualRpcName = rpcName.replace(/^rpc\//, "");
        const { data, error } = await client
          .schema(schema)
          .rpc(actualRpcName, params);

        if (error) {
          throw new Error(error.message);
        }

        setState({ status: "success", data: data as RPCResult });
        return data as RPCResult;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ status: "error", error: err });
        throw err;
      }
    },
    [client, schema, rpcName],
  );

  return { state, execute };
}
