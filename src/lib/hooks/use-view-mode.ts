'use client';

import { useState, useCallback } from 'react';
import type { ViewMode } from '../types/filters';

const STORAGE_KEY = 'taskflow-view-mode';

function getInitialMode(): ViewMode {
  if (typeof window === 'undefined') return 'table';
  return (localStorage.getItem(STORAGE_KEY) as ViewMode) || 'table';
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialMode);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  return { viewMode, setViewMode };
}
