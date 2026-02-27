import {
  testTableRead,
  type AnalysisResult,
  type TableAccessResult,
} from "@supascan/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "../types";

export type AccessMap = Record<string, Record<string, TableAccessResult>>;

export function useAccessTests(
  client: SupabaseClient | null,
  analysis: AnalysisResult | null,
) {
  const [accessMap, setAccessMap] = useState<AccessMap>({});
  const runningRef = useRef(false);
  const abortRef = useRef(false);

  const run = useCallback(async () => {
    if (!client || !analysis || runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;

    for (const [schema, details] of Object.entries(analysis.schemaDetails)) {
      for (const table of details.tables) {
        if (abortRef.current) {
          runningRef.current = false;
          return;
        }

        const gen = testTableRead(client, schema, table);
        let result: TableAccessResult | undefined;
        while (true) {
          const next = await gen.next();
          if (next.done) {
            if (next.value.success) result = next.value.value;
            break;
          }
        }

        if (result) {
          setAccessMap((prev) => ({
            ...prev,
            [schema]: { ...prev[schema], [table]: result },
          }));
        }
      }
    }

    runningRef.current = false;
  }, [client, analysis]);

  useEffect(() => {
    if (analysis && client) {
      setAccessMap({});
      run();
    }
    return () => {
      abortRef.current = true;
    };
  }, [analysis, client, run]);

  return accessMap;
}
