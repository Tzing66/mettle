import { addDatabaseChangeListener } from 'expo-sqlite';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

/**
 * Reads synchronously on first render (no empty flash), then re-reads whenever
 * any of `tables` changes. Bursts of row changes (e.g. a transaction) are
 * coalesced into one re-read per frame.
 *
 * Screens that aren't focused (background tabs, the screen under a modal)
 * don't re-read on every change. They just note they're stale and refresh
 * once when they come back into view. That keeps logging a set from re-running
 * History, Profile and Home queries behind the active workout.
 */
export function useDbQuery<T>(read: () => T, tables: string[], deps: unknown[] = []): T {
  const focused = useIsFocused();
  const [data, setData] = useState<T>(read);
  const readRef = useRef(read);
  const focusedRef = useRef(focused);
  const stale = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    readRef.current = read;
  });

  // Live subscription; re-subscribes (and re-reads) when the tables or deps change.
  useEffect(() => {
    if (mounted.current) setData(readRef.current());
    mounted.current = true;
    let scheduled = false;
    const watched = new Set(tables);
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (!watched.has(tableName)) return;
      if (!focusedRef.current) {
        stale.current = true;
        return;
      }
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        setData(readRef.current());
      });
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), ...deps]);

  // Catch up once when the screen comes back into view.
  useEffect(() => {
    focusedRef.current = focused;
    if (focused && stale.current) {
      stale.current = false;
      setData(readRef.current());
    }
  }, [focused]);

  return data;
}
