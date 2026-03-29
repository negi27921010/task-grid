'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import * as projectApi from '../api/projects';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectApi.getProjects(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectApi.getProjectById(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: projectApi.CreateProjectInput) => projectApi.createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project created', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to create project: ${err.message}`, 'error');
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<import('../types').Project, 'name' | 'description' | 'status' | 'owner_id' | 'start_date' | 'target_date'>> }) =>
      projectApi.updateProject(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast('Project updated', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to update project: ${err.message}`, 'error');
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => projectApi.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast('Project deleted', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to delete project: ${err.message}`, 'error');
    },
  });
}
