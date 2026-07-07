import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';

interface ServerDate {
  today: string;
  yesterday: string;
  year: number;
  month: number;
  offset: (days: number) => string;
  isFuture: (d: string) => boolean;
  ready: boolean;
  refresh: () => void;
}

export function useServerDate(): ServerDate {
  const [ready, setReady] = useState(false);
  // Start with client-time fallback so components never see empty dates
  const fb = fallbackToday();
  const [fy, fm, fd] = fb.split('-').map(Number);
  const ref = useRef<ServerDate>({
    today: fb,
    yesterday: (() => { const d = new Date(fy, fm - 1, fd - 1); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); })(),
    year: fy, month: fm,
    offset: (days: number): string => {
      const dt = new Date(fy, fm - 1, fd + days);
      return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
    },
    isFuture: (date: string) => date > fb,
    ready: false,
    refresh: () => {},
  });

  const fetchDate = useCallback(() => {
    api.getServerDate()
      .then((data: any) => {
        const today: string = data?.date || fallbackToday();
        const [y, m, d] = today.split('-').map(Number);
        const year = y, month = m;
        const offset = (days: number): string => {
          const dt = new Date(y, m - 1, d + days);
          return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
        };
        const yesterday = offset(-1);
        const isFuture = (date: string) => date > today;
        ref.current = { today, yesterday, year, month, offset, isFuture, ready: true, refresh: fetchDate };
        setReady(true);
      })
      .catch(() => {
        const today = fallbackToday();
        const [y, m, day] = today.split('-').map(Number);
        const year = y, month = m;
        const offset = (days: number): string => {
          const dt = new Date(y, m - 1, day + days);
          return [dt.getFullYear(), String(dt.getMonth() + 1).padStart(2, '0'), String(dt.getDate()).padStart(2, '0')].join('-');
        };
        const yesterday = offset(-1);
        const isFuture = (date: string) => date > today;
        ref.current = { today, yesterday, year, month, offset, isFuture, ready: true, refresh: fetchDate };
        setReady(true);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDate();
    return () => { cancelled = true; };
  }, []);

  return ref.current;
}

function fallbackToday(): string {
  const d = new Date(new Date().getTime() + 8 * 3600000);
  return d.toISOString().slice(0, 10);
}
