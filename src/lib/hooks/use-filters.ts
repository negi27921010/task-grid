'use client';

import { useState, useCallback } from 'react';
import type { TaskFilters, SortConfig, SavedFilterPreset } from '../types';

const PRESETS_KEY = 'taskflow-filter-presets';

function loadPresets(): SavedFilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]');
  } catch { return []; }
}

function savePresetsToStorage(presets: SavedFilterPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function useFilters() {
  const [filters, setFiltersState] = useState<TaskFilters>({});
  const [sort, setSort] = useState<SortConfig[]>([{ field: 'priority', direction: 'asc' }]);
  const [presets, setPresets] = useState<SavedFilterPreset[]>(loadPresets);

  const setFilter = useCallback(<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const toggleSort = useCallback((field: SortConfig['field'], addToExisting: boolean = false) => {
    setSort(prev => {
      const existing = prev.find(s => s.field === field);
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map(s => s.field === field ? { ...s, direction: 'desc' as const } : s);
        }
        return prev.filter(s => s.field !== field);
      }
      const newSort: SortConfig = { field, direction: 'asc' };
      return addToExisting ? [...prev, newSort] : [newSort];
    });
  }, []);

  const savePreset = useCallback((name: string) => {
    const preset: SavedFilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters: { ...filters },
      sort: [...sort],
    };
    const updated = [...presets, preset];
    setPresets(updated);
    savePresetsToStorage(updated);
  }, [filters, sort, presets]);

  const loadPreset = useCallback((preset: SavedFilterPreset) => {
    setFiltersState(preset.filters);
    setSort(preset.sort);
  }, []);

  const deletePreset = useCallback((id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    savePresetsToStorage(updated);
  }, [presets]);

  const hasActiveFilters = Object.values(filters).some(v =>
    v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  );

  return {
    filters,
    sort,
    presets,
    setFilter,
    clearFilters,
    toggleSort,
    setSort,
    savePreset,
    loadPreset,
    deletePreset,
    hasActiveFilters,
  };
}
