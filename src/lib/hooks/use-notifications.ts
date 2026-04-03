'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as notifApi from '../api/notifications';

export function useUnreadCount(userId: string) {
  return useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => notifApi.getUnreadCount(userId),
    enabled: !!userId,
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useNotifications(userId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['notifications', 'list', userId],
    queryFn: () => notifApi.getNotifications(userId),
    enabled: !!userId && enabled,
    staleTime: 15_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => notifApi.markAllAsRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
