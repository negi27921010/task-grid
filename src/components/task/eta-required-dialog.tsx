'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Dialog from '@/components/ui/dialog';

interface EtaRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (eta: string) => void;
}

export function EtaRequiredDialog({ open, onOpenChange, onConfirm }: EtaRequiredDialogProps) {
  const [eta, setEta] = useState('');

  const handleSubmit = () => {
    if (!eta) return;
    onConfirm(eta);
    onOpenChange(false);
    setEta('');
  };

  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="max-w-sm">
        <Dialog.Title>Set a due date to start this task</Dialog.Title>
        <Dialog.Description>
          A due date is required before moving a task to &quot;In Progress&quot;. This helps track deadlines and prevents tasks from running indefinitely.
        </Dialog.Description>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <Calendar className="inline h-4 w-4 mr-1 text-slate-400" />
              Due Date *
            </label>
            <input
              type="date"
              value={eta}
              onChange={e => setEta(e.target.value)}
              min={minDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!eta}>
              Start Task
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
