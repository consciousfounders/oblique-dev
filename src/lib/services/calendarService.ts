import { GoogleApiClient } from './googleApiClient'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
    self?: boolean
  }>
  organizer?: {
    email: string
    displayName?: string
    self?: boolean
  }
  creator?: {
    email: string
    displayName?: string
  }
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string
      uri: string
      label?: string
    }>
    conferenceSolution?: {
      name: string
      iconUri?: string
    }
  }
  colorId?: string
  created: string
  updated: string
}

interface CalendarListResponse {
  items: CalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

export interface ParsedCalendarEvent {
  id: string
  title: string
  description: string
  location: string
  start: Date
  end: Date
  allDay: boolean
  attendees: Array<{
    email: string
    name: string
    status: string
  }>
  organizer: string
  meetingUrl: string | null
  status: string
  googleLink: string
  colorId: string | null
}

export class CalendarService {
  private static parseEvent(event: CalendarEvent): ParsedCalendarEvent {
    const isAllDay = !event.start.dateTime
    const start = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date + 'T00:00:00')
    const end = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date + 'T23:59:59')

    // Find meeting URL from conference data
    let meetingUrl: string | null = null
    if (event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find(
        (ep) => ep.entryPointType === 'video'
      )
      meetingUrl = videoEntry?.uri || null
    }

    return {
      id: event.id,
      title: event.summary || '(No title)',
      description: event.description || '',
      location: event.location || '',
      start,
      end,
      allDay: isAllDay,
      attendees: (event.attendees || []).map((a) => ({
        email: a.email,
        name: a.displayName || a.email,
        status: a.responseStatus || 'needsAction',
      })),
      organizer: event.organizer?.email || '',
      meetingUrl,
      status: event.status || 'confirmed',
      googleLink: event.htmlLink || '',
      colorId: event.colorId || null,
    }
  }

  // List events from primary calendar
  static async listEvents(options: {
    timeMin?: Date
    timeMax?: Date
    maxResults?: number
    pageToken?: string
    q?: string
    singleEvents?: boolean
    orderBy?: 'startTime' | 'updated'
  } = {}): Promise<{ events: ParsedCalendarEvent[]; nextPageToken?: string }> {
    const {
      timeMin = new Date(),
      timeMax,
      maxResults = 50,
      pageToken,
      q,
      singleEvents = true,
      orderBy = 'startTime',
    } = options

    // Default timeMax to 30 days from now if not specified
    const defaultTimeMax = new Date()
    defaultTimeMax.setDate(defaultTimeMax.getDate() + 30)

    const response = await GoogleApiClient.get<CalendarListResponse>(
      '/calendar/v3/calendars/primary/events',
      {
        timeMin: timeMin.toISOString(),
        timeMax: (timeMax || defaultTimeMax).toISOString(),
        maxResults,
        pageToken,
        q,
        singleEvents,
        orderBy,
      }
    )

    return {
      events: (response.items || []).map((e) => this.parseEvent(e)),
      nextPageToken: response.nextPageToken,
    }
  }

  // Get a single event
  static async getEvent(eventId: string): Promise<ParsedCalendarEvent> {
    const response = await GoogleApiClient.get<CalendarEvent>(
      `/calendar/v3/calendars/primary/events/${eventId}`
    )
    return this.parseEvent(response)
  }

  // Create a new event
  static async createEvent(options: {
    title: string
    description?: string
    location?: string
    start: Date
    end: Date
    allDay?: boolean
    attendees?: string[]
    addMeet?: boolean
    timeZone?: string
  }): Promise<ParsedCalendarEvent> {
    const {
      title,
      description,
      location,
      start,
      end,
      allDay = false,
      attendees = [],
      addMeet = false,
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    } = options

    const eventData: Partial<CalendarEvent> & { conferenceDataVersion?: number } = {
      summary: title,
      description,
      location,
      attendees: attendees.map((email) => ({ email })),
    }

    if (allDay) {
      eventData.start = { date: start.toISOString().split('T')[0] }
      eventData.end = { date: end.toISOString().split('T')[0] }
    } else {
      eventData.start = { dateTime: start.toISOString(), timeZone }
      eventData.end = { dateTime: end.toISOString(), timeZone }
    }

    if (addMeet) {
      eventData.conferenceData = {
        conferenceSolution: { name: 'Google Meet' },
      } as CalendarEvent['conferenceData']
    }

    const response = await GoogleApiClient.post<CalendarEvent>(
      '/calendar/v3/calendars/primary/events',
      eventData,
      addMeet ? { conferenceDataVersion: 1 } : undefined
    )

    return this.parseEvent(response)
  }

  // Update an event
  static async updateEvent(
    eventId: string,
    updates: {
      title?: string
      description?: string
      location?: string
      start?: Date
      end?: Date
      allDay?: boolean
      attendees?: string[]
      timeZone?: string
    }
  ): Promise<ParsedCalendarEvent> {
    const {
      title,
      description,
      location,
      start,
      end,
      allDay,
      attendees,
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    } = updates

    const eventData: Partial<CalendarEvent> = {}

    if (title !== undefined) eventData.summary = title
    if (description !== undefined) eventData.description = description
    if (location !== undefined) eventData.location = location
    if (attendees !== undefined) {
      eventData.attendees = attendees.map((email) => ({ email }))
    }

    if (start && end) {
      if (allDay) {
        eventData.start = { date: start.toISOString().split('T')[0] }
        eventData.end = { date: end.toISOString().split('T')[0] }
      } else {
        eventData.start = { dateTime: start.toISOString(), timeZone }
        eventData.end = { dateTime: end.toISOString(), timeZone }
      }
    }

    const response = await GoogleApiClient.patch<CalendarEvent>(
      `/calendar/v3/calendars/primary/events/${eventId}`,
      eventData
    )

    return this.parseEvent(response)
  }

  // Delete an event
  static async deleteEvent(eventId: string): Promise<void> {
    await GoogleApiClient.delete(`/calendar/v3/calendars/primary/events/${eventId}`)
  }

  // Quick add event using natural language
  static async quickAdd(text: string): Promise<ParsedCalendarEvent> {
    const response = await GoogleApiClient.post<CalendarEvent>(
      '/calendar/v3/calendars/primary/events/quickAdd',
      undefined,
      { text }
    )
    return this.parseEvent(response)
  }

  // Get events for a specific date range (useful for calendar views)
  static async getEventsForDateRange(
    start: Date,
    end: Date
  ): Promise<ParsedCalendarEvent[]> {
    const { events } = await this.listEvents({
      timeMin: start,
      timeMax: end,
      maxResults: 250,
    })
    return events
  }

  // Get upcoming events (next N events)
  static async getUpcomingEvents(count = 10): Promise<ParsedCalendarEvent[]> {
    const { events } = await this.listEvents({
      timeMin: new Date(),
      maxResults: count,
    })
    return events
  }
}
