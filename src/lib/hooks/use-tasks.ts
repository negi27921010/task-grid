'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as taskApi from '../api/tasks';
import { useToast } from '@/components/ui/toast';
import type { Task, TaskStatus, CreateTaskInput } from '../types';

export function useTasks(projectId?: string) {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => projectId ? taskApi.getRootTasks(projectId) : taskApi.getAllTasks(),
  });
}

export function useChildTasks(parentId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['tasks', 'children', parentId],
    queryFn: () => taskApi.getChildTasks(parentId),
    enabled,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', 'detail', id],
    queryFn: () => taskApi.getTaskById(id),
    enabled: !!id,
  });
}

export function useTasksByOwner(ownerId: string) {
  return useQuery({
    queryKey: ['tasks', 'owner', ownerId],
    queryFn: () => taskApi.getTasksByOwner(ownerId),
    enabled: !!ownerId,
    retry: 2,
  });
}

export function useTasksByDepartment(deptId: string, userIds: string[]) {
  return useQuery({
    queryKey: ['tasks', 'department', deptId, userIds],
    queryFn: () => taskApi.getTasksByDepartment(deptId, userIds),
    enabled: userIds.length > 0,
    retry: 2,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskApi.createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(`Failed to create task: ${err.message}`, 'error');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskApi.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(`Failed to update task: ${err.message}`, 'error');
    },
  });
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, status, metadata }: { id: string; status: TaskStatus; metadata?: { blocker_reason?: string } }) =>
      taskApi.changeTaskStatus(id, status, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(`Failed to change status: ${err.message}`, 'error');
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'cascade' | 'promote' }) =>
      taskApi.deleteTask(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast('Task deleted', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to delete task: ${err.message}`, 'error');
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ taskId, authorId, content }: { taskId: string; authorId: string; content: string }) =>
      taskApi.addComment(taskId, authorId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(`Failed to add comment: ${err.message}`, 'error');
    },
  });
}

export function useUpdateRemarks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ taskId, remarks }: { taskId: string; remarks: string | null }) =>
      taskApi.updateRemarks(taskId, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: Error) => {
      toast(`Failed to update remarks: ${err.message}`, 'error');
    },
  });
}
