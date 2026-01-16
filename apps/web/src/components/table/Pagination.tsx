interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number | null;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  loading: boolean;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  loading,
}: PaginationProps) {
  const totalPages =
    totalCount !== null ? Math.ceil(totalCount / pageSize) : null;
  const hasPrev = page > 1;
  const hasNext = totalPages === null || page < totalPages;

  const startRow = (page - 1) * pageSize + 1;
  const endRow =
    totalCount !== null
      ? Math.min(page * pageSize, totalCount)
      : page * pageSize;

  return (
    <div className="h-10 bg-studio-surface border-t border-studio-border flex items-center justify-between px-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-studio-muted">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={loading}
          className="bg-studio-bg border border-studio-border rounded px-2 py-0.5 text-xs text-studio-text font-mono focus:outline-none focus:border-studio-accent disabled:opacity-50"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-studio-muted font-mono">
          {totalCount !== null
            ? `${startRow}-${endRow} of ${totalCount.toLocaleString()}`
            : `Page ${page}`}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={!hasPrev || loading}
            className="p-1 text-studio-muted hover:text-studio-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev || loading}
            className="p-1 text-studio-muted hover:text-studio-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {totalPages !== null && (
            <span className="text-xs text-studio-text font-mono px-2">
              {page} / {totalPages}
            </span>
          )}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext || loading}
            className="p-1 text-studio-muted hover:text-studio-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {totalPages !== null && (
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNext || loading}
              className="p-1 text-studio-muted hover:text-studio-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
