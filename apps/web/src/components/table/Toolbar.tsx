interface ToolbarProps {
  tableName: string;
  rowCount: number | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Toolbar({ rowCount, isLoading, onRefresh }: ToolbarProps) {
  return (
    <div className="h-10 bg-studio-surface border-b border-studio-border flex items-center justify-end px-3 flex-shrink-0">
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
