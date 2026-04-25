'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, UserPlus, RefreshCw, CheckCheck } from 'lucide-react';
import * as Popover from '@/components/ui/popover';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '@/lib/types';

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  mention: MessageSquare,
  assignment: UserPlus,
  status_change: RefreshCw,
};

const TYPE_COLORS: Record<string, string> = {
  mention:       'bg-accent-soft text-[var(--accent)]',
  assignment:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  status_change: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (n: Notification) => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const colorClass = TYPE_COLORS[notification.type] ?? 'bg-neutral-100 text-text-muted';
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <button
      type="button"
      onClick={() => onRead(notification)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-hover',
        !notification.is_read && 'bg-accent-soft',
      )}
    >
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read ? 'font-medium text-text' : 'text-text')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-text-muted">{notification.body}</p>
        )}
        <p className="mt-0.5 text-[10px] text-text-faint">{timeAgo}</p>
      </div>
      {!notification.is_read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadCount(currentUser.id);
  const { data: notifications, isLoading } = useNotifications(currentUser.id, open);
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      markRead.mutate(n.id);
    }
    if (n.project_id) {
      const url = n.task_id
        ? `/project/${n.project_id}?task=${n.task_id}`
        : `/project/${n.project_id}`;
      router.push(url);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(currentUser.id);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border-color bg-surface text-text-muted transition-colors hover:bg-hover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-color px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-[var(--accent)] transition-colors hover:opacity-80"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-text-faint" />
              <p className="mt-2 text-sm text-text-muted">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border-color/60 p-1">
              {notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
