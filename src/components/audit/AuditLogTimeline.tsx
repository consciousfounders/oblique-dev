import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuditLog } from '@/lib/hooks/useAuditLog'
import {
  type AuditLog,
  type AuditOperation,
  type AuditEntityType,
  type AuditChange,
  AUDIT_OPERATION_LABELS,
  AUDIT_OPERATION_COLORS,
  AUDIT_SOURCE_LABELS,
} from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Edit3,
  Trash2,
  Filter,
  X,
  Loader2,
  UserCircle,
  Users,
  Building2,
  Kanban,
  ClipboardList,
  Megaphone,
  Package,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const OPERATION_ICONS: Record<AuditOperation, React.ElementType> = {
  create: Plus,
  update: Edit3,
  delete: Trash2,
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  lead: UserCircle,
  contact: Users,
  account: Building2,
  deal: Kanban,
  task: ClipboardList,
  campaign: Megaphone,
  product: Package,
}

const ENTITY_LABELS: Record<string, string> = {
  lead: 'Lead',
  contact: 'Contact',
  account: 'Account',
  deal: 'Deal',
  task: 'Task',
  campaign: 'Campaign',
  product: 'Product',
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

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const logDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - logDate.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

interface ChangeItemProps {
  change: AuditChange
}

function ChangeItem({ change }: ChangeItemProps) {
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      <span className="font-medium text-muted-foreground min-w-[120px]">
        {change.field_label}:
      </span>
      <span className="text-red-600 dark:text-red-400 line-through">
        {formatValue(change.old_value)}
      </span>
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-green-600 dark:text-green-400">
        {formatValue(change.new_value)}
      </span>
    </div>
  )
}

interface AuditLogItemProps {
  log: AuditLog
  showEntity?: boolean
  isLast?: boolean
}

function AuditLogItem({ log, showEntity = false, isLast = false }: AuditLogItemProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = OPERATION_ICONS[log.operation]
  const colors = AUDIT_OPERATION_COLORS[log.operation]
  const EntityIcon = ENTITY_ICONS[log.entity_type] || ClipboardList
  const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type
  const entityPath = `/${log.entity_type}s/${log.entity_id}`
  const changes = (log.changes || []) as AuditChange[]
  const hasChanges = changes.length > 0

  return (
    <div className="flex gap-3 pb-4 last:pb-0">
      <div className="relative flex flex-col items-center">
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          colors.bg,
          colors.text
        )}>
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px h-full bg-border absolute top-8" />}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded', colors.bg, colors.text)}>
                {AUDIT_OPERATION_LABELS[log.operation]}
              </span>
              {showEntity && (
                <Link
                  to={entityPath}
                  className="inline-flex items-center gap-1 text-sm hover:text-primary transition-colors group"
                >
                  <EntityIcon className="w-4 h-4" />
                  <span className="font-medium group-hover:underline">
                    {log.entity_name || entityLabel}
                  </span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              )}
              {!showEntity && log.entity_name && (
                <span className="font-medium text-sm">{log.entity_name}</span>
              )}
            </div>

            {log.operation === 'create' && (
              <p className="text-sm text-muted-foreground mt-1">
                {entityLabel} was created
              </p>
            )}

            {log.operation === 'delete' && (
              <p className="text-sm text-muted-foreground mt-1">
                {entityLabel} was deleted
              </p>
            )}

            {log.operation === 'update' && hasChanges && (
              <div className="mt-2">
                {changes.length <= 3 || expanded ? (
                  <div className="space-y-0.5">
                    {changes.map((change, index) => (
                      <ChangeItem key={`${change.field}-${index}`} change={change} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {changes.slice(0, 2).map((change, index) => (
                      <ChangeItem key={`${change.field}-${index}`} change={change} />
                    ))}
                  </div>
                )}
                {changes.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 h-6 px-2 text-xs"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show {changes.length - 2} more changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {log.user_name && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {log.user_name}
                </span>
              )}
              {log.source && log.source !== 'web' && (
                <span className="px-1.5 py-0.5 rounded bg-muted">
                  {AUDIT_SOURCE_LABELS[log.source]}
                </span>
              )}
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(log.changed_at)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface DateGroupHeaderProps {
  label: string
}

function DateGroupHeader({ label }: DateGroupHeaderProps) {
  return (
    <div className="flex items-center gap-2 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground px-2">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

interface AuditFilterProps {
  selectedOperations: AuditOperation[]
  onOperationsChange: (ops: AuditOperation[]) => void
}

function AuditFilter({ selectedOperations, onOperationsChange }: AuditFilterProps) {
  const [showFilters, setShowFilters] = useState(false)

  const operations: { value: AuditOperation; label: string }[] = [
    { value: 'create', label: 'Created' },
    { value: 'update', label: 'Updated' },
    { value: 'delete', label: 'Deleted' },
  ]

  const toggleOperation = (op: AuditOperation) => {
    if (selectedOperations.includes(op)) {
      onOperationsChange(selectedOperations.filter(o => o !== op))
    } else {
      onOperationsChange([...selectedOperations, op])
    }
  }

  const clearFilters = () => {
    onOperationsChange([])
    setShowFilters(false)
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowFilters(!showFilters)}
        className={cn(selectedOperations.length > 0 && 'border-primary')}
      >
        <Filter className="w-4 h-4 mr-1" />
        Filter
        {selectedOperations.length > 0 && (
          <span className="ml-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
            {selectedOperations.length}
          </span>
        )}
      </Button>

      {showFilters && (
        <div className="absolute right-0 top-full mt-2 z-10 bg-popover border rounded-lg shadow-lg p-3 min-w-[180px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Change Types</span>
            {selectedOperations.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {operations.map(({ value, label }) => {
              const Icon = OPERATION_ICONS[value]
              const colors = AUDIT_OPERATION_COLORS[value]
              const isSelected = selectedOperations.includes(value)
              return (
                <button
                  key={value}
                  onClick={() => toggleOperation(value)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors',
                    isSelected && 'bg-muted'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded flex items-center justify-center',
                    colors.bg,
                    colors.text
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

interface AuditLogTimelineProps {
  entityType?: AuditEntityType
  entityId?: string
  userId?: string
  operations?: AuditOperation[]
  title?: string
  showFilters?: boolean
  compact?: boolean
  maxHeight?: string
  emptyMessage?: string
  showEntityLinks?: boolean
  groupByDate?: boolean
}

export function AuditLogTimeline({
  entityType,
  entityId,
  userId,
  operations: externalOperations,
  title = 'Change History',
  showFilters = true,
  compact = false,
  maxHeight = '600px',
  emptyMessage = 'No changes recorded',
  showEntityLinks = false,
  groupByDate = true,
}: AuditLogTimelineProps) {
  const [selectedOperations, setSelectedOperations] = useState<AuditOperation[]>([])
  const isGlobalView = !entityType && !entityId && !userId

  // Use external operations if provided, otherwise use local filter state
  const activeOperations = externalOperations || (selectedOperations.length > 0 ? selectedOperations : undefined)

  const {
    logs,
    loading,
    loadingMore,
    hasMore,
    error,
    totalCount,
    loadMore
  } = useAuditLog({
    entityType,
    entityId,
    userId,
    operations: activeOperations,
  })

  const observerTarget = useRef<HTMLDivElement>(null)

  // Group logs by date if enabled
  const groupedLogs = useMemo(() => {
    if (!groupByDate) return null

    const groups: { key: string; label: string; logs: AuditLog[] }[] = []
    let currentKey = ''

    logs.forEach(log => {
      const key = getDateKey(log.changed_at)
      if (key !== currentKey) {
        currentKey = key
        groups.push({
          key,
          label: formatDateGroup(log.changed_at),
          logs: [log]
        })
      } else {
        groups[groups.length - 1].logs.push(log)
      }
    })

    return groups
  }, [logs, groupByDate])

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

  const renderLogs = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (error) {
      return <p className="text-sm text-destructive py-4">{error}</p>
    }

    if (logs.length === 0) {
      return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
    }

    if (groupByDate && groupedLogs) {
      return (
        <div>
          {groupedLogs.map((group, groupIndex) => (
            <div key={group.key}>
              <DateGroupHeader label={group.label} />
              {group.logs.map((log, logIndex) => (
                <AuditLogItem
                  key={log.id}
                  log={log}
                  showEntity={showEntityLinks || isGlobalView}
                  isLast={
                    groupIndex === groupedLogs.length - 1 &&
                    logIndex === group.logs.length - 1
                  }
                />
              ))}
            </div>
          ))}
          <div ref={observerTarget} className="h-1" />
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-0">
        {logs.map((log, index) => (
          <AuditLogItem
            key={log.id}
            log={log}
            showEntity={showEntityLinks || isGlobalView}
            isLast={index === logs.length - 1}
          />
        ))}
        <div ref={observerTarget} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {showFilters && (
          <div className="flex items-center justify-between">
            {totalCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {totalCount} change{totalCount !== 1 ? 's' : ''}
              </span>
            )}
            <AuditFilter
              selectedOperations={selectedOperations}
              onOperationsChange={setSelectedOperations}
            />
          </div>
        )}
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {renderLogs()}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          {totalCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {totalCount} change{totalCount !== 1 ? 's' : ''} recorded
            </p>
          )}
        </div>
        {showFilters && (
          <AuditFilter
            selectedOperations={selectedOperations}
            onOperationsChange={setSelectedOperations}
          />
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {renderLogs()}
        </div>
      </CardContent>
    </Card>
  )
}
