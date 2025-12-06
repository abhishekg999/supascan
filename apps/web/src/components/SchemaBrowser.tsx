import type { AnalysisResult, RPCFunction } from "@supascan/core";
import { useState } from "react";
import type { SupabaseClient } from "../types";
import { QueryBuilder } from "./QueryBuilder";
import { RPCExecutor } from "./RPCExecutor";

interface SchemaBrowserProps {
  client: SupabaseClient | null;
  analysis: AnalysisResult;
}

export function SchemaBrowser({ client, analysis }: SchemaBrowserProps) {
  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedRPC, setSelectedRPC] = useState<RPCFunction | null>(null);

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
                          onClick={() => {
                            setSelectedSchema(schema);
                            setSelectedTable(table);
                            setSelectedRPC(null);
                          }}
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
                        onClick={() => {
                          setSelectedSchema(schema);
                          setSelectedTable(null);
                          setSelectedRPC(rpc);
                        }}
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

      {selectedSchema && selectedTable && (
        <QueryBuilder
          client={client}
          schema={selectedSchema}
          table={selectedTable}
        />
      )}

      {selectedSchema && selectedRPC && (
        <RPCExecutor
          client={client}
          schema={selectedSchema}
          rpc={selectedRPC}
        />
      )}
    </div>
  );
}
