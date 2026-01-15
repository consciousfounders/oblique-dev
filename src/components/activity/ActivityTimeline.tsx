import { useEffect, useRef, useCallback, useState } from 'react'
import { useActivities, type Activity, type ActivityType, ACTIVITY_TYPES } from '@/lib/hooks/useActivities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Calendar,
  Phone,
  FileText,
  TrendingUp,
  CheckSquare,
  Filter,
  X,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  meeting: Calendar,
  call: Phone,
  note: FileText,
  deal_update: TrendingUp,
  task: CheckSquare,
}

const ACTIVITY_COLORS: Record<string, string> = {
  email: 'bg-blue-500',
  meeting: 'bg-purple-500',
  call: 'bg-green-500',
  note: 'bg-amber-500',
  deal_update: 'bg-pink-500',
  task: 'bg-cyan-500',
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

interface ActivityItemProps {
  activity: Activity
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText
  const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'bg-gray-500'

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full text-white shrink-0',
          colorClass
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="w-px h-full bg-border absolute top-8" />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {activity.subject && (
              <p className="font-medium text-sm truncate">{activity.subject}</p>
            )}
            {activity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                {activity.description}
              </p>
            )}
            {!activity.subject && !activity.description && (
              <p className="text-sm text-muted-foreground italic">
                {activity.activity_type.replace('_', ' ')} activity
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(activity.created_at)}
          </span>
        </div>
        {activity.users?.full_name && (
          <p className="text-xs text-muted-foreground mt-1">
            by {activity.users.full_name}
          </p>
        )}
      </div>
    </div>
  )
}

interface ActivityFilterProps {
  selectedTypes: ActivityType[]
  onTypesChange: (types: ActivityType[]) => void
}

function ActivityFilter({ selectedTypes, onTypesChange }: ActivityFilterProps) {
  const [showFilters, setShowFilters] = useState(false)

  const toggleType = (type: ActivityType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  const clearFilters = () => {
    onTypesChange([])
    setShowFilters(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className={cn(selectedTypes.length > 0 && 'border-primary')}
      >
        <Filter className="w-4 h-4 mr-1" />
        Filter
        {selectedTypes.length > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {selectedTypes.length}
          </span>
        )}
      </Button>

      {showFilters && (
        <div className="absolute right-0 top-full mt-2 z-10 bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Activity Types</span>
            {selectedTypes.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {ACTIVITY_TYPES.map(({ value, label }) => {
              const Icon = ACTIVITY_ICONS[value]
              const isSelected = selectedTypes.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleType(value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors',
                    isSelected && 'bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded flex items-center justify-center text-white',
                    ACTIVITY_COLORS[value]
                  )}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="flex-1 text-left">{label}</span>
                  {isSelected && <X className="w-3 h-3 text-muted-foreground" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ActivityTimelineProps {
  entityType?: string
  entityId?: string
  title?: string
  showFilters?: boolean
  compact?: boolean
  maxHeight?: string
  emptyMessage?: string
}

export function ActivityTimeline({
  entityType,
  entityId,
  title = 'Activity Timeline',
  showFilters = true,
  compact = false,
  maxHeight = '600px',
  emptyMessage = 'No activities yet',
}: ActivityTimelineProps) {
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([])
  const {
    activities,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore
  } = useActivities({
    entityType,
    entityId,
    activityTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
  })

  const observerTarget = useRef<HTMLDivElement>(null)

  // Infinite scroll using IntersectionObserver
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
      loadMore()
    }
  }, [hasMore, loadingMore, loading, loadMore])

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    })

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [handleObserver])

  if (compact) {
    return (
      <div className="space-y-3">
        {showFilters && (
          <div className="flex justify-end">
            <ActivityFilter selectedTypes={selectedTypes} onTypesChange={setSelectedTypes} />
          </div>
        )}

        <div className="overflow-y-auto" style={{ maxHeight }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-0">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}

              <div ref={observerTarget} className="h-1" />

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {showFilters && (
          <ActivityFilter selectedTypes={selectedTypes} onTypesChange={setSelectedTypes} />
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive py-4">{error}</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-0">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}

              <div ref={observerTarget} className="h-1" />

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
