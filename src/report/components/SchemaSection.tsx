import type { SchemaAnalysis } from "../../core/analyzer.types";
import type { SupabaseClient } from "../types";
import { TablesList } from "./TablesList";
import { RPCsList } from "./RPCsList";

interface SchemaSectionProps {
  schema: string;
  analysis: SchemaAnalysis;
  client: SupabaseClient | null;
}

export function SchemaSection({
  schema,
  analysis,
  client,
}: SchemaSectionProps) {
  const exposedCount = Object.values(analysis.tableAccess).filter(
    (a) => a.status === "readable",
  ).length;
  const deniedCount = Object.values(analysis.tableAccess).filter(
    (a) => a.status === "denied",
  ).length;
  const emptyCount = Object.values(analysis.tableAccess).filter(
    (a) => a.status === "empty",
  ).length;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold text-gray-900 font-mono">
          Schema: {schema}
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
            {analysis.tables.length} Tables
          </span>
          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
            {analysis.rpcFunctions.length} RPCs
          </span>
          <span className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded-full">
            {exposedCount} exposed | {emptyCount} empty | {deniedCount} denied
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <TablesList
          tables={analysis.tables}
          tableAccess={analysis.tableAccess}
          schema={schema}
          client={client}
        />
        <RPCsList
          rpcFunctions={analysis.rpcFunctions}
          schema={schema}
          client={client}
        />
      </div>
    </div>
  );
}
