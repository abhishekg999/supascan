import { useState } from "react";
import { useNotification } from "../hooks/useNotification";
import { useTableQuery } from "../hooks/useTableQuery";
import type { SupabaseClient } from "../types";
import { SmartTable } from "./SmartTable";

interface QueryBuilderProps {
  client: SupabaseClient | null;
  schema: string;
  table: string;
}

type Operation = "select" | "insert" | "update" | "delete";

export function QueryBuilder({ client, schema, table }: QueryBuilderProps) {
  const [operation, setOperation] = useState<Operation>("select");
  const [columns, setColumns] = useState("*");
  const [limit, setLimit] = useState("10");
  const [orderBy, setOrderBy] = useState("");
  const [jsonData, setJsonData] = useState("{}");
  const [filter, setFilter] = useState("");

  const { state, execute } = useTableQuery(client, schema, table);
  const notify = useNotification();

  const handleExecute = async () => {
    try {
      const parsedLimit = parseInt(limit);
      const [orderCol, orderDir] = orderBy.trim().split(" ");

      let data: Record<string, unknown> | undefined;
      if (operation !== "select") {
        try {
          data = JSON.parse(jsonData);
        } catch (e) {
          notify("Invalid JSON data", "error");
          return;
        }
      }

      await execute({
        operation,
        columns: columns.trim() || "*",
        limit: parsedLimit > 0 ? parsedLimit : undefined,
        orderBy: orderCol || undefined,
        orderDir: orderDir === "desc" ? "desc" : "asc",
        data,
        filter: filter.trim() || undefined,
      });

      notify("Query executed successfully", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      notify(message, "error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 font-mono">
          Query: {schema}.{table}
        </h3>
      </div>
      <div className="p-4 space-y-3">
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value as Operation)}
          className="w-full p-2 text-sm border border-gray-300 rounded font-mono bg-white focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
        >
          <option value="select">SELECT</option>
          <option value="insert">INSERT</option>
          <option value="update">UPDATE</option>
          <option value="delete">DELETE</option>
        </select>

        {operation === "select" && (
          <>
            <input
              type="text"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="* or column1, column2"
              className="w-full p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                placeholder="Limit"
                className="p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
              />
              <input
                type="text"
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                placeholder="column asc/desc"
                className="p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
              />
            </div>
          </>
        )}

        {operation !== "select" && (
          <>
            <textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              placeholder={
                operation === "insert"
                  ? '{"column": "value"}'
                  : '{"column": "new value"}'
              }
              rows={operation === "update" ? 2 : 3}
              className="w-full p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
            />
            {(operation === "update" || operation === "delete") && (
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="id = 1"
                className="w-full p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-supabase-green focus:border-supabase-green"
              />
            )}
          </>
        )}

        <button
          onClick={handleExecute}
          disabled={state.status === "loading" || !client}
          className="w-full px-4 py-2 bg-slate-700 text-white rounded text-sm font-mono hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {state.status === "loading" ? "Executing..." : "Execute Query"}
        </button>
      </div>

      <div className="border-t border-gray-200">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 font-mono">
            Results
          </h4>
        </div>
        <div className="min-h-[300px] max-h-[500px] overflow-auto">
          {state.status === "loading" && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-3 text-slate-600 font-mono text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                Executing query...
              </div>
            </div>
          )}

          {state.status === "error" && (
            <div className="p-4 bg-red-50 border-b border-red-200 text-xs text-red-700 font-mono">
              Error: {state.error.message}
            </div>
          )}

          {state.status === "success" &&
            (state.data.length > 0 ? (
              <SmartTable data={state.data} />
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm font-mono">
                No data returned
              </div>
            ))}

          {state.status === "idle" && (
            <div className="p-6 text-center text-gray-400 text-sm font-mono">
              Query results will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
