import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '@/lib/hooks/useTasks'
import {
  type Task,
  type TaskType,
  type TaskStatus,
  type TaskPriority,
  TASK_TYPES,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  RefreshCw,
  MoreVertical,
  Check,
  Pencil,
  Trash2,
  Clock,
  AlertCircle,
  User,
  Building2,
  Kanban,
  UserCircle,
  Filter,
  Plus,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { TaskForm } from './TaskForm'

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  todo: CheckSquare,
  follow_up: RefreshCw,
}

const TASK_COLORS: Record<TaskType, string> = {
  call: 'text-green-500',
  email: 'text-blue-500',
  meeting: 'text-purple-500',
  todo: 'text-amber-500',
  follow_up: 'text-cyan-500',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-gray-400',
}

const STATUS_BADGES: Record<TaskStatus, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  deferred: { label: 'Deferred', className: 'bg-orange-100 text-orange-700' },
}

const ENTITY_ICONS: Record<string, React.ElementType> = {
  contact: User,
  account: Building2,
  deal: Kanban,
  lead: UserCircle,
}

interface TaskListProps {
  entityType?: string
  entityId?: string
  showFilters?: boolean
  showEntityLink?: boolean
  maxHeight?: string
  title?: string
  emptyMessage?: string
  onTaskClick?: (task: Task) => void
}

export function TaskList({
  entityType,
  entityId,
  showFilters = true,
  showEntityLink = false,
  maxHeight,
  title = 'Tasks',
  emptyMessage = 'No tasks found',
  onTaskClick,
}: TaskListProps) {
  // Filter state
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')
  const [includeCompleted, setIncludeCompleted] = useState(false)

  // Task form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Build filter options
  const filterOptions = {
    entityType,
    entityId,
    taskTypes: filterType !== 'all' ? [filterType] : undefined,
    statuses: filterStatus !== 'all' ? [filterStatus] : undefined,
    priorities: filterPriority !== 'all' ? [filterPriority] : undefined,
    includeCompleted,
    includeEntityNames: showEntityLink,
  }

  const {
    tasks,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    deleteTask,
    completeTask,
    refresh,
  } = useTasks(filterOptions)

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  const handleDelete = async (task: Task) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    const success = await deleteTask(task.id)
    if (success) {
      toast.success('Task deleted')
    }
  }

  const handleComplete = async (task: Task) => {
    const result = await completeTask(task.id)
    if (result) {
      toast.success('Task completed')
    }
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const handleTaskSaved = () => {
    refresh()
  }

  const formatDueDate = (task: Task) => {
    if (!task.due_date) return null

    const date = parseISO(task.due_date)
    const isOverdue = isPast(date) && task.status !== 'completed'

    let dateStr: string
    if (isToday(date)) {
      dateStr = 'Today'
    } else if (isTomorrow(date)) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = format(date, 'MMM d, yyyy')
    }

    if (task.due_time) {
      dateStr += ` at ${task.due_time.slice(0, 5)}`
    }

    return (
      <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
        <Clock className="w-3 h-3 inline mr-1" />
        {dateStr}
        {isOverdue && ' (Overdue)'}
      </span>
    )
  }

  const getEntityLink = (task: Task) => {
    if (!task.entity_type || !task.entity_id) return null
    const entityPath = `/${task.entity_type}s/${task.entity_id}`
    const EntityIcon = ENTITY_ICONS[task.entity_type] || User
    return (
      <Link
        to={entityPath}
        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <EntityIcon className="w-3 h-3" />
        {task.entity_name || task.entity_type}
      </Link>
    )
  }

  return (
    <Card className={cn(maxHeight && 'flex flex-col')}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button size="sm" onClick={handleNewTask}>
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-3">
            <Select value={filterType} onValueChange={(v: string) => setFilterType(v as TaskType | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TASK_TYPES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(v: string) => setFilterStatus(v as TaskStatus | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TASK_STATUSES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={(v: string) => setFilterPriority(v as TaskPriority | 'all')}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {TASK_PRIORITIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompleted}
                  onChange={(e) => setIncludeCompleted(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Show Completed
              </label>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className={cn('space-y-2', maxHeight && 'flex-1 overflow-y-auto')}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const TypeIcon = TASK_ICONS[task.task_type]
              const statusBadge = STATUS_BADGES[task.status]
              const isCompleted = task.status === 'completed'

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer',
                    isCompleted && 'opacity-60'
                  )}
                  onClick={() => onTaskClick?.(task) || handleEdit(task)}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isCompleted) handleComplete(task)
                    }}
                    className={cn(
                      'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {isCompleted && <Check className="w-3 h-3" />}
                  </button>

                  {/* Task Icon */}
                  <TypeIcon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', TASK_COLORS[task.task_type])} />

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn('font-medium truncate', isCompleted && 'line-through')}>
                          {task.subject}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Priority indicator */}
                      {task.priority === 'high' && (
                        <AlertCircle className={cn('w-4 h-4 flex-shrink-0', PRIORITY_COLORS.high)} />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Status badge */}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadge.className)}>
                        {statusBadge.label}
                      </span>

                      {/* Due date */}
                      {formatDueDate(task)}

                      {/* Entity link */}
                      {showEntityLink && getEntityLink(task)}

                      {/* Assigned user */}
                      {task.assigned_user?.full_name && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {task.assigned_user.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(task)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!isCompleted && (
                        <DropdownMenuItem onClick={() => handleComplete(task)}>
                          <Check className="w-4 h-4 mr-2" />
                          Complete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(task)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {/* Load more button */}
            {hasMore && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Task Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        entityType={entityType}
        entityId={entityId}
        task={editingTask}
        onTaskSaved={handleTaskSaved}
      />
    </Card>
  )
}
