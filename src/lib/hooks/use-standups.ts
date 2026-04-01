'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import * as standupApi from '../api/standups';
import type {
  CreateMorningStandupInput,
  UpdateMorningStandupInput,
  EveningClosureInput,
} from '../types';

export function useStandupByDate(userId: string, date: string) {
  return useQuery({
    queryKey: ['standups', 'byDate', userId, date],
    queryFn: () => standupApi.getStandupByDate(userId, date),
    enabled: !!userId && !!date,
    staleTime: 30 * 1000,
  });
}

export function useCarriedOutcomes(userId: string) {
  return useQuery({
    queryKey: ['standups', 'carried', userId],
    queryFn: () => standupApi.getCarriedOutcomes(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useCreateMorningStandup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CreateMorningStandupInput) =>
      standupApi.createMorningStandup(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standups'] });
      toast('Morning standup submitted', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to submit standup: ${err.message}`, 'error');
    },
  });
}

export function useUpdateMorningStandup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateMorningStandupInput;
    }) => standupApi.updateMorningStandup(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standups'] });
      toast('Standup updated', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to update standup: ${err.message}`, 'error');
    },
  });
}

export function useSubmitEveningClosure() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({
      standupId,
      input,
    }: {
      standupId: string;
      input: EveningClosureInput;
    }) => standupApi.submitEveningClosure(standupId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['standups'] });
      toast('Evening closure submitted', 'success');
    },
    onError: (err: Error) => {
      toast(`Failed to submit closure: ${err.message}`, 'error');
    },
  });
}

export function useTeamStandups(date: string) {
  return useQuery({
    queryKey: ['standups', 'team', date],
    queryFn: () => standupApi.getTeamStandups(date),
    enabled: !!date,
    staleTime: 30 * 1000,
  });
}

export function useStandupHistory(
  userId: string,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ['standups', 'history', userId, startDate, endDate],
    queryFn: () => standupApi.getStandupHistory(userId, startDate, endDate),
    enabled: !!userId && !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
}
