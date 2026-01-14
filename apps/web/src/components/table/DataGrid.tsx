import { useCallback, useRef, useState } from "react";
import { Pagination } from "./Pagination";

interface DataGridProps {
  data: Record<string, unknown>[];
  loading: boolean;
  sortColumn: string | null;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number | null;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
}

function CellValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-studio-muted italic">NULL</span>;
  }
  if (value === undefined) {
    return <span className="text-studio-muted italic">undefined</span>;
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
    return <span className="text-amber-400">{JSON.stringify(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

export function DataGrid({
  data,
  loading,
  sortColumn,
  sortDir,
  onSort,
  pagination,
}: DataGridProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const columns = data[0] ? Object.keys(data[0]) : [];

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, key: string, currentWidth: number) => {
      e.preventDefault();
      resizingRef.current = {
        key,
        startX: e.clientX,
        startWidth: currentWidth,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        const diff = moveEvent.clientX - resizingRef.current.startX;
        const newWidth = Math.max(50, resizingRef.current.startWidth + diff);
        setColumnWidths((prev) => ({
          ...prev,
          [resizingRef.current!.key]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-studio-bg">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs font-mono">
          <thead className="sticky top-0 z-10">
            <tr className="bg-studio-surface">
              {columns.map((col) => {
                const width = columnWidths[col] ?? 150;
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    className="relative px-3 py-2 text-left font-medium text-studio-muted border-b border-r border-studio-border select-none"
                    style={{ width, minWidth: width, maxWidth: width }}
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:text-studio-text"
                      onClick={() => onSort(col)}
                    >
                      <span className="truncate">{col}</span>
                      {isSorted && (
                        <svg
                          className="w-3 h-3 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={
                              sortDir === "asc"
                                ? "M5 15l7-7 7 7"
                                : "M19 9l-7 7-7-7"
                            }
                          />
                        </svg>
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-studio-accent"
                      onMouseDown={(e) => handleResizeStart(e, col, width)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-3 py-8 text-center text-studio-muted"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-studio-muted border-t-studio-accent" />
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length || 1}
                  className="px-3 py-8 text-center text-studio-muted"
                >
                  No data
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-studio-border hover:bg-studio-hover transition-colors"
                >
                  {columns.map((col) => {
                    const width = columnWidths[col] ?? 150;
                    return (
                      <td
                        key={col}
                        className="px-3 py-1.5 border-r border-studio-border truncate"
                        style={{ width, minWidth: width, maxWidth: width }}
                        title={
                          typeof row[col] === "object"
                            ? JSON.stringify(row[col])
                            : String(row[col] ?? "")
                        }
                      >
                        <CellValue value={row[col]} />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalCount={pagination.totalCount}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        loading={loading}
      />
    </div>
  );
}
