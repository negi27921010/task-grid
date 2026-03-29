'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Clock, Calendar, User, MessageSquare,
  FileText, Send, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/avatar';
import { AgingBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTask, useUpdateTask, useChangeTaskStatus, useAddComment, useUpdateRemarks } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { can } from '@/lib/utils/permissions';
import { computeAgingStatus, getAgingLabel } from '@/lib/utils/aging';
import { formatDate, formatRelative } from '@/lib/utils/dates';
import { getTaskDepthLabel, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types/task';
import type { Task, TaskStatus, Priority } from '@/lib/types';
import { StatusSelect } from './status-select';
import { PrioritySelect } from './priority-select';
import { OwnerSelect } from './owner-select';
import { LabelPicker } from './label-picker';
import { BlockerReasonDialog } from './blocker-reason-dialog';

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
}

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { data: task } = useTask(taskId ?? '');
  const { data: users } = useUsers();
  const { currentUser } = useCurrentUser();
  const updateTask = useUpdateTask();
  const changeStatus = useChangeTaskStatus();
  const addComment = useAddComment();
  const updateRemarks = useUpdateRemarks();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksDraft, setRemarksDraft] = useState('');
  const [commentText, setCommentText] = useState('');
  const [blockerOpen, setBlockerOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const canEditAll = can(currentUser, 'canModifyAllTaskFields');
  const canEditStatus = can(currentUser, 'canUpdateTaskStatus');

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescDraft(task.description);
      setRemarksDraft(task.remarks ?? '');
    }
  }, [task]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (taskId) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [taskId, onClose]);

  const handleTitleSave = useCallback(() => {
    if (!task) return;
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, updates: { title: trimmed } });
    }
    setEditingTitle(false);
  }, [titleDraft, task, updateTask]);

  const handleDescSave = useCallback(() => {
    if (!task) return;
    if (descDraft !== task.description) {
      updateTask.mutate({ id: task.id, updates: { description: descDraft } });
    }
    setEditingDesc(false);
  }, [descDraft, task, updateTask]);

  const handleRemarksSave = useCallback(() => {
    if (!task) return;
    const val = remarksDraft.trim() || null;
    if (val !== task.remarks) {
      updateRemarks.mutate({ taskId: task.id, remarks: val });
    }
    setEditingRemarks(false);
  }, [remarksDraft, task, updateRemarks]);

  const handleStatusChange = (status: TaskStatus) => {
    if (!task) return;
    if (status === 'blocked') {
      setBlockerOpen(true);
      return;
    }
    changeStatus.mutate({ id: task.id, status });
  };

  const handleBlockerConfirm = (reason: string) => {
    if (!task) return;
    changeStatus.mutate({ id: task.id, status: 'blocked', metadata: { blocker_reason: reason } });
  };

  const handleAddComment = () => {
    if (!task || !commentText.trim()) return;
    addComment.mutate(
      { taskId: task.id, authorId: currentUser.id, content: commentText.trim() },
      { onSuccess: () => setCommentText('') }
    );
  };

  const handleOwnerChange = (ownerId: string) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, updates: { owner_id: ownerId } });
  };

  const handlePriorityChange = (priority: Priority) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, updates: { priority } });
  };

  const handleEtaChange = (eta: string) => {
    if (!task) return;
    updateTask.mutate({ id: task.id, updates: { eta: eta || null } });
  };

  if (!taskId) return null;

  const owner = users?.find(u => u.id === task?.owner_id);
  const agingStatus = task ? (task.aging_status ?? computeAgingStatus(task)) : 'no_eta';
  const agingLabel = task ? getAgingLabel(task) : '';
  const depthLabel = task ? getTaskDepthLabel(task.depth) : 'Task';
  const comments = task?.comments ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl sm:w-[520px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">
              {depthLabel}
            </span>
            {task && (
              <AgingBadge status={agingStatus} label={agingLabel} />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!task ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-6">
              {/* Title */}
              <div>
                {editingTitle && canEditAll ? (
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') { setTitleDraft(task.title); setEditingTitle(false); }
                    }}
                    autoFocus
                    className="w-full rounded-md border border-blue-300 px-3 py-2 text-lg font-semibold text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                ) : (
                  <h2
                    className={cn(
                      'text-lg font-semibold text-gray-900',
                      canEditAll && 'cursor-pointer hover:text-blue-600'
                    )}
                    onClick={() => { if (canEditAll) { setTitleDraft(task.title); setEditingTitle(true); } }}
                  >
                    {task.title}
                  </h2>
                )}
              </div>

              {/* Properties grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Status</p>
                  <StatusSelect
                    currentStatus={task.status}
                    onStatusChange={handleStatusChange}
                    disabled={!canEditStatus}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Priority</p>
                  {canEditAll ? (
                    <PrioritySelect
                      currentPriority={task.priority}
                      onPriorityChange={handlePriorityChange}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <span className={cn(
                        'h-2 w-2 rounded-full',
                        task.priority === 'P1' && 'bg-red-500',
                        task.priority === 'P2' && 'bg-orange-500',
                        task.priority === 'P3' && 'bg-blue-500',
                        task.priority === 'P4' && 'bg-gray-400',
                      )} />
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  )}
                </div>

                {/* Assignees */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">Assignees</p>
                  <OwnerSelect
                    currentOwnerId={task.owner_id}
                    assigneeIds={task.assignee_ids}
                    onOwnerChange={handleOwnerChange}
                    onAssigneesChange={(ids) => {
                      if (!task) return;
                      const primaryOwner = ids.includes(task.owner_id) ? task.owner_id : ids[0];
                      updateTask.mutate({ id: task.id, updates: { owner_id: primaryOwner ?? task.owner_id, assignee_ids: ids } as Partial<Task> });
                    }}
                    disabled={!canEditAll}
                    multi
                  />
                </div>

                {/* ETA */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500">ETA</p>
                  {canEditAll ? (
                    <input
                      type="date"
                      value={task.eta ? task.eta.split('T')[0] : ''}
                      onChange={e => handleEtaChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {task.eta ? formatDate(task.eta) : 'Not set'}
                    </span>
                  )}
                </div>
              </div>

              {/* Blocker reason */}
              {task.status === 'blocked' && task.blocker_reason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Blocker
                  </div>
                  <p className="mt-1 text-sm text-red-600">{task.blocker_reason}</p>
                </div>
              )}

              {/* Labels */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Labels</p>
                <LabelPicker
                  taskId={task.id}
                  taskLabels={task.labels ?? []}
                  editable={true}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Description</p>
                {editingDesc && canEditAll ? (
                  <div>
                    <textarea
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="primary" onClick={handleDescSave}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setDescDraft(task.description); setEditingDesc(false); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'min-h-[60px] rounded-md border border-gray-200 px-3 py-2 text-sm',
                      task.description ? 'text-gray-700' : 'text-gray-400 italic',
                      canEditAll && 'cursor-pointer hover:border-gray-300 hover:bg-gray-50'
                    )}
                    onClick={() => { if (canEditAll) { setDescDraft(task.description); setEditingDesc(true); } }}
                  >
                    {task.description || 'Click to add description...'}
                  </div>
                )}
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500">Remarks</p>
                </div>
                {editingRemarks ? (
                  <div>
                    <textarea
                      value={remarksDraft}
                      onChange={e => setRemarksDraft(e.target.value)}
                      rows={3}
                      placeholder="Add internal remarks or notes..."
                      className="w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      autoFocus
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="primary" onClick={handleRemarksSave}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRemarksDraft(task.remarks ?? ''); setEditingRemarks(false); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'min-h-[48px] rounded-md border border-gray-200 px-3 py-2 text-sm',
                      task.remarks ? 'text-gray-700' : 'text-gray-400 italic',
                      'cursor-pointer hover:border-gray-300 hover:bg-gray-50'
                    )}
                    onClick={() => { setRemarksDraft(task.remarks ?? ''); setEditingRemarks(true); }}
                  >
                    {task.remarks || 'Click to add remarks...'}
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500">
                    Comments ({comments.length})
                  </p>
                </div>

                {/* Comment list */}
                {comments.length > 0 && (
                  <div className="space-y-3">
                    {comments.map(comment => {
                      const author = users?.find(u => u.id === comment.author_id);
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar
                            src={author?.avatar_url ?? null}
                            fullName={author?.full_name ?? '?'}
                            size="sm"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {author?.full_name ?? 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatRelative(comment.created_at)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-3">
                  <Avatar
                    src={currentUser.avatar_url}
                    fullName={currentUser.full_name}
                    size="sm"
                  />
                  <div className="flex-1">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={2}
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to post
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!commentText.trim()}
                        onClick={handleAddComment}
                        className="gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta info */}
              <div className="border-t border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created {formatRelative(task.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {formatRelative(task.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BlockerReasonDialog
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        onConfirm={handleBlockerConfirm}
      />
    </>
  );
}
