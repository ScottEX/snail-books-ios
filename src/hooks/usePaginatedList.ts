import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePaginatedListOptions<T> {
  /** Fetcher: (page, perPage) → { records: T[], total?: number, total_all?: number, pages?: number, has_more?: boolean } */
  fetcher: (page: number, perPage: number) => Promise<{ records: T[]; total?: number; total_all?: number; pages?: number; has_more?: boolean }>;
  perPage?: number;
  /** Auto-load on mount. */
  autoLoad?: boolean;
}

interface UsePaginatedListResult<T> {
  records: T[];
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  page: number;
  total: number;
  totalAll: number;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  setRecords: React.Dispatch<React.SetStateAction<T[]>>;
}

/**
 * Paginated list helper for screens that scroll-load history. Centralizes
 * refresh / load-more / has-more logic so screens don't reinvent it.
 */
export function usePaginatedList<T>({ fetcher, perPage = 10, autoLoad = true }: UsePaginatedListOptions<T>): UsePaginatedListResult<T> {
  const [records, setRecords] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetcher(1, perPage);
      if (!mountedRef.current) return;
      setRecords(r.records || []);
      setPage(1);
      setTotal(r.total ?? (r.records || []).length);
      setTotalAll(r.total_all ?? r.total ?? 0);
      setPages(r.pages ?? 1);
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Load failed');
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [fetcher, perPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore) return;
    const hasMore = pages === 0 ? (records.length < total) : (page < pages);
    if (!hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const r = await fetcher(next, perPage);
      if (!mountedRef.current) return;
      setRecords((prev) => [...prev, ...(r.records || [])]);
      setPage(next);
      if (r.pages != null) setPages(r.pages);
      if (r.total != null) setTotal(r.total);
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Load failed');
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [fetcher, perPage, page, pages, total, records.length, loading, loadingMore]);

  useEffect(() => {
    if (autoLoad) {
      setLoading(true);
      refresh().finally(() => { if (mountedRef.current) setLoading(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  const hasMore = pages === 0 ? records.length < total : page < pages;

  return {
    records, loading, loadingMore, refreshing, hasMore, page, total, totalAll, error,
    refresh, loadMore, setRecords,
  };
}
