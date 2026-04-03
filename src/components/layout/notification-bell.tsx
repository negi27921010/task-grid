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
  mention: 'bg-blue-100 text-blue-600',
  assignment: 'bg-emerald-100 text-emerald-600',
  status_change: 'bg-amber-100 text-amber-600',
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (n: Notification) => void;
}) {
  const Icon = TYPE_ICONS[notification.type] ?? Bell;
  const colorClass = TYPE_COLORS[notification.type] ?? 'bg-slate-100 text-slate-600';
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <button
      type="button"
      onClick={() => onRead(notification)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-50',
        !notification.is_read && 'bg-blue-50/50',
      )}
    >
      <div className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read ? 'font-medium text-slate-900' : 'text-slate-700')}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{notification.body}</p>
        )}
        <p className="mt-0.5 text-[10px] text-slate-400">{timeAgo}</p>
      </div>
      {!notification.is_read && (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
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
          className="relative rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
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
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-200" />
              <p className="mt-2 text-sm text-slate-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 p-1">
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
