import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { DriveService, type ParsedDriveFile } from '@/lib/services/driveService'
import { useGoogleApi } from './useGoogleApi'
import { queryKeys } from './useQueryClient'

interface UseDriveFilesOptions {
  folderId?: string
  search?: string
  pageSize?: number
  enabled?: boolean
}

interface DriveFilesPage {
  files: ParsedDriveFile[]
  nextPageToken?: string
}

/**
 * Hook for fetching Drive files with infinite scroll pagination
 */
export function useDriveFiles(options: UseDriveFilesOptions = {}) {
  const { folderId, search, pageSize = 50, enabled = true } = options
  const { executeWithRetry } = useGoogleApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.drive.files(folderId, search),
    queryFn: async ({ pageParam }): Promise<DriveFilesPage> => {
      const result = await executeWithRetry(() =>
        DriveService.listFiles({
          folderId,
          q: search ? `name contains '${search}'` : undefined,
          pageSize,
          pageToken: pageParam as string | undefined,
        })
      )
      return {
        files: result.files,
        nextPageToken: result.nextPageToken,
      }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Flatten all pages into a single array
  const files = query.data?.pages.flatMap((page) => page.files) ?? []

  return {
    files,
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
 * Hook for fetching a single Drive file
 */
export function useDriveFile(fileId: string | null) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.drive.file(fileId ?? ''),
    queryFn: () => executeWithRetry(() => DriveService.getFile(fileId!)),
    enabled: !!fileId,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook for fetching recent files
 */
export function useRecentFiles(limit = 20, enabled = true) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.drive.recent(),
    queryFn: () => executeWithRetry(() => DriveService.getRecentFiles(limit)),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook for fetching starred files
 */
export function useStarredFiles(enabled = true) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.drive.starred(),
    queryFn: () => executeWithRetry(() => DriveService.getStarredFiles()),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook for fetching shared files
 */
export function useSharedFiles(enabled = true) {
  const { executeWithRetry } = useGoogleApi()

  return useQuery({
    queryKey: queryKeys.drive.shared(),
    queryFn: () => executeWithRetry(() => DriveService.getSharedFiles()),
    enabled,
    staleTime: 60 * 1000,
  })
}

/**
 * Hook for creating folders
 */
export function useCreateFolder() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId?: string }) => {
      return executeWithRetry(() => DriveService.createFolder(name, parentId))
    },
    onSuccess: (_data, variables) => {
      // Invalidate the folder's file list
      queryClient.invalidateQueries({
        queryKey: queryKeys.drive.files(variables.parentId),
      })
    },
  })
}

/**
 * Hook for uploading files with optimistic updates
 */
export function useUploadFile() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async ({
      file,
      parentId,
      name,
    }: {
      file: File
      parentId?: string
      name?: string
    }) => {
      return executeWithRetry(() => DriveService.uploadFile(file, { parentId, name }))
    },
    onMutate: async ({ file, parentId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.drive.files(parentId) })

      // Create optimistic file entry
      const optimisticFile: ParsedDriveFile = {
        id: `temp-${Date.now()}`,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        createdAt: new Date(),
        modifiedAt: new Date(),
        parentId: parentId || null,
        webViewLink: '',
        downloadLink: null,
        iconLink: '',
        thumbnailLink: null,
        owner: '',
        isFolder: false,
        isShared: false,
        isStarred: false,
      }

      // Snapshot previous files
      const previousData = queryClient.getQueryData(queryKeys.drive.files(parentId))

      return { previousData, optimisticFile }
    },
    onError: (_err, { parentId }, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.drive.files(parentId), context.previousData)
      }
    },
    onSettled: (_data, _err, { parentId }) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.files(parentId) })
    },
  })
}

/**
 * Hook for renaming files
 */
export function useRenameFile() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      return executeWithRetry(() => DriveService.renameFile(fileId, newName))
    },
    onMutate: async ({ fileId, newName }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.drive.file(fileId) })

      // Snapshot previous value
      const previousFile = queryClient.getQueryData<ParsedDriveFile>(
        queryKeys.drive.file(fileId)
      )

      // Optimistically update
      if (previousFile) {
        queryClient.setQueryData(queryKeys.drive.file(fileId), {
          ...previousFile,
          name: newName,
        })
      }

      return { previousFile }
    },
    onError: (_err, { fileId }, context) => {
      // Rollback on error
      if (context?.previousFile) {
        queryClient.setQueryData(queryKeys.drive.file(fileId), context.previousFile)
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all })
    },
  })
}

/**
 * Hook for toggling file star status
 */
export function useToggleStar() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: async ({ fileId, starred }: { fileId: string; starred: boolean }) => {
      return executeWithRetry(() => DriveService.toggleStar(fileId, starred))
    },
    onMutate: async ({ fileId, starred }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.drive.file(fileId) })

      // Snapshot previous value
      const previousFile = queryClient.getQueryData<ParsedDriveFile>(
        queryKeys.drive.file(fileId)
      )

      // Optimistically update
      if (previousFile) {
        queryClient.setQueryData(queryKeys.drive.file(fileId), {
          ...previousFile,
          isStarred: starred,
        })
      }

      return { previousFile }
    },
    onError: (_err, { fileId }, context) => {
      // Rollback on error
      if (context?.previousFile) {
        queryClient.setQueryData(queryKeys.drive.file(fileId), context.previousFile)
      }
    },
    onSettled: () => {
      // Refetch starred files list
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.starred() })
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all })
    },
  })
}

/**
 * Hook for trashing files
 */
export function useTrashFile() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: (fileId: string) =>
      executeWithRetry(() => DriveService.trashFile(fileId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all })
    },
  })
}

/**
 * Hook for permanently deleting files
 */
export function useDeleteFile() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useMutation({
    mutationFn: (fileId: string) =>
      executeWithRetry(() => DriveService.deleteFile(fileId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.drive.all })
    },
  })
}

/**
 * Hook to prefetch a file (for hover optimization)
 */
export function usePrefetchFile() {
  const queryClient = useQueryClient()
  const { executeWithRetry } = useGoogleApi()

  return useCallback(
    (fileId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.drive.file(fileId),
        queryFn: () => executeWithRetry(() => DriveService.getFile(fileId)),
        staleTime: 60 * 1000,
      })
    },
    [queryClient, executeWithRetry]
  )
}
