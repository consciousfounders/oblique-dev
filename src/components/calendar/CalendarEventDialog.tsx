import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/lib/hooks/useCalendar'
import { type ParsedCalendarEvent } from '@/lib/services/calendarService'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Repeat,
  Palette,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: ParsedCalendarEvent | null
  selectedDate?: Date
}

type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

interface Attendee {
  email: string
  name?: string
}

const CALENDAR_COLORS = [
  { id: '1', name: 'Lavender', color: '#7986cb' },
  { id: '2', name: 'Sage', color: '#33b679' },
  { id: '3', name: 'Grape', color: '#8e24aa' },
  { id: '4', name: 'Flamingo', color: '#e67c73' },
  { id: '5', name: 'Banana', color: '#f6c026' },
  { id: '6', name: 'Tangerine', color: '#f5511d' },
  { id: '7', name: 'Peacock', color: '#039be5' },
  { id: '8', name: 'Graphite', color: '#616161' },
  { id: '9', name: 'Blueberry', color: '#3f51b5' },
  { id: '10', name: 'Basil', color: '#0b8043' },
  { id: '11', name: 'Tomato', color: '#d60000' },
]

export function CalendarEventDialog({
  open,
  onOpenChange,
  event,
  selectedDate,
}: CalendarEventDialogProps) {
  const isEditing = !!event

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [addMeet, setAddMeet] = useState(false)
  const [recurrence, setRecurrence] = useState<RecurrenceRule>('none')
  const [colorId, setColorId] = useState<string | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Mutations
  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()

  const isPending = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending
  const error = createEvent.error || updateEvent.error || deleteEvent.error

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      if (event) {
        // Editing mode - populate form with event data
        setTitle(event.title)
        setDescription(event.description)
        setLocation(event.location)
        setAllDay(event.allDay)
        setStartDate(formatDateForInput(event.start))
        setEndDate(formatDateForInput(event.end))
        setStartTime(formatTimeForInput(event.start))
        setEndTime(formatTimeForInput(event.end))
        setAttendees(event.attendees.map((a) => ({ email: a.email, name: a.name })))
        setAddMeet(!!event.meetingUrl)
        setColorId(event.colorId)
        setRecurrence('none')
      } else {
        // Create mode - use selected date or today
        const date = selectedDate || new Date()
        const dateStr = formatDateForInput(date)
        setTitle('')
        setDescription('')
        setLocation('')
        setAllDay(false)
        setStartDate(dateStr)
        setEndDate(dateStr)
        setStartTime('09:00')
        setEndTime('10:00')
        setAttendees([])
        setAddMeet(false)
        setColorId(null)
        setRecurrence('none')
      }
      setAttendeeInput('')
      setShowColorPicker(false)
      setShowDeleteConfirm(false)
    }
  }, [open, event, selectedDate])

  function formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  function formatTimeForInput(date: Date): string {
    return date.toTimeString().slice(0, 5)
  }

  const handleAddAttendee = useCallback(() => {
    const email = attendeeInput.trim()
    if (email && isValidEmail(email) && !attendees.some((a) => a.email === email)) {
      setAttendees([...attendees, { email }])
      setAttendeeInput('')
    }
  }, [attendeeInput, attendees])

  function handleRemoveAttendee(email: string) {
    setAttendees(attendees.filter((a) => a.email !== email))
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function handleAttendeeKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddAttendee()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startDate) return

    const start = allDay
      ? new Date(`${startDate}T00:00:00`)
      : new Date(`${startDate}T${startTime}`)
    const end = allDay
      ? new Date(`${endDate || startDate}T23:59:59`)
      : new Date(`${endDate || startDate}T${endTime}`)

    const attendeeEmails = attendees.map((a) => a.email)

    try {
      if (isEditing && event) {
        await updateEvent.mutateAsync({
          eventId: event.id,
          updates: {
            title: title.trim(),
            description: description.trim() || undefined,
            location: location.trim() || undefined,
            start,
            end,
            allDay,
            attendees: attendeeEmails.length > 0 ? attendeeEmails : undefined,
          },
        })
      } else {
        await createEvent.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start,
          end,
          allDay,
          attendees: attendeeEmails.length > 0 ? attendeeEmails : undefined,
          addMeet,
        })
      }
      onOpenChange(false)
    } catch {
      // Error is already captured in the mutation state
    }
  }

  async function handleDelete() {
    if (!event) return
    try {
      await deleteEvent.mutateAsync(event.id)
      onOpenChange(false)
    } catch {
      // Error is already captured in the mutation state
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'New Event'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your calendar event details'
              : 'Create a new event on your Google Calendar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <Input
              placeholder="Add title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-medium"
              required
              autoFocus
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date & Time</span>
            </div>

            <div className="flex items-center gap-3 pl-6">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="allDay" className="text-sm">
                All day
              </label>
            </div>

            <div className="pl-6 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    if (!endDate || e.target.value > endDate) {
                      setEndDate(e.target.value)
                    }
                  }}
                  required
                  className="flex-1"
                />
                {!allDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">to</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={endDate || startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="flex-1"
                />
                {!allDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-32"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Attendees</span>
            </div>
            <div className="pl-6 space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add attendee email"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={handleAttendeeKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddAttendee}
                  disabled={!attendeeInput.trim() || !isValidEmail(attendeeInput)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.email}
                      className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                    >
                      <span>{attendee.name || attendee.email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(attendee.email)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Google Meet */}
          {!isEditing && (
            <div className="flex items-center gap-3 pl-6">
              <Video className="w-4 h-4 text-muted-foreground" />
              <input
                type="checkbox"
                id="addMeet"
                checked={addMeet}
                onChange={(e) => setAddMeet(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="addMeet" className="text-sm">
                Add Google Meet video conferencing
              </label>
            </div>
          )}

          {/* Recurrence */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Repeat</span>
            </div>
            <div className="pl-6">
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              {recurrence !== 'none' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Note: Recurrence will be applied when creating the event on Google Calendar
                </p>
              )}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Color</span>
            </div>
            <div className="pl-6">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className="w-5 h-5 rounded-full border"
                  style={{
                    backgroundColor: colorId
                      ? CALENDAR_COLORS.find((c) => c.id === colorId)?.color
                      : '#4285f4',
                  }}
                />
                <span>{colorId ? CALENDAR_COLORS.find((c) => c.id === colorId)?.name : 'Default'}</span>
              </button>
              {showColorPicker && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setColorId(null)
                      setShowColorPicker(false)
                    }}
                    className={cn(
                      'w-6 h-6 rounded-full border-2',
                      !colorId ? 'border-primary' : 'border-transparent'
                    )}
                    style={{ backgroundColor: '#4285f4' }}
                    title="Default"
                  />
                  {CALENDAR_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        setColorId(color.id)
                        setShowColorPicker(false)
                      }}
                      className={cn(
                        'w-6 h-6 rounded-full border-2',
                        colorId === color.id ? 'border-primary' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color.color }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Description</span>
            </div>
            <div className="pl-6">
              <textarea
                placeholder="Add description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[80px] p-3 rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
              {error.message}
            </div>
          )}

          {/* Delete confirmation */}
          {isEditing && showDeleteConfirm && (
            <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-sm space-y-2">
              <p>Are you sure you want to delete this event?</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {deleteEvent.isPending ? 'Deleting...' : 'Yes, delete'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && !showDeleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isPending}
                className="mr-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                ? 'Save Changes'
                : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
