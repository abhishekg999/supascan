import { useState } from "react";
import type { TableAccessResult } from "../../core/supabase.types";
import type { SupabaseClient } from "../types";
import { QueryInterface } from "./QueryInterface";

interface TablesListProps {
  tables: string[];
  tableAccess: Record<string, TableAccessResult>;
  schema: string;
  client: SupabaseClient | null;
}

const statusConfig = {
  readable: {
    class: "bg-green-100 text-green-800 border-green-200",
    icon: "[+]",
    text: (count?: number) => `~${count ?? "?"} rows exposed`,
  },
  empty: {
    class: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "[-]",
    text: () => "0 rows - empty or RLS",
  },
  denied: {
    class: "bg-red-100 text-red-800 border-red-200",
    icon: "[X]",
    text: () => "Access denied",
  },
} as const;

export function TablesList({
  tables,
  tableAccess,
  schema,
  client,
}: TablesListProps) {
  const [openTable, setOpenTable] = useState<string | null>(null);

  if (!tables.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 text-center text-gray-500 text-sm">
        No tables found
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
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8z"
            clipRule="evenodd"
          />
        </svg>
        Tables ({tables.length})
      </h3>
      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
        {tables.map((table) => {
          const access = tableAccess[table];
          const config = access ? statusConfig[access.status] : null;
          const isOpen = openTable === table;

          return (
            <div key={table}>
              <div className="flex items-center justify-between p-2 hover:bg-gray-50 transition-colors">
                <div className="flex items-center flex-1">
                  <span className="text-sm mr-2">{config?.icon || "[?]"}</span>
                  <span className="font-medium text-gray-900 font-mono text-sm">
                    {table}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {config && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${config.class}`}
                    >
                      {config.text(
                        access && "rowCount" in access
                          ? access.rowCount
                          : undefined,
                      )}
                    </span>
                  )}
                  <button
                    onClick={() => setOpenTable(isOpen ? null : table)}
                    disabled={!client}
                    className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      !client
                        ? "Loading Supabase client..."
                        : isOpen
                          ? "Hide query interface"
                          : "Show query interface"
                    }
                  >
                    {isOpen ? "Hide" : "Query"}
                  </button>
                </div>
              </div>
              {isOpen && client && (
                <QueryInterface client={client} schema={schema} table={table} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
