import { useState } from 'react'
import { useTasks } from '@/lib/hooks/useTasks'
import {
  type Task,
  type TaskType,
  type TaskPriority,
} from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
  Calendar,
  CheckSquare,
  RefreshCw,
  MoreVertical,
  Check,
  Pencil,
  Trash2,
  AlertCircle,
  Plus,
  Loader2,
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

interface TasksPanelProps {
  entityType: string
  entityId: string
}

export function TasksPanel({ entityType, entityId }: TasksPanelProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const {
    tasks,
    loading,
    deleteTask,
    completeTask,
    refresh,
  } = useTasks({
    entityType,
    entityId,
    includeCompleted: showCompleted,
  })

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
    const isOverdue = isPast(date) && task.status !== 'completed' && !isToday(date)

    let dateStr: string
    if (isToday(date)) {
      dateStr = 'Today'
    } else if (isTomorrow(date)) {
      dateStr = 'Tomorrow'
    } else {
      dateStr = format(date, 'MMM d')
    }

    if (task.due_time) {
      dateStr += ` ${task.due_time.slice(0, 5)}`
    }

    return (
      <span className={cn('text-xs', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
        {dateStr}
        {isOverdue && ' (Overdue)'}
      </span>
    )
  }

  // Count open tasks
  const openTasksCount = tasks.filter(t => t.status !== 'completed').length
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Tasks
            {openTasksCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                {openTasksCount}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={handleNewTask}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>No tasks yet</p>
            <Button size="sm" variant="link" onClick={handleNewTask}>
              Create a task
            </Button>
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const TypeIcon = TASK_ICONS[task.task_type]
              const isCompleted = task.status === 'completed'

              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group',
                    isCompleted && 'opacity-60'
                  )}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => !isCompleted && handleComplete(task)}
                    className={cn(
                      'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-muted-foreground/30 hover:border-primary'
                    )}
                  >
                    {isCompleted && <Check className="w-2.5 h-2.5" />}
                  </button>

                  {/* Task Icon */}
                  <TypeIcon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', TASK_COLORS[task.task_type])} />

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isCompleted && 'line-through text-muted-foreground')}>
                      {task.subject}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Priority indicator */}
                      {task.priority === 'high' && (
                        <AlertCircle className={cn('w-3 h-3', PRIORITY_COLORS.high)} />
                      )}
                      {/* Due date */}
                      {formatDueDate(task)}
                    </div>
                  </div>

                  {/* Actions - shown on hover */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(task)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!isCompleted && (
                        <DropdownMenuItem onClick={() => handleComplete(task)}>
                          <Check className="w-3.5 h-3.5 mr-2" />
                          Complete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(task)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

            {/* Toggle completed */}
            {(completedTasksCount > 0 || showCompleted) && (
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
              >
                {showCompleted ? 'Hide' : 'Show'} {completedTasksCount} completed
              </button>
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
