import { useState, useEffect, useCallback } from 'react';

export type ColumnDef = {
  key: string;
  label: string;
  render: (item: any) => React.ReactNode;
  className?: string;
};

export function useDraggableColumns(storageKey: string, defaultOrder: string[]) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Merge: keep saved order for known keys, append new keys
        const merged = parsed.filter(k => defaultOrder.includes(k));
        defaultOrder.forEach(k => { if (!merged.includes(k)) merged.push(k); });
        return merged;
      }
    } catch {}
    return defaultOrder;
  });

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(order));
  }, [order, storageKey]);

  const onDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  
  const onDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }, [dragIdx]);

  const onDragEnd = useCallback(() => setDragIdx(null), []);

  return { order, onDragStart, onDragOver, onDragEnd, dragIdx };
}
