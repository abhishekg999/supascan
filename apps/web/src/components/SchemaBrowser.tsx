import type { AnalysisResult, RPCFunction } from "@supascan/core";
import { useState } from "react";
import type { SupabaseClient } from "../types";
import { QueryBuilder } from "./QueryBuilder";
import { QueryWindow } from "./QueryWindow";
import { RPCExecutor } from "./RPCExecutor";

interface SchemaBrowserProps {
  client: SupabaseClient | null;
  analysis: AnalysisResult;
}

type Window =
  | { type: "table"; id: string; schema: string; table: string }
  | { type: "rpc"; id: string; schema: string; rpc: RPCFunction };

export function SchemaBrowser({ client, analysis }: SchemaBrowserProps) {
  const [windows, setWindows] = useState<Window[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);

  const openTableWindow = (schema: string, table: string) => {
    const id = `table-${schema}-${table}`;
    if (windows.some((w) => w.id === id)) {
      setFocusedWindowId(id);
      return;
    }
    const offset = windows.length * 30;
    setWindows([...windows, { type: "table", id, schema, table }]);
    setFocusedWindowId(id);
  };

  const openRPCWindow = (schema: string, rpc: RPCFunction) => {
    const id = `rpc-${schema}-${rpc.name}`;
    if (windows.some((w) => w.id === id)) {
      setFocusedWindowId(id);
      return;
    }
    setWindows([...windows, { type: "rpc", id, schema, rpc }]);
    setFocusedWindowId(id);
  };

  const closeWindow = (id: string) => {
    setWindows(windows.filter((w) => w.id !== id));
    if (focusedWindowId === id) {
      const remaining = windows.filter((w) => w.id !== id);
      setFocusedWindowId(
        remaining.length > 0
          ? remaining[remaining.length - 1]?.id || null
          : null,
      );
    }
  };

  const focusWindow = (id: string) => {
    setFocusedWindowId(id);
  };

  const getZIndex = (id: string) => {
    if (id === focusedWindowId) return windows.length;
    const index = windows.findIndex((w) => w.id === id);
    return index;
  };

  const getInitialPosition = (index: number) => {
    return {
      x: 100 + index * 30,
      y: 100 + index * 30,
    };
  };

  return (
    <div className="space-y-4">
      {analysis.schemas.map((schema) => {
        const schemaAnalysis = analysis.schemaDetails[schema];
        if (!schemaAnalysis) return null;

        const exposedCount = Object.values(schemaAnalysis.tableAccess).filter(
          (a) => a.status === "readable",
        ).length;
        const emptyCount = Object.values(schemaAnalysis.tableAccess).filter(
          (a) => a.status === "empty",
        ).length;
        const deniedCount = Object.values(schemaAnalysis.tableAccess).filter(
          (a) => a.status === "denied",
        ).length;

        return (
          <div
            key={schema}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 font-mono">
                  Schema: {schema}
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    {schemaAnalysis.tables.length} Tables
                  </span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono">
                    {schemaAnalysis.rpcFunctions.length} RPCs
                  </span>
                  <span className="text-gray-600 font-mono">
                    {exposedCount} exposed | {emptyCount} empty | {deniedCount}{" "}
                    denied
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Tables ({schemaAnalysis.tables.length})
                </h3>
                <div className="space-y-1">
                  {schemaAnalysis.tables.length > 0 ? (
                    schemaAnalysis.tables.map((table) => {
                      const access = schemaAnalysis.tableAccess[table];
                      let indicator = "";
                      let indicatorColor = "";
                      let description = "";

                      if (access?.status === "readable") {
                        indicator = "[+]";
                        indicatorColor = "text-green-600";
                        description = `~${access.rowCount ?? "?"} rows exposed`;
                      } else if (access?.status === "empty") {
                        indicator = "[-]";
                        indicatorColor = "text-yellow-600";
                        description = "0 rows - empty or RLS protected";
                      } else if (access?.status === "denied") {
                        indicator = "[X]";
                        indicatorColor = "text-red-600";
                        description = "access denied";
                      }

                      return (
                        <button
                          key={table}
                          onClick={() => openTableWindow(schema, table)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm font-mono flex items-center gap-2 transition-colors"
                        >
                          <span className={`font-bold ${indicatorColor}`}>
                            {indicator}
                          </span>
                          <span className="text-gray-900 font-semibold">
                            {table}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {description}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-400 italic px-3 py-2">
                      No tables found
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                  RPC Functions ({schemaAnalysis.rpcFunctions.length})
                </h3>
                <div className="space-y-1">
                  {schemaAnalysis.rpcFunctions.length > 0 ? (
                    schemaAnalysis.rpcFunctions.map((rpc) => (
                      <button
                        key={rpc.name}
                        onClick={() => openRPCWindow(schema, rpc)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm font-mono transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold">*</span>
                          <div className="flex-1">
                            <div className="text-gray-900 font-semibold">
                              {rpc.name}
                            </div>
                            {rpc.parameters.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                {rpc.parameters.map((param) => (
                                  <div key={param.name}>
                                    <span className="text-blue-600">
                                      {param.name}
                                    </span>
                                    : <span>{param.type}</span>
                                    {param.required && (
                                      <span className="text-red-600 ml-1">
                                        (required)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 italic px-3 py-2">
                      No RPCs found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {windows.map((window, index) => (
        <QueryWindow
          key={window.id}
          id={window.id}
          title={
            window.type === "table"
              ? `Query: ${window.schema}.${window.table}`
              : `Execute: ${window.schema}.${window.rpc.name}`
          }
          onClose={() => closeWindow(window.id)}
          onFocus={() => focusWindow(window.id)}
          zIndex={getZIndex(window.id)}
          initialPosition={getInitialPosition(index)}
        >
          {window.type === "table" ? (
            <QueryBuilder
              client={client}
              schema={window.schema}
              table={window.table}
            />
          ) : (
            <RPCExecutor
              client={client}
              schema={window.schema}
              rpc={window.rpc}
            />
          )}
        </QueryWindow>
      ))}

      {windows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center gap-2 overflow-x-auto z-[2000]">
          {windows.map((window) => (
            <button
              key={window.id}
              onClick={() => focusWindow(window.id)}
              className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                focusedWindowId === window.id
                  ? "bg-slate-600 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-650"
              }`}
            >
              {window.type === "table"
                ? `${window.schema}.${window.table}`
                : `${window.schema}.${window.rpc.name}()`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
