'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as labelApi from '../api/labels';

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: () => labelApi.getLabels(),
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color: string; created_by: string }) =>
      labelApi.createLabel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labelApi.deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });
}
