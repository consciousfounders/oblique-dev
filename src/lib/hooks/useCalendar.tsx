import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarService, type ParsedCalendarEvent } from '@/lib/services/calendarService'
import { useGoogleApi } from './useGoogleApi'
import { queryKeys } from './useQueryClient'

interface UseCalendarEventsOptions {
  timeMin?: Date
  timeMax?: Date
  pageSize?: number
  enabled?: boolean
}

interface CalendarEventsPage {
  events: ParsedCalendarEvent[]
  nextPageToken?: string
}

/**
 * Hook for fetching calendar events with pagination
 */
export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const {
    timeMin = new Date(),
    timeMax,
    pageSize = 50,
    enabled = true,
  } = options
  const { executeWithRetry } = useGoogleApi()

  // Default timeMax to 30 days from timeMin if not specified
  const defaultTimeMax = timeMax ?? new Date(timeMin.getTime() + 30 * 24 * 60 * 60 * 1000)

  const query = useInfiniteQuery({
    queryKey: queryKeys.calendar.events(timeMin, defaultTimeMax),
    queryFn: async ({ pageParam }): Promise<CalendarEventsPage> => {
      const result = await executeWithRetry(() =>
        CalendarService.listEvents({
          timeMin,
          timeMax: defaultTimeMax,
          maxResults: pageSize,
          pageToken: pageParam as string | undefined,
        })
      )
      return {
        events: result.events,
        nextPageToken: result.nextPageToken,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Flatten all pages into a single array
  const events = query.data?.pages.flatMap((page) => page.events) ?? []

  return {
    events,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    error: query.error,
  }
}

/**
 * Hook for fetching events for a specific date range (non-paginated, for calendar views)
 */
export function useCalendarEventsForRange(start: Date, end: Date, enabled = true) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.calendar.events(start, end),
    queryFn: () =>
      executeWithRetry(() => CalendarService.getEventsForDateRange(start, end)),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook for fetching upcoming events
 */
export function useUpcomingEvents(count = 10, enabled = true) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: [...queryKeys.calendar.all, 'upcoming', count],
    queryFn: () => executeWithRetry(() => CalendarService.getUpcomingEvents(count)),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook for fetching a single calendar event
 */
export function useCalendarEvent(eventId: string | null) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.calendar.event(eventId ?? ''),
    queryFn: () => executeWithRetry(() => CalendarService.getEvent(eventId!)),
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook for creating calendar events with optimistic updates
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async (params: {
      title: string
      description?: string
      location?: string
      start: Date
      end: Date
      allDay?: boolean
      attendees?: string[]
      addMeet?: boolean
      timeZone?: string
    }) => {
      return executeWithRetry(() => CalendarService.createEvent(params))
    },
    onSuccess: () => {
      // Invalidate all calendar queries to refresh the data
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })
}

/**
 * Hook for updating calendar events
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async ({
      eventId,
      updates,
    }: {
      eventId: string
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
    }) => {
      return executeWithRetry(() => CalendarService.updateEvent(eventId, updates))
    },
    onMutate: async ({ eventId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.calendar.event(eventId) })

      // Snapshot previous value
      const previousEvent = queryClient.getQueryData<ParsedCalendarEvent>(
        queryKeys.calendar.event(eventId)
      )

      // Optimistically update
      if (previousEvent) {
        queryClient.setQueryData(queryKeys.calendar.event(eventId), {
          ...previousEvent,
          title: updates.title ?? previousEvent.title,
          description: updates.description ?? previousEvent.description,
          location: updates.location ?? previousEvent.location,
          start: updates.start ?? previousEvent.start,
          end: updates.end ?? previousEvent.end,
          allDay: updates.allDay ?? previousEvent.allDay,
        })
      }

      return { previousEvent }
    },
    onError: (_err, { eventId }, context) => {
      // Rollback on error
      if (context?.previousEvent) {
        queryClient.setQueryData(queryKeys.calendar.event(eventId), context.previousEvent)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })
}

/**
 * Hook for deleting calendar events
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: (eventId: string) =>
      executeWithRetry(() => CalendarService.deleteEvent(eventId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })
}

/**
 * Hook for quick add event (natural language)
 */
export function useQuickAddEvent() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: (text: string) =>
      executeWithRetry(() => CalendarService.quickAdd(text)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all })
    },
  })
}
