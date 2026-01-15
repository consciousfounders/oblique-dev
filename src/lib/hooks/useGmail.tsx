import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { GmailService, type EmailThread } from '@/lib/services/gmailService'
import { useGoogleApi } from './useGoogleApi'
import { queryKeys } from './useQueryClient'

interface UseGmailThreadsOptions {
  search?: string
  pageSize?: number
  enabled?: boolean
}

interface GmailThreadsPage {
  threads: EmailThread[]
  nextPageToken?: string
}

/**
 * Hook for fetching Gmail threads with infinite scroll pagination
 */
export function useGmailThreads(options: UseGmailThreadsOptions = {}) {
  const { search = '', pageSize = 20, enabled = true } = options
  const { executeWithRetry } = useGoogleApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.gmail.threads(search || undefined),
    queryFn: async ({ pageParam }): Promise<GmailThreadsPage> => {
      const result = await executeWithRetry(() =>
        GmailService.listThreads({
          maxResults: pageSize,
          pageToken: pageParam as string | undefined,
          q: search || undefined,
        })
      )
      return {
        threads: result.threads,
        nextPageToken: result.nextPageToken,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled,
    staleTime: 60 * 1000, // 1 minute
  })

  // Flatten all pages into a single array
  const threads = query.data?.pages.flatMap((page) => page.threads) ?? []

  return {
    threads,
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
 * Hook for fetching a single Gmail thread
 */
export function useGmailThread(threadId: string | null) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.gmail.thread(threadId ?? ''),
    queryFn: () => executeWithRetry(() => GmailService.getThread(threadId!)),
    enabled: !!threadId,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook for sending emails with optimistic updates
 */
export function useSendEmail() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async (params: {
      to: string[]
      cc?: string[]
      bcc?: string[]
      subject: string
      body: string
      bodyHtml?: string
      threadId?: string
      inReplyTo?: string
    }) => {
      return executeWithRetry(() => GmailService.sendEmail(params))
    },
    onSuccess: (_data, variables) => {
      // Invalidate thread list to show the new/updated thread
      queryClient.invalidateQueries({ queryKey: queryKeys.gmail.threads() })

      // If replying to a thread, invalidate that specific thread
      if (variables.threadId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gmail.thread(variables.threadId) })
      }
    },
  })
}

/**
 * Hook for email actions (mark read/unread, archive)
 */
export function useEmailActions() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  const markAsRead = useMutation({
    mutationFn: (messageId: string) =>
      executeWithRetry(() => GmailService.markAsRead(messageId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gmail.all })
    },
  })

  const markAsUnread = useMutation({
    mutationFn: (messageId: string) =>
      executeWithRetry(() => GmailService.markAsUnread(messageId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gmail.all })
    },
  })

  const archive = useMutation({
    mutationFn: (messageId: string) =>
      executeWithRetry(() => GmailService.archive(messageId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gmail.all })
    },
  })

  return {
    markAsRead: markAsRead.mutate,
    markAsUnread: markAsUnread.mutate,
    archive: archive.mutate,
    isLoading: markAsRead.isPending || markAsUnread.isPending || archive.isPending,
  }
}

/**
 * Hook to prefetch a thread (for hover optimization)
 */
export function usePrefetchThread() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useCallback(
    (threadId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.gmail.thread(threadId),
        queryFn: () => executeWithRetry(() => GmailService.getThread(threadId)),
        staleTime: 30 * 1000,
      })
    },
    [queryClient, executeWithRetry]
  )
}
