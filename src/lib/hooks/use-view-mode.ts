'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ViewMode } from '../types/filters';

const STORAGE_KEY = 'taskflow-view-mode';

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>('table');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored && (stored === 'table' || stored === 'kanban' || stored === 'hybrid')) {
      setViewModeState(stored);
    }
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return { viewMode, setViewMode };
}
