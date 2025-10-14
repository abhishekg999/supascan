import { useState } from "react";
import type { RPCFunction } from "../../core/supabase.types";
import type { SupabaseClient } from "../types";
import { useRPC } from "../hooks/useRPC";
import { useNotification } from "../hooks/useNotification";
import { SmartTable } from "./SmartTable";

interface RPCInterfaceProps {
  client: SupabaseClient;
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

export function RPCInterface({ client, schema, rpc }: RPCInterfaceProps) {
  const [params, setParams] = useState<Record<string, string>>({});
  const { state, execute } = useRPC(client, schema, rpc.name);
  const notify = useNotification();

  const handleParamChange = (name: string, value: string) => {
    if (value === "") {
      const { [name]: _, ...rest } = params;
      setParams(rest);
    } else {
      setParams({ ...params, [name]: value });
    }
  };

  const handleExecute = async () => {
    try {
      const parsedParams = Object.entries(params).reduce(
        (acc, [key, value]) => {
          const param = rpc.parameters.find((p) => p.name === key);
          if (param) {
            try {
              acc[key] = parseParamValue(value, param.type);
            } catch (e) {
              notify(`Invalid value for parameter "${key}"`, "error");
              throw e;
            }
          }
          return acc;
        },
        {} as Record<string, unknown>,
      );

      await execute(parsedParams);
      notify(`RPC ${rpc.name} executed successfully`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  const result = state.status === "success" ? state.data : null;

  return (
    <div className="p-3 bg-gray-50 border-t border-gray-200 space-y-2">
      <h4 className="text-xs font-semibold text-gray-700 font-mono">
        Execute: {schema}.{rpc.name}
      </h4>

      {rpc.parameters.length > 0 && (
        <div className="space-y-1.5">
          {rpc.parameters.map((param) => (
            <ParamInput
              key={param.name}
              param={param}
              value={params[param.name] || ""}
              onChange={(value) => handleParamChange(param.name, value)}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={state.status === "loading"}
        className="px-4 py-2 bg-slate-700 text-white rounded text-xs font-mono hover:bg-slate-800 transition-colors disabled:opacity-50"
      >
        {state.status === "loading" ? "Executing..." : "Execute RPC"}
      </button>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h5 className="text-xs font-semibold text-gray-700 font-mono">
            Results
          </h5>
        </div>
        <div className="min-h-[300px] max-h-[500px] overflow-auto">
          {state.status === "loading" && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3 text-slate-600 font-mono text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                Executing RPC...
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-700 font-mono">
              Error: {state.error.message}
            </div>
          )}

          {state.status === "success" &&
            (Array.isArray(result) && result.length > 0 ? (
              <SmartTable data={result} />
            ) : Array.isArray(result) && result.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm font-mono">
                No data returned
              </div>
            ) : typeof result === "object" && result !== null ? (
              <div className="p-4">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4">
                <div className="text-xs font-mono">{String(result)}</div>
              </div>
            ))}

          {state.status === "idle" && (
            <div className="p-6 text-center text-gray-400 text-sm font-mono">
              RPC results will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ParamInputProps {
  param: RPCFunction["parameters"][number];
  value: string;
  onChange: (value: string) => void;
}

function ParamInput({ param, value, onChange }: ParamInputProps) {
  const inputClass =
    "w-full p-1.5 text-xs border border-gray-300 rounded font-mono focus:ring-2 focus:ring-slate-500 focus:border-slate-500";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-0.5 font-mono">
        {param.name} ({param.type})
        {param.required && <span className="text-red-600"> *</span>}
      </label>
      {param.type === "boolean" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} bg-white`}
        >
          <option value="">Select...</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : param.type === "json" || param.type === "jsonb" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="{}"
          rows={2}
          className={inputClass}
        />
      ) : (
        <input
          type={
            param.type === "number" || param.type === "integer"
              ? "number"
              : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.description || `Enter ${param.type}`}
          className={inputClass}
        />
      )}
    </div>
  );
}
