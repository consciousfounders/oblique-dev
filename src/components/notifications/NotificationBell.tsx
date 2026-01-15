import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { cn } from '@/lib/utils'
import type { Notification, NotificationCategory } from '@/lib/supabase'

function getNotificationIcon(category: NotificationCategory): string {
  const iconMap: Record<NotificationCategory, string> = {
    task_due: '📋',
    task_overdue: '⏰',
    deal_stage_change: '📊',
    lead_assigned: '👤',
    mention_in_note: '💬',
    email_reply: '📧',
    meeting_reminder: '📅',
    quota_alert: '📈',
    system: '⚙️',
  }
  return iconMap[category] || '🔔'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function NotificationItem({ notification, onMarkAsRead, onDelete, onClose }: NotificationItemProps) {
  const isUnread = !notification.read_at

  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border last:border-0 transition-colors',
        isUnread ? 'bg-primary/5' : 'bg-background'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">{getNotificationIcon(notification.category)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={cn('text-sm', isUnread && 'font-medium')}>{notification.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
            </div>
            {isUnread && (
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{formatTimeAgo(notification.created_at)}</span>
            <div className="flex items-center gap-1">
              {notification.action_url && (
                <Link
                  to={notification.action_url}
                  onClick={() => {
                    if (isUnread) onMarkAsRead(notification.id)
                    onClose()
                  }}
                >
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </Link>
              )}
              {isUnread && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notification.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMore,
  } = useNotifications({ pageSize: 10 })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium bg-destructive text-destructive-foreground rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 max-h-[480px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="w-10 h-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                    onClose={() => setIsOpen(false)}
                  />
                ))}
                {hasMore && (
                  <div className="p-2 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={loadMore}
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 bg-muted/30">
            <Link
              to="/settings/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Notification settings
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
