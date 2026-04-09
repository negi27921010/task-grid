'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import * as registryApi from '../api/registry';
import type { CreateRegistryInput, UpdateRegistryInput } from '../types';

export function useRegistries() {
  return useQuery({
    queryKey: ['registry'],
    queryFn: () => registryApi.getRegistries(),
    staleTime: 60 * 1000,
  });
}

export function useRegistry(id: string) {
  return useQuery({
    queryKey: ['registry', id],
    queryFn: () => registryApi.getRegistryById(id),
    enabled: !!id,
  });
}

export function useCreateRegistry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CreateRegistryInput) => registryApi.createRegistry(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registry'] });
      toast('Workstream added', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed: ${err.message}`, 'error');
    },
  });
}

export function useUpdateRegistry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRegistryInput }) =>
      registryApi.updateRegistry(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registry'] });
      toast('Workstream updated', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed: ${err.message}`, 'error');
    },
  });
}

export function useDeleteRegistry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => registryApi.deleteRegistry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registry'] });
      toast('Workstream removed', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed: ${err.message}`, 'error');
    },
  });
}
