'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import * as labelApi from '../api/labels';

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: () => labelApi.getLabels(),
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: { name: string; color: string; created_by: string }) =>
      labelApi.createLabel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
    onError: (err: Error) => {
      toast(`Failed to create label: ${err.message}`, 'error');
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => labelApi.deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
    onError: (err: Error) => {
      toast(`Failed to delete label: ${err.message}`, 'error');
    },
  });
}
