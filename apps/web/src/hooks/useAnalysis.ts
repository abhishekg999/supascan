import { analyze, type AnalysisResult } from "@supascan/core";
import { useCallback, useState } from "react";
import type { AsyncState, SupabaseClient } from "../types";

export function useAnalysis(
  client: SupabaseClient | null,
  url: string,
  key: string,
) {
  const [state, setState] = useState<AsyncState<AnalysisResult>>({
    status: "idle",
  });

  const execute = useCallback(
    async (options: { schema?: string } = {}) => {
      if (!client) {
        setState({
          status: "error",
          error: new Error("Supabase client not initialized"),
        });
        return;
      }

      setState({ status: "loading" });

      try {
        const analysisGen = analyze(client, url, key, options);
        let analysisResult;

        while (true) {
          const next = await analysisGen.next();
          if (next.done) {
            analysisResult = next.value;
            break;
          }
        }

        if (!analysisResult || !analysisResult.success) {
          throw analysisResult?.error ?? new Error("Analysis failed");
        }

        setState({ status: "success", data: analysisResult.value });
        return analysisResult.value;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ status: "error", error: err });
        throw err;
      }
    },
    [client, url, key],
  );

  return { state, execute };
}
