'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import * as Dialog from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/types';

interface DeleteDialogProps {
  task: Task;
  childrenCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: 'cascade' | 'promote') => void;
}

export function DeleteDialog({
  task,
  childrenCount,
  open,
  onOpenChange,
  onConfirm,
}: DeleteDialogProps) {
  const [mode, setMode] = useState<'cascade' | 'promote'>('promote');
  const hasChildren = childrenCount > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <Dialog.Title>Delete Task</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to delete &ldquo;{task.title}&rdquo;? This action cannot be undone.
            </Dialog.Description>

            {hasChildren && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  This task has {childrenCount} subtask{childrenCount !== 1 ? 's' : ''}. What should happen to them?
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="deleteMode"
                      value="promote"
                      checked={mode === 'promote'}
                      onChange={() => setMode('promote')}
                      className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Promote subtasks</span>
                      <p className="text-xs text-slate-500">
                        Move subtasks up to the parent level
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="deleteMode"
                      value="cascade"
                      checked={mode === 'cascade'}
                      onChange={() => setMode('cascade')}
                      className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-900">Delete all subtasks</span>
                      <p className="text-xs text-slate-500">
                        Permanently remove this task and all its subtasks
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onConfirm(hasChildren ? mode : 'cascade')}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
