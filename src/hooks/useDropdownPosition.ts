import { useRef, useState, useCallback, useEffect } from 'react';

interface DropdownPosition {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
}

export function useDropdownPosition(triggerRef: React.RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<DropdownPosition>({});

  const recalculate = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    const pos: DropdownPosition = {};

    if (spaceBelow < 150) {
      pos.bottom = '100%';
    } else {
      pos.top = '100%';
    }

    if (spaceRight < 180) {
      pos.right = '0';
    } else {
      pos.left = '0';
    }

    setPosition(pos);
  }, [triggerRef]);

  return { position, recalculate };
}
