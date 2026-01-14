import { useCallback, useMemo, useState } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number | null;
}

export interface PaginationControls {
  state: PaginationState;
  totalPages: number | null;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number | null) => void;
  offset: number;
}

export function usePagination(initialPageSize = 50): PaginationControls {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const totalPages = useMemo(
    () => (totalCount !== null ? Math.ceil(totalCount / pageSize) : null),
    [totalCount, pageSize],
  );

  const hasNext = totalPages === null || page < totalPages;
  const hasPrev = page > 1;
  const offset = (page - 1) * pageSize;

  const nextPage = useCallback(() => {
    if (hasNext) setPage((p) => p + 1);
  }, [hasNext]);

  const prevPage = useCallback(() => {
    if (hasPrev) setPage((p) => p - 1);
  }, [hasPrev]);

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage >= 1 && (totalPages === null || newPage <= totalPages)) {
        setPage(newPage);
      }
    },
    [totalPages],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  return {
    state: { page, pageSize, totalCount },
    totalPages,
    hasNext,
    hasPrev,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    setTotalCount,
    offset,
  };
}
