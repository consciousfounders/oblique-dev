import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasks } from '@/lib/hooks/useTasks'
import { type Task, type TaskType, type TaskPriority } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  RefreshCw,
  Clock,
  AlertCircle,
  Check,
  Plus,
  Loader2,
  ArrowRight,
  User,
  Building2,
  Kanban,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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

const ENTITY_ICONS: Record<string, React.ElementType> = {
  contact: User,
  account: Building2,
  deal: Kanban,
  lead: UserCircle,
}

export function TodaysTasksWidget() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Get today's date and calculate date ranges
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Fetch today's tasks
  const { tasks: todayTasks, loading: loadingToday, completeTask, refresh } = useTasks({
    dueDateFrom: todayStr,
    dueDateTo: todayStr,
    includeCompleted: false,
    includeEntityNames: true,
  })

  // Fetch overdue tasks
  const { tasks: overdueTasks, loading: loadingOverdue } = useTasks({
    dueDateTo: yesterdayStr,
    includeCompleted: false,
    includeEntityNames: true,
  })

  const loading = loadingToday || loadingOverdue

  const handleComplete = async (task: Task) => {
    const result = await completeTask(task.id)
    if (result) {
      toast.success('Task completed')
      refresh()
    }
  }

  const handleNewTask = () => {
    setEditingTask(null)
    setFormOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setFormOpen(true)
  }

  // Combine overdue and today's tasks
  const allTasks = [...overdueTasks, ...todayTasks].slice(0, 5)
  const totalTasksCount = overdueTasks.length + todayTasks.length

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Today's Tasks
            {totalTasksCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                {totalTasksCount}
              </span>
            )}
          </CardTitle>
          <Button size="sm" variant="ghost" onClick={handleNewTask}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : allTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks due today</p>
            <Button size="sm" variant="link" onClick={handleNewTask}>
              Create a task
            </Button>
          </div>
        ) : (
          <>
            {/* Overdue badge */}
            {overdueTasks.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium pb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}
              </div>
            )}

            {allTasks.map((task) => {
              const TypeIcon = TASK_ICONS[task.task_type]
              const isOverdue = task.due_date && task.due_date < todayStr
              const EntityIcon = task.entity_type ? ENTITY_ICONS[task.entity_type] || User : null

              return (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors group cursor-pointer"
                  onClick={() => handleEditTask(task)}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleComplete(task)
                    }}
                    className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 border-muted-foreground/30 hover:border-primary flex items-center justify-center transition-colors"
                  >
                  </button>

                  {/* Task Icon */}
                  <TypeIcon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', TASK_COLORS[task.task_type])} />

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Priority indicator */}
                      {task.priority === 'high' && (
                        <AlertCircle className={cn('w-3 h-3', PRIORITY_COLORS.high)} />
                      )}
                      {/* Due time or overdue badge */}
                      {isOverdue ? (
                        <span className="text-xs text-red-500 font-medium">Overdue</span>
                      ) : task.due_time ? (
                        <span className="text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {task.due_time.slice(0, 5)}
                        </span>
                      ) : null}
                      {/* Entity name */}
                      {task.entity_name && EntityIcon && (
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <EntityIcon className="w-3 h-3" />
                          {task.entity_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Complete button on hover */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleComplete(task)
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )
            })}

            {/* View all link */}
            {totalTasksCount > 5 && (
              <div className="pt-2">
                <Link
                  to="/tasks"
                  className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
                >
                  View all {totalTasksCount} tasks
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* View All Tasks link */}
      <div className="px-4 pb-4">
        <Link to="/tasks">
          <Button variant="outline" size="sm" className="w-full">
            View All Tasks
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Task Form Dialog */}
      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
        onTaskSaved={() => {
          refresh()
          setFormOpen(false)
        }}
      />
    </Card>
  )
}
