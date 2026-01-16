import type { AnalysisResult, RPCFunction } from "@supascan/core";
import { useState } from "react";

interface SidebarProps {
  analysis: AnalysisResult;
  selectedSchema: string;
  onSchemaChange: (schema: string) => void;
  onTableSelect: (schema: string, table: string) => void;
  onRPCSelect: (schema: string, rpc: RPCFunction) => void;
  activeTabId: string | null;
}

export function Sidebar({
  analysis,
  selectedSchema,
  onSchemaChange,
  onTableSelect,
  onRPCSelect,
  activeTabId,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const schemaData = analysis.schemaDetails[selectedSchema];

  const filteredTables =
    schemaData?.tables.filter((t) =>
      t.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  const filteredRPCs =
    schemaData?.rpcFunctions.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  return (
    <div className="w-60 flex-shrink-0 bg-studio-surface border-r border-studio-border flex flex-col">
      <div className="p-3 border-b border-studio-border">
        <div className="text-2xs text-studio-muted uppercase tracking-wider mb-2">
          Schema
        </div>
        <select
          value={selectedSchema}
          onChange={(e) => onSchemaChange(e.target.value)}
          className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-sm text-studio-text font-mono focus:outline-none focus:border-studio-accent"
        >
          {analysis.schemas.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="p-3 border-b border-studio-border">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tables..."
          className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-sm text-studio-text placeholder-studio-muted font-mono focus:outline-none focus:border-studio-accent"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-2xs text-studio-muted uppercase tracking-wider px-2 py-1">
            Tables ({filteredTables.length})
          </div>
          {filteredTables.map((table) => {
            const access = schemaData?.tableAccess[table];
            const isActive = activeTabId === `table:${selectedSchema}.${table}`;
            const badge =
              access?.status === "readable"
                ? { text: "ACCESSIBLE", color: "text-studio-accent" }
                : access?.status === "empty"
                  ? { text: "EMPTY", color: "text-studio-yellow" }
                  : { text: "DENIED", color: "text-studio-red" };

            return (
              <button
                key={table}
                onClick={() => onTableSelect(selectedSchema, table)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                  isActive
                    ? "bg-studio-active text-studio-text"
                    : "text-studio-text hover:bg-studio-hover"
                }`}
              >
                <svg
                  className="w-4 h-4 text-studio-muted flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="flex-1 truncate font-mono text-xs">
                  {table}
                </span>
                <span className={`text-2xs font-medium ${badge.color}`}>
                  {badge.text}
                </span>
              </button>
            );
          })}
        </div>

        {filteredRPCs.length > 0 && (
          <div className="p-2 border-t border-studio-border">
            <div className="text-2xs text-studio-muted uppercase tracking-wider px-2 py-1">
              Functions ({filteredRPCs.length})
            </div>
            {filteredRPCs.map((rpc) => {
              const isActive =
                activeTabId === `rpc:${selectedSchema}.${rpc.name}`;

              return (
                <button
                  key={rpc.name}
                  onClick={() => onRPCSelect(selectedSchema, rpc)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                    isActive
                      ? "bg-studio-active text-studio-text"
                      : "text-studio-text hover:bg-studio-hover"
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-purple-400 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                  <span className="flex-1 truncate font-mono text-xs">
                    {rpc.name}()
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-studio-border">
        <div className="text-2xs text-studio-muted">
          {analysis.summary.domain}
        </div>
      </div>
    </div>
  );
}
