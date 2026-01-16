import type { RPCFunction } from "@supascan/core";
import { useState } from "react";
import { useRPC } from "../../hooks/useRPC";
import type { SupabaseClient } from "../../types";

interface RPCViewProps {
  client: SupabaseClient | null;
  schema: string;
  rpc: RPCFunction;
}

function parseParamValue(value: string, type: string): unknown {
  if (value === "") return undefined;
  if (type === "number" || type === "integer") return parseFloat(value);
  if (type === "boolean") return value === "true";
  if (type === "json" || type === "jsonb") return JSON.parse(value);
  return value;
}

function ResultValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-studio-muted italic">NULL</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span className={value ? "text-studio-accent" : "text-studio-red"}>
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return <span className="text-blue-400">{value}</span>;
  }
  if (typeof value === "object") {
    return (
      <pre className="text-amber-400 whitespace-pre-wrap text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span>{String(value)}</span>;
}

export function RPCView({ client, schema, rpc }: RPCViewProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const { state, execute } = useRPC(client, schema, rpc.name);

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => {
      if (value === "") {
        const { [name]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [name]: value };
    });
  };

  const handleExecute = async () => {
    const parsedParams = Object.entries(params).reduce(
      (acc, [key, value]) => {
        const param = rpc.parameters.find((p) => p.name === key);
        if (param) {
          acc[key] = parseParamValue(value, param.type);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    await execute(parsedParams);
  };

  const result = state.status === "success" ? state.data : null;
  const isLoading = state.status === "loading";
  const isArrayResult = Array.isArray(result);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-72 flex-shrink-0 bg-studio-surface border-r border-studio-border flex flex-col">
        <div className="p-3 border-b border-studio-border">
          <h3 className="text-sm font-medium text-studio-text mb-1">
            {rpc.name}()
          </h3>
          <p className="text-2xs text-studio-muted">
            {rpc.parameters.length} parameter
            {rpc.parameters.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rpc.parameters.map((param) => (
            <div key={param.name}>
              <label className="block text-xs text-studio-muted mb-1">
                {param.name}
                <span className="text-studio-muted/60 ml-1">
                  ({param.type})
                </span>
                {param.required && (
                  <span className="text-studio-red ml-1">*</span>
                )}
              </label>
              {param.type === "boolean" ? (
                <select
                  value={params[param.name] ?? ""}
                  onChange={(e) =>
                    handleParamChange(param.name, e.target.value)
                  }
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-studio-text font-mono focus:outline-none focus:border-studio-accent"
                >
                  <option value="">--</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : param.type === "json" || param.type === "jsonb" ? (
                <textarea
                  value={params[param.name] ?? ""}
                  onChange={(e) =>
                    handleParamChange(param.name, e.target.value)
                  }
                  placeholder="{}"
                  rows={3}
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-studio-text font-mono focus:outline-none focus:border-studio-accent resize-none"
                />
              ) : (
                <input
                  type={
                    param.type === "number" || param.type === "integer"
                      ? "number"
                      : "text"
                  }
                  value={params[param.name] ?? ""}
                  onChange={(e) =>
                    handleParamChange(param.name, e.target.value)
                  }
                  placeholder={param.description ?? ""}
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-studio-text font-mono focus:outline-none focus:border-studio-accent"
                />
              )}
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-studio-border">
          <button
            onClick={handleExecute}
            disabled={isLoading || !client}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-studio-accent text-black rounded text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/30 border-t-black" />
                Executing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Execute
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-studio-bg">
        <div className="h-10 bg-studio-surface border-b border-studio-border flex items-center px-3">
          <span className="text-xs text-studio-muted">Results</span>
          {isArrayResult && (
            <span className="ml-2 text-xs text-studio-muted font-mono">
              ({result.length} rows)
            </span>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {state.status === "idle" && (
            <div className="h-full flex items-center justify-center text-studio-muted text-sm">
              Execute to see results
            </div>
          )}

          {state.status === "error" && (
            <div className="p-3 bg-studio-red/10 border border-studio-red/30 rounded">
              <p className="text-studio-red text-xs font-mono">
                {state.error.message}
              </p>
            </div>
          )}

          {state.status === "success" &&
            (isArrayResult && result.length > 0 ? (
              <table className="w-full border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-studio-surface">
                    {Object.keys(result[0] as Record<string, unknown>).map(
                      (col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-studio-muted border-b border-r border-studio-border"
                        >
                          {col}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-studio-border hover:bg-studio-hover"
                    >
                      {Object.values(row as Record<string, unknown>).map(
                        (val, j) => (
                          <td
                            key={j}
                            className="px-3 py-1.5 border-r border-studio-border"
                          >
                            <ResultValue value={val} />
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : isArrayResult && result.length === 0 ? (
              <div className="h-full flex items-center justify-center text-studio-muted text-sm">
                No rows returned
              </div>
            ) : (
              <div className="font-mono text-sm text-studio-text">
                <ResultValue value={result} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
