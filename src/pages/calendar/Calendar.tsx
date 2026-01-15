import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCalendarEventsForRange } from '@/lib/hooks/useCalendar'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { type ParsedCalendarEvent } from '@/lib/services/calendarService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarEventDialog } from '@/components/calendar/CalendarEventDialog'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react'

export function CalendarPage() {
  const { session, signInWithGoogle } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<ParsedCalendarEvent | null>(null)
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | undefined>()

  // Initialize Google Token Service
  const hasGoogleAuth = !!session?.provider_token
  if (hasGoogleAuth && session) {
    GoogleTokenService.initialize(session)
  }

  // Calculate date range for the current view (current month + next month)
  const { start: dateRangeStart, end: dateRangeEnd } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
    return { start, end }
  }, [currentDate])

  // Use React Query for data fetching with caching
  const {
    data: events = [],
    isLoading,
    isFetching,
    refetch,
    error: eventsError,
  } = useCalendarEventsForRange(dateRangeStart, dateRangeEnd, hasGoogleAuth)

  const error = eventsError?.message || null

  function handleCreateEvent(date?: Date) {
    setSelectedEvent(null)
    setSelectedDateForCreate(date)
    setShowEventDialog(true)
  }

  function handleEditEvent(event: ParsedCalendarEvent) {
    setSelectedEvent(event)
    setSelectedDateForCreate(undefined)
    setShowEventDialog(true)
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
            <Button onClick={signInWithGoogle} className="w-full">
              Connect with Google
            </Button>
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
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading || isFetching}>
            <RefreshCw className={`w-4 h-4 ${isLoading || isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => handleCreateEvent()}>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-2 text-destructive hover:text-destructive">
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                    className={`min-h-[100px] p-1 border-b border-r cursor-pointer hover:bg-muted/20 transition-colors ${
                      !isCurrentMonth ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleCreateEvent(date)}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEvent(event)
                          }}
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
          )}
        </CardContent>
      </Card>

      {/* Calendar Event Dialog - for both create and edit */}
      <CalendarEventDialog
        open={showEventDialog}
        onOpenChange={setShowEventDialog}
        event={selectedEvent}
        selectedDate={selectedDateForCreate}
      />
    </div>
  )
}
