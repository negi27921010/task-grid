'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Clock, Calendar, MessageSquare,
  FileText, Send, AlertTriangle,
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
import { parseMentions, extractMentionQuery, insertMention } from '@/lib/utils/mentions';
import { createBulkNotifications } from '@/lib/api/notifications';
import { getTaskDepthLabel, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types/task';
import type { Task, TaskStatus, Priority } from '@/lib/types';
import { StatusSelect } from './status-select';
import { PrioritySelect } from './priority-select';
import { OwnerSelect } from './owner-select';
import { LabelPicker } from './label-picker';
import { BlockerReasonDialog } from './blocker-reason-dialog';
import { EtaRequiredDialog } from './eta-required-dialog';

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
  const [etaDialogOpen, setEtaDialogOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const canEditAll = can(currentUser, 'canModifyAllTaskFields');
  const canEditStatus = can(currentUser, 'canUpdateTaskStatus');
  const canSetPriority = can(currentUser, 'canSetPriority');

  // Only reset drafts when switching to a different task, NOT on every refetch
  const currentTaskId = task?.id;
  useEffect(() => {
    if (task) {
      setTitleDraft(task.title);
      setDescDraft(task.description);
      setRemarksDraft(task.remarks ?? '');
    }
  }, [currentTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // ETA required for in_progress
    if (status === 'in_progress' && !task.eta) {
      setEtaDialogOpen(true);
      return;
    }
    changeStatus.mutate({ id: task.id, status });
  };

  const handleEtaConfirmAndStart = (eta: string) => {
    if (!task) return;
    // Set ETA first, then change status
    updateTask.mutate(
      { id: task.id, updates: { eta } },
      {
        onSuccess: () => {
          changeStatus.mutate({ id: task.id, status: 'in_progress' });
        },
      },
    );
  };

  const handleBlockerConfirm = (reason: string) => {
    if (!task) return;
    changeStatus.mutate({ id: task.id, status: 'blocked', metadata: { blocker_reason: reason } });
  };

  const handleAddComment = () => {
    if (!task || !commentText.trim()) return;
    const content = commentText.trim();
    addComment.mutate(
      { taskId: task.id, authorId: currentUser.id, content },
      {
        onSuccess: () => {
          setCommentText('');
          setMentionQuery(null);
          // Create notifications for @mentioned users
          const allUsers = users ?? [];
          const mentionedIds = parseMentions(content, allUsers)
            .filter(id => id !== currentUser.id); // don't notify self
          if (mentionedIds.length > 0) {
            createBulkNotifications(
              mentionedIds.map(uid => ({
                user_id: uid,
                type: 'mention' as const,
                title: `${currentUser.full_name} mentioned you in "${task.title}"`,
                body: content.length > 80 ? content.slice(0, 80) + '...' : content,
                task_id: task.id,
                project_id: task.project_id,
              }))
            ).catch(() => {}); // fire and forget
          }
        },
      }
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
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[520px]"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
              {depthLabel}
            </span>
            {task && (
              <AgingBadge status={agingStatus} label={agingLabel} />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
                    className="w-full rounded-md border border-blue-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                ) : (
                  <h2
                    className={cn(
                      'text-lg font-semibold text-slate-900',
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
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <StatusSelect
                    currentStatus={task.status}
                    onStatusChange={handleStatusChange}
                    disabled={!canEditStatus}
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Priority</p>
                  {(canEditAll || canSetPriority) ? (
                    <PrioritySelect
                      currentPriority={task.priority}
                      onPriorityChange={handlePriorityChange}
                    />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                      <span className={cn(
                        'h-2 w-2 rounded-full',
                        task.priority === 'P1' && 'bg-red-500',
                        task.priority === 'P2' && 'bg-pink-500',
                        task.priority === 'P3' && 'bg-blue-500',
                        task.priority === 'P4' && 'bg-slate-400',
                      )} />
                      {PRIORITY_LABELS[task.priority]}
                    </span>
                  )}
                </div>

                {/* Assignees */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500">Assignees</p>
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
                  <p className="text-xs font-medium text-slate-500">ETA</p>
                  {canEditAll ? (
                    <input
                      type="date"
                      value={task.eta ? task.eta.split('T')[0] : ''}
                      onChange={e => handleEtaChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-slate-700">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
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
                <p className="text-xs font-medium text-slate-500">Labels</p>
                <LabelPicker
                  taskId={task.id}
                  taskLabels={task.labels ?? []}
                  editable={true}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Description</p>
                {editingDesc && canEditAll ? (
                  <div>
                    <textarea
                      value={descDraft}
                      onChange={e => setDescDraft(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                      'min-h-[60px] rounded-md border border-slate-200 px-3 py-2 text-sm',
                      task.description ? 'text-slate-700' : 'text-slate-400 italic',
                      canEditAll && 'cursor-pointer hover:border-slate-300 hover:bg-slate-50'
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
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">Remarks</p>
                </div>
                {editingRemarks ? (
                  <div>
                    <textarea
                      value={remarksDraft}
                      onChange={e => setRemarksDraft(e.target.value)}
                      rows={3}
                      placeholder="Add internal remarks or notes..."
                      className="w-full rounded-md border border-blue-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                      'min-h-[48px] rounded-md border border-slate-200 px-3 py-2 text-sm',
                      task.remarks ? 'text-slate-700' : 'text-slate-400 italic',
                      'cursor-pointer hover:border-slate-300 hover:bg-slate-50'
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
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  <p className="text-xs font-medium text-slate-500">
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
                              <span className="text-sm font-medium text-slate-900">
                                {author?.full_name ?? 'Unknown'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatRelative(comment.created_at)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-slate-700 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add comment with @mention */}
                <div className="flex gap-3">
                  <Avatar
                    src={currentUser.avatar_url}
                    fullName={currentUser.full_name}
                    size="sm"
                  />
                  <div className="relative flex-1">
                    {/* Mention dropdown */}
                    {mentionQuery !== null && (() => {
                      const allUsers = users ?? [];
                      const q = mentionQuery.toLowerCase();
                      const filtered = allUsers.filter(u =>
                        u.id !== currentUser.id &&
                        u.full_name.toLowerCase().includes(q)
                      ).slice(0, 6);

                      if (filtered.length === 0) return null;

                      return (
                        <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg z-50 max-h-48 overflow-y-auto">
                          {filtered.map((u, idx) => (
                            <button
                              key={u.id}
                              type="button"
                              onMouseDown={e => {
                                e.preventDefault(); // prevent textarea blur
                                const textarea = commentInputRef.current;
                                if (!textarea) return;
                                const { newText, newCursorPos } = insertMention(
                                  commentText,
                                  textarea.selectionStart,
                                  u.full_name,
                                );
                                setCommentText(newText);
                                setMentionQuery(null);
                                setMentionIdx(0);
                                requestAnimationFrame(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                                });
                              }}
                              className={cn(
                                'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                                idx === mentionIdx ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50',
                              )}
                            >
                              <Avatar fullName={u.full_name} src={u.avatar_url} size="sm" />
                              <div className="text-left">
                                <p className="text-sm font-medium">{u.full_name}</p>
                                <p className="text-[10px] text-slate-400">{u.department}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={e => {
                        const val = e.target.value;
                        setCommentText(val);
                        const cursor = e.target.selectionStart;
                        const q = extractMentionQuery(val, cursor);
                        setMentionQuery(q);
                        if (q !== null) setMentionIdx(0);
                      }}
                      placeholder="Write a comment... (type @ to mention)"
                      rows={2}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={e => {
                        if (mentionQuery !== null) {
                          const allUsers = users ?? [];
                          const q = mentionQuery.toLowerCase();
                          const filtered = allUsers.filter(u =>
                            u.id !== currentUser.id &&
                            u.full_name.toLowerCase().includes(q)
                          ).slice(0, 6);

                          if (filtered.length > 0) {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setMentionIdx(i => Math.min(i + 1, filtered.length - 1));
                              return;
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setMentionIdx(i => Math.max(i - 1, 0));
                              return;
                            }
                            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                              e.preventDefault();
                              const user = filtered[mentionIdx];
                              if (user) {
                                const textarea = commentInputRef.current;
                                if (!textarea) return;
                                const { newText, newCursorPos } = insertMention(
                                  commentText,
                                  textarea.selectionStart,
                                  user.full_name,
                                );
                                setCommentText(newText);
                                setMentionQuery(null);
                                setMentionIdx(0);
                                requestAnimationFrame(() => {
                                  textarea.focus();
                                  textarea.setSelectionRange(newCursorPos, newCursorPos);
                                });
                              }
                              return;
                            }
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setMentionQuery(null);
                              return;
                            }
                          }
                        }
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                    />
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        @ to mention · {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to post
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
              <div className="border-t border-slate-100 pt-4">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
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
      <EtaRequiredDialog
        open={etaDialogOpen}
        onOpenChange={setEtaDialogOpen}
        onConfirm={handleEtaConfirmAndStart}
      />
    </>
  );
}
