import React, { useState } from "react";

interface SmartTableProps {
  data: Record<string, unknown>[];
}

const MAX_ROWS = 100;

export function SmartTable({ data }: SmartTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  if (!data.length) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm font-mono">
        No data
      </div>
    );
  }

  const firstRow = data[0];
  if (!firstRow) {
    return (
      <div className="p-8 text-center text-gray-400 text-sm font-mono">
        No data
      </div>
    );
  }

  const columns = Object.keys(firstRow);
  let rows = data.slice(0, MAX_ROWS);

  if (sortColumn) {
    rows = [...rows].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      const comparison =
        aVal === null || aVal === undefined
          ? 1
          : bVal === null || bVal === undefined
            ? -1
            : String(aVal).localeCompare(String(bVal));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-xs font-mono">
        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-3 py-2 text-left font-semibold text-slate-700 border-r border-slate-200 cursor-pointer hover:bg-slate-100 select-none"
                onClick={() => handleSort(col)}
              >
                <div className="flex items-center gap-1">
                  {col}
                  {sortColumn === col && (
                    <span className="text-slate-400">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-slate-50">
              {columns.map((col) => {
                const value = row[col];
                let displayValue: React.ReactNode;
                let titleValue: string;

                if (value === null) {
                  displayValue = (
                    <span className="text-gray-400 italic">null</span>
                  );
                  titleValue = "null";
                } else if (value === undefined) {
                  displayValue = (
                    <span className="text-gray-400 italic">undefined</span>
                  );
                  titleValue = "undefined";
                } else if (typeof value === "object") {
                  const jsonStr = JSON.stringify(value);
                  displayValue = (
                    <span className="text-blue-600">{jsonStr}</span>
                  );
                  titleValue = jsonStr;
                } else {
                  displayValue = String(value);
                  titleValue = String(value);
                }

                return (
                  <td
                    key={col}
                    className="px-3 py-2 border-r border-slate-200 max-w-xs truncate"
                    title={titleValue}
                  >
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > MAX_ROWS && (
        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-mono">
          Showing {MAX_ROWS} of {data.length} rows
        </div>
      )}
    </div>
  );
}
