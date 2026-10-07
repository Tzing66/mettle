import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';

/**
 * Reads synchronously on first render (no empty flash), then re-reads whenever
 * any of `tables` changes. Bursts of row changes (e.g. a transaction) are
 * coalesced into one re-read per frame.
 */
export function useDbQuery<T>(read: () => T, tables: string[], deps: unknown[] = []): T {
  const [data, setData] = useState<T>(read);
  const readRef = useRef(read);

  useEffect(() => {
    readRef.current = read;
  });

  useEffect(() => {
    setData(readRef.current());
    let scheduled = false;
    const watched = new Set(tables);
    const sub = addDatabaseChangeListener(({ tableName }) => {
      if (!watched.has(tableName) || scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        setData(readRef.current());
      });
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(','), ...deps]);

  return data;
}
