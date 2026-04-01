'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  setMemberCapabilities,
  DEFAULT_MEMBER_CAPABILITIES,
  type RoleCapabilities,
} from '../utils/permissions';

async function fetchPermissions(): Promise<Partial<RoleCapabilities> | null> {
  const res = await fetch('/api/admin/permissions');
  if (!res.ok) return null;
  const { permissions } = await res.json();
  return permissions;
}

async function savePermissions(permissions: RoleCapabilities): Promise<void> {
  const res = await fetch('/api/admin/permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissions }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? 'Failed to save permissions');
  }
}

export function usePermissions() {
  const queryClient = useQueryClient();

  const { data: savedPermissions, isLoading } = useQuery({
    queryKey: ['permissions', 'member'],
    queryFn: fetchPermissions,
    staleTime: 60 * 1000,
  });

  // Sync fetched permissions into the runtime permissions module
  useEffect(() => {
    if (savedPermissions) {
      setMemberCapabilities(savedPermissions);
    }
  }, [savedPermissions]);

  const memberCaps: RoleCapabilities = savedPermissions
    ? { ...DEFAULT_MEMBER_CAPABILITIES, ...savedPermissions }
    : DEFAULT_MEMBER_CAPABILITIES;

  const mutation = useMutation({
    mutationFn: savePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  return {
    memberCapabilities: memberCaps,
    isLoading,
    saveMemberCapabilities: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
