import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLinkedInActivities } from '@/lib/hooks/useLinkedIn'
import { ACTIVITY_LABELS } from '@/lib/services/linkedinService'
import type { LinkedInActivity, LinkedInActivityType } from '@/lib/supabase'
import {
  Activity,
  UserPlus,
  UserCheck,
  UserX,
  Mail,
  MailOpen,
  MessageSquare,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Inbox,
  Loader2,
} from 'lucide-react'

interface LinkedInActivityTimelineProps {
  linkedinProfileId?: string
  title?: string
  maxHeight?: string
}

// Activity icon mapping
const activityIcons: Record<LinkedInActivityType, React.ReactNode> = {
  connection_request_sent: <UserPlus className="w-4 h-4" />,
  connection_request_accepted: <UserCheck className="w-4 h-4" />,
  connection_request_declined: <UserX className="w-4 h-4" />,
  inmail_sent: <Mail className="w-4 h-4" />,
  inmail_opened: <MailOpen className="w-4 h-4" />,
  inmail_replied: <MessageSquare className="w-4 h-4" />,
  profile_viewed: <Eye className="w-4 h-4" />,
  post_liked: <Heart className="w-4 h-4" />,
  post_commented: <MessageCircle className="w-4 h-4" />,
  post_shared: <Share2 className="w-4 h-4" />,
  message_sent: <Send className="w-4 h-4" />,
  message_received: <Inbox className="w-4 h-4" />,
}

// Activity color mapping
const activityColors: Record<LinkedInActivityType, string> = {
  connection_request_sent: 'bg-blue-500',
  connection_request_accepted: 'bg-green-500',
  connection_request_declined: 'bg-red-500',
  inmail_sent: 'bg-purple-500',
  inmail_opened: 'bg-indigo-500',
  inmail_replied: 'bg-green-500',
  profile_viewed: 'bg-gray-500',
  post_liked: 'bg-pink-500',
  post_commented: 'bg-orange-500',
  post_shared: 'bg-cyan-500',
  message_sent: 'bg-blue-500',
  message_received: 'bg-green-500',
}

interface ActivityItemProps {
  activity: LinkedInActivity
}

function ActivityItem({ activity }: ActivityItemProps) {
  const icon = activityIcons[activity.activity_type]
  const bgColor = activityColors[activity.activity_type]
  const label = ACTIVITY_LABELS[activity.activity_type]
  const date = new Date(activity.created_at)

  // Format relative time
  const formatRelativeTime = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex gap-3 pb-4 relative">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />

      {/* Icon */}
      <div className={`relative z-10 w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-white flex-shrink-0`}>
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">
            {activity.subject || label.label}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatRelativeTime(date)}
          </span>
        </div>

        {activity.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}

        {/* InMail details */}
        {(activity.activity_type === 'inmail_sent' || activity.activity_type === 'inmail_replied') && activity.inmail_subject && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <p className="font-medium">{activity.inmail_subject}</p>
            {activity.inmail_body && (
              <p className="text-muted-foreground mt-1 line-clamp-3">
                {activity.inmail_body}
              </p>
            )}
          </div>
        )}

        {/* Response info */}
        {activity.responded_at && (
          <p className="text-xs text-green-600 mt-1">
            Responded on {new Date(activity.responded_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}

export function LinkedInActivityTimeline({
  linkedinProfileId,
  title = 'LinkedIn Activity',
  maxHeight = '400px',
}: LinkedInActivityTimelineProps) {
  const {
    activities,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  } = useLinkedInActivities({ linkedinProfileId })

  if (!linkedinProfileId) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0A66C2]" />
          {title}
          {activities.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({activities.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive py-4 text-center">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No LinkedIn activity yet</p>
            <p className="text-xs mt-1">
              Activities will appear here as you engage on LinkedIn
            </p>
          </div>
        )}

        {/* Activities list */}
        {!loading && activities.length > 0 && (
          <div
            className="overflow-y-auto pr-2"
            style={{ maxHeight }}
          >
            {activities.map((activity, index) => (
              <div key={activity.id}>
                <ActivityItem activity={activity} />
                {/* Remove timeline line from last item */}
                {index === activities.length - 1 && (
                  <style>{`
                    div:last-child > div:first-child::after {
                      display: none;
                    }
                  `}</style>
                )}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
