import { useState } from "react";
import type { RPCFunction } from "../../core/supabase.types";
import type { SupabaseClient } from "../types";
import { RPCInterface } from "./RPCInterface";

interface RPCsListProps {
  rpcFunctions: RPCFunction[];
  schema: string;
  client: SupabaseClient | null;
}

export function RPCsList({ rpcFunctions, schema, client }: RPCsListProps) {
  const [openRPC, setOpenRPC] = useState<string | null>(null);

  if (!rpcFunctions.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-500 text-sm">
        No RPC functions found
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
        <svg
          className="w-4 h-4 mr-1 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
            clipRule="evenodd"
          />
        </svg>
        RPC Functions ({rpcFunctions.length})
      </h3>
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {rpcFunctions.map((rpc) => {
          const isOpen = openRPC === rpc.name;
          const requiredCount = rpc.parameters.filter((p) => p.required).length;

          return (
            <div key={rpc.name} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 font-mono text-sm">
                  {rpc.name}
                </h4>
                <button
                  onClick={() => setOpenRPC(isOpen ? null : rpc.name)}
                  disabled={!client}
                  className="px-3 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!client ? "Loading Supabase client..." : ""}
                >
                  Execute
                </button>
              </div>
              <div className="text-xs text-gray-600 font-mono">
                {rpc.parameters.length > 0 ? (
                  <>
                    {rpc.parameters.length} parameter
                    {rpc.parameters.length !== 1 && "s"}
                    {requiredCount > 0 && (
                      <span className="text-red-600 ml-1">
                        ({requiredCount} required)
                      </span>
                    )}
                  </>
                ) : (
                  "No parameters"
                )}
              </div>
              {isOpen && client && (
                <div className="border-t border-gray-200 bg-slate-50 mt-3 -mx-3 -mb-3">
                  <RPCInterface client={client} schema={schema} rpc={rpc} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
