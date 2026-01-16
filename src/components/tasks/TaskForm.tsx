import { useState, useEffect } from 'react'
import { useTasks } from '@/lib/hooks/useTasks'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  type Task,
  type TaskType,
  type TaskPriority,
  type TaskStatus,
  TASK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  CALL_OUTCOMES,
  supabase,
} from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  RefreshCw,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  todo: CheckSquare,
  follow_up: RefreshCw,
}

const TASK_COLORS: Record<TaskType, string> = {
  call: 'bg-green-500 hover:bg-green-600',
  email: 'bg-blue-500 hover:bg-blue-600',
  meeting: 'bg-purple-500 hover:bg-purple-600',
  todo: 'bg-amber-500 hover:bg-amber-600',
  follow_up: 'bg-cyan-500 hover:bg-cyan-600',
}

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType?: string
  entityId?: string
  task?: Task | null
  onTaskSaved?: (task: Task) => void
}

interface User {
  id: string
  full_name: string | null
  email: string
}

export function TaskForm({
  open,
  onOpenChange,
  entityType,
  entityId,
  task,
  onTaskSaved,
}: TaskFormProps) {
  const { user } = useAuth()
  const { addTask, updateTask } = useTasks({ entityType, entityId })
  const isEditing = !!task

  // Form state
  const [taskType, setTaskType] = useState<TaskType>('todo')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>('not_started')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [reminderMinutes, setReminderMinutes] = useState(15)

  // Call-specific fields
  const [callOutcome, setCallOutcome] = useState('')
  const [callDuration, setCallDuration] = useState('')

  // Meeting-specific fields
  const [meetingLocation, setMeetingLocation] = useState('')

  // Users list for assignment
  const [users, setUsers] = useState<User[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Load users for assignment
  useEffect(() => {
    async function loadUsers() {
      if (!user?.tenantId) return
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('tenant_id', user.tenantId)
        .order('full_name')
      if (data) setUsers(data)
    }
    loadUsers()
  }, [user?.tenantId])

  // Initialize form when task changes (editing mode)
  useEffect(() => {
    if (task) {
      setTaskType(task.task_type)
      setSubject(task.subject)
      setDescription(task.description || '')
      setPriority(task.priority)
      setStatus(task.status)
      setDueDate(task.due_date || '')
      setDueTime(task.due_time || '')
      setAssignedTo(task.assigned_to || '')
      setReminderEnabled(task.reminder_enabled)
      setReminderMinutes(task.reminder_minutes_before)
      setCallOutcome(task.call_outcome || '')
      setCallDuration(task.call_duration?.toString() || '')
      setMeetingLocation(task.meeting_location || '')
    } else {
      // Reset form for new task
      setTaskType('todo')
      setSubject('')
      setDescription('')
      setPriority('medium')
      setStatus('not_started')
      setDueDate('')
      setDueTime('')
      setAssignedTo(user?.id || '')
      setReminderEnabled(false)
      setReminderMinutes(15)
      setCallOutcome('')
      setCallDuration('')
      setMeetingLocation('')
    }
  }, [task, user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) {
      toast.error('Subject is required')
      return
    }

    setSubmitting(true)
    try {
      const taskData = {
        subject: subject.trim(),
        description: description.trim() || null,
        task_type: taskType,
        priority,
        status,
        due_date: dueDate || null,
        due_time: dueTime || null,
        assigned_to: assignedTo || null,
        entity_type: entityType || null,
        entity_id: entityId || null,
        reminder_enabled: reminderEnabled,
        reminder_minutes_before: reminderMinutes,
        call_outcome: taskType === 'call' ? callOutcome || null : null,
        call_duration: taskType === 'call' && callDuration ? parseInt(callDuration) : null,
        meeting_location: taskType === 'meeting' ? meetingLocation || null : null,
      }

      let result: Task | null
      if (isEditing && task) {
        result = await updateTask(task.id, taskData)
      } else {
        result = await addTask(taskData)
      }

      if (result) {
        toast.success(isEditing ? 'Task updated' : 'Task created')
        onTaskSaved?.(result)
        onOpenChange(false)
      }
    } catch {
      toast.error(isEditing ? 'Failed to update task' : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type Selector */}
          <div className="space-y-2">
            <Label>Task Type</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPES.map(({ value, label }) => {
                const Icon = TASK_ICONS[value]
                const isSelected = taskType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTaskType(value)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
                      isSelected
                        ? `${TASK_COLORS[value]} text-white`
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="Enter task subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              placeholder="Add details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: string) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        {value === 'high' && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v: string) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reminderEnabled"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="reminderEnabled" className="text-sm font-normal flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Reminder
              </Label>
            </div>
            {reminderEnabled && (
              <Select
                value={reminderMinutes.toString()}
                onValueChange={(v: string) => setReminderMinutes(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Call-specific fields */}
          {taskType === 'call' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Call Outcome</Label>
                <Select value={callOutcome} onValueChange={setCallOutcome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_OUTCOMES.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="callDuration">Duration (seconds)</Label>
                <Input
                  id="callDuration"
                  type="number"
                  placeholder="e.g., 300"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Meeting-specific fields */}
          {taskType === 'meeting' && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="meetingLocation">Location</Label>
                <Input
                  id="meetingLocation"
                  placeholder="e.g., Conference Room A, Zoom link, etc."
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !subject.trim()}>
              {submitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
