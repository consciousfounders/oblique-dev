import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { CalendarService, type ParsedCalendarEvent } from '@/lib/services/calendarService'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  Video,
  X,
} from 'lucide-react'

type ViewMode = 'month' | 'week' | 'day'

export function CalendarPage() {
  const { session } = useAuth()
  const [events, setEvents] = useState<ParsedCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [_viewMode, _setViewMode] = useState<ViewMode>('month') // Reserved for future view switching
  const [selectedEvent, setSelectedEvent] = useState<ParsedCalendarEvent | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create event state
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:00')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    checkGoogleAuth()
  }, [session])

  async function checkGoogleAuth() {
    try {
      if (session?.provider_token) {
        await GoogleTokenService.initialize(session)
        setHasGoogleAuth(true)
        fetchEvents()
      } else {
        setHasGoogleAuth(false)
        setLoading(false)
      }
    } catch {
      setHasGoogleAuth(false)
      setLoading(false)
    }
  }

  async function fetchEvents() {
    setLoading(true)
    setError(null)
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)

      const fetchedEvents = await CalendarService.getEventsForDateRange(start, end)
      setEvents(fetchedEvents)
    } catch (err) {
      console.error('Failed to fetch events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasGoogleAuth) {
      fetchEvents()
    }
  }, [currentDate, hasGoogleAuth])

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle || !newDate) return

    setCreating(true)
    try {
      const startDate = new Date(`${newDate}T${newStartTime}`)
      const endDate = new Date(`${newDate}T${newEndTime}`)

      await CalendarService.createEvent({
        title: newTitle,
        description: newDescription,
        start: startDate,
        end: endDate,
      })

      setShowCreate(false)
      setNewTitle('')
      setNewDate('')
      setNewStartTime('09:00')
      setNewEndTime('10:00')
      setNewDescription('')
      fetchEvents()
    } catch (err) {
      console.error('Failed to create event:', err)
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  // Calendar grid helpers
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Add padding for previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Add padding for next month
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }, [currentDate])

  function getEventsForDay(date: Date): ParsedCalendarEvent[] {
    return events.filter((event) => {
      const eventDate = new Date(event.start)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  function navigateMonth(direction: number) {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const today = new Date()

  // Not connected to Google
  if (!hasGoogleAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Your Calendar</h2>
            <p className="text-muted-foreground">
              Sign in with Google to view and manage your calendar events.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="min-w-[150px] text-center font-medium">{monthName}</span>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {calendarDays.map(({ date, isCurrentMonth }, index) => {
              const dayEvents = getEventsForDay(date)
              const isToday =
                date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear()

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-1 border-b border-r ${
                    !isCurrentMonth ? 'bg-muted/30' : ''
                  }`}
                >
                  <div
                    className={`text-sm p-1 ${
                      isToday
                        ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center'
                        : isCurrentMonth
                        ? ''
                        : 'text-muted-foreground'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left text-xs p-1 rounded bg-primary/10 text-primary hover:bg-primary/20 truncate"
                      >
                        {event.allDay ? '' : event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' '}
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="text-xs text-muted-foreground pl-1">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>{selectedEvent.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedEvent(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {selectedEvent.allDay
                    ? 'All day'
                    : `${selectedEvent.start.toLocaleString()} - ${selectedEvent.end.toLocaleTimeString()}`}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.meetingUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={selectedEvent.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
              {selectedEvent.attendees.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    {selectedEvent.attendees.map((a) => (
                      <div key={a.email}>{a.name}</div>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
              )}
              <div className="pt-2">
                <a
                  href={selectedEvent.googleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Open in Google Calendar
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>New Event</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <Input
                    placeholder="Event title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm text-muted-foreground">Start</label>
                    <Input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">End</label>
                    <Input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <textarea
                    className="w-full min-h-[80px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
