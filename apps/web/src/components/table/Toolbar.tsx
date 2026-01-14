interface ToolbarProps {
  tableName: string;
  rowCount: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Toolbar({
  tableName,
  rowCount,
  isLoading,
  onRefresh,
}: ToolbarProps) {
  return (
    <div className="h-10 bg-studio-surface border-b border-studio-border flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-studio-text bg-studio-bg border border-studio-border rounded hover:bg-studio-hover transition-colors">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter
        </button>

        <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-studio-text bg-studio-bg border border-studio-border rounded hover:bg-studio-hover transition-colors">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          Sort
        </button>

        <button className="flex items-center gap-1.5 px-2 py-1 text-xs text-black bg-studio-accent rounded hover:opacity-90 transition-colors font-medium">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Insert
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1 text-studio-muted hover:text-studio-text transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <svg
            className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>

        {rowCount !== null && (
          <span className="text-xs text-studio-muted font-mono">
            {rowCount.toLocaleString()} rows
          </span>
        )}
      </div>
    </div>
  );
}
