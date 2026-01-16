import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTasks } from '@/lib/hooks/useTasks'
import { TaskList } from '@/components/tasks'
import { TaskForm } from '@/components/tasks'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, CheckSquare, Clock, AlertTriangle, Calendar } from 'lucide-react'
import { type Task } from '@/lib/supabase'

export function TasksPage() {
  const { user } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState('my-tasks')

  // Get today's date for filtering
  const today = new Date().toISOString().split('T')[0]

  // Fetch counts for tabs
  const { tasks: myTasks } = useTasks({
    assignedTo: user?.id,
    includeCompleted: false,
  })

  const { tasks: todayTasks } = useTasks({
    dueDateFrom: today,
    dueDateTo: today,
    includeCompleted: false,
  })

  const { tasks: overdueTasks } = useTasks({
    dueDateTo: today,
    includeCompleted: false,
  })

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const handleTaskClick = (task: Task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">
            Manage your tasks, follow-ups, calls, and meetings
          </p>
        </div>
        <Button onClick={handleNewTask}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my-tasks" className="gap-2">
            <CheckSquare className="w-4 h-4" />
            My Tasks
            {myTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
                {myTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            <Calendar className="w-4 h-4" />
            Today
            {todayTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {todayTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-2">
            <AlertTriangle className="w-4 h-4" />
            Overdue
            {overdueTasks.filter(t => t.due_date && t.due_date < today).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                {overdueTasks.filter(t => t.due_date && t.due_date < today).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            <Clock className="w-4 h-4" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          <TaskList
            key="my-tasks"
            title="My Tasks"
            showFilters={true}
            showEntityLink={true}
            emptyMessage="No tasks assigned to you. Create one to get started!"
            onTaskClick={handleTaskClick}
          />
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          <TodayTaskList onTaskClick={handleTaskClick} />
        </TabsContent>

        <TabsContent value="overdue" className="mt-4">
          <OverdueTaskList onTaskClick={handleTaskClick} />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          <UpcomingTaskList onTaskClick={handleTaskClick} />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <AllTasksList onTaskClick={handleTaskClick} />
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onTaskSaved={() => {
          setFormOpen(false)
        }}
      />
    </div>
  )
}

// Separate components for each tab to properly scope hooks

function TodayTaskList({ onTaskClick }: { onTaskClick: (task: Task) => void }) {
  const today = new Date().toISOString().split('T')[0]
  const { tasks, loading, loadingMore, hasMore, loadMore, deleteTask, completeTask, refresh } = useTasks({
    dueDateFrom: today,
    dueDateTo: today,
    includeCompleted: false,
    includeEntityNames: true,
  })

  return (
    <TaskListContent
      tasks={tasks}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      deleteTask={deleteTask}
      completeTask={completeTask}
      refresh={refresh}
      title="Today's Tasks"
      emptyMessage="No tasks due today. Great job!"
      onTaskClick={onTaskClick}
    />
  )
}

function OverdueTaskList({ onTaskClick }: { onTaskClick: (task: Task) => void }) {
  // Calculate yesterday's date for overdue filter
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { tasks, loading, loadingMore, hasMore, loadMore, deleteTask, completeTask, refresh } = useTasks({
    dueDateTo: yesterdayStr,
    includeCompleted: false,
    includeEntityNames: true,
  })

  return (
    <TaskListContent
      tasks={tasks}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      deleteTask={deleteTask}
      completeTask={completeTask}
      refresh={refresh}
      title="Overdue Tasks"
      emptyMessage="No overdue tasks. You're all caught up!"
      onTaskClick={onTaskClick}
    />
  )
}

function UpcomingTaskList({ onTaskClick }: { onTaskClick: (task: Task) => void }) {
  // Get tomorrow's date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { tasks, loading, loadingMore, hasMore, loadMore, deleteTask, completeTask, refresh } = useTasks({
    dueDateFrom: tomorrowStr,
    includeCompleted: false,
    includeEntityNames: true,
  })

  return (
    <TaskListContent
      tasks={tasks}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      deleteTask={deleteTask}
      completeTask={completeTask}
      refresh={refresh}
      title="Upcoming Tasks"
      emptyMessage="No upcoming tasks scheduled"
      onTaskClick={onTaskClick}
    />
  )
}

function AllTasksList({ onTaskClick }: { onTaskClick: (task: Task) => void }) {
  const { tasks, loading, loadingMore, hasMore, loadMore, deleteTask, completeTask, refresh } = useTasks({
    includeCompleted: true,
    includeEntityNames: true,
  })

  return (
    <TaskListContent
      tasks={tasks}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      deleteTask={deleteTask}
      completeTask={completeTask}
      refresh={refresh}
      title="All Tasks"
      emptyMessage="No tasks found. Create one to get started!"
      onTaskClick={onTaskClick}
      showCompleted={true}
    />
  )
}

// Shared task list content component
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  MoreVertical,
  Check,
  Pencil,
  Trash2,
  User,
  Building2,
  Kanban,
  UserCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { type TaskType, type TaskStatus, type TaskPriority } from '@/lib/supabase'

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  todo: CheckSquare,
  follow_up: Clock,
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

interface TaskListContentProps {
  tasks: Task[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  deleteTask: (id: string) => Promise<boolean>
  completeTask: (id: string) => Promise<Task | null>
  refresh: () => Promise<void>
  title: string
  emptyMessage: string
  onTaskClick: (task: Task) => void
  showCompleted?: boolean
}

function TaskListContent({
  tasks,
  loading,
  loadingMore,
  hasMore,
  loadMore,
  deleteTask,
  completeTask,
  title,
  emptyMessage,
  onTaskClick,
}: TaskListContentProps) {
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

  const formatDueDate = (task: Task) => {
    if (!task.due_date) return null

    const date = parseISO(task.due_date)
    const isOverdue = isPast(date) && task.status !== 'completed' && !isToday(date)

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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
                  onClick={() => onTaskClick(task)}
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
                        <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', PRIORITY_COLORS.high)} />
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
                      {getEntityLink(task)}

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
                      <DropdownMenuItem onClick={() => onTaskClick(task)}>
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
    </Card>
  )
}
