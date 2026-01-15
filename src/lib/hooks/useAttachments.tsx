import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, type Attachment, type AttachmentInsert, type EntityType, type StorageQuota } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

const STORAGE_BUCKET = 'attachments'

interface UseAttachmentsOptions {
  entityType: EntityType
  entityId: string
  pageSize?: number
}

interface UseAttachmentsReturn {
  attachments: Attachment[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: string | null
  uploading: boolean
  uploadProgress: number
  loadMore: () => Promise<void>
  uploadFile: (file: File, description?: string) => Promise<Attachment | null>
  linkDriveFile: (driveFile: DriveFileInfo) => Promise<Attachment | null>
  linkExternalUrl: (url: string, fileName: string, description?: string) => Promise<Attachment | null>
  deleteAttachment: (attachmentId: string) => Promise<boolean>
  updateDescription: (attachmentId: string, description: string) => Promise<boolean>
  refresh: () => Promise<void>
  getDownloadUrl: (attachment: Attachment) => Promise<string | null>
}

interface DriveFileInfo {
  id: string
  name: string
  mimeType?: string
  size?: number
  webViewLink?: string
}

export function useAttachments(options: UseAttachmentsOptions): UseAttachmentsReturn {
  const { entityType, entityId, pageSize = 20 } = options
  const { user } = useAuth()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchAttachments = useCallback(async (offset = 0, append = false) => {
    if (!user?.tenantId || !entityId) {
      setLoading(false)
      return
    }

    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('attachments')
        .select('*, users(full_name)')
        .eq('tenant_id', user.tenantId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('parent_attachment_id', null) // Only get latest versions
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (fetchError) throw fetchError

      const newAttachments = data || []
      setHasMore(newAttachments.length === pageSize)

      if (append) {
        setAttachments(prev => [...prev, ...newAttachments])
      } else {
        setAttachments(newAttachments)
      }
    } catch (err) {
      console.error('Error fetching attachments:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch attachments')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [user?.tenantId, entityType, entityId, pageSize])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    await fetchAttachments(attachments.length, true)
  }, [attachments.length, loadingMore, hasMore, fetchAttachments])

  const uploadFile = useCallback(async (file: File, description?: string): Promise<Attachment | null> => {
    if (!user?.tenantId) return null

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Generate unique path for the file
      const timestamp = Date.now()
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${user.tenantId}/${entityType}/${entityId}/${timestamp}_${sanitizedFileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      setUploadProgress(80)

      // Create attachment record
      const attachmentData: AttachmentInsert = {
        tenant_id: user.tenantId,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_size: file.size,
        file_mime_type: file.type,
        storage_type: 'supabase',
        storage_path: storagePath,
        description,
      }

      const { data, error: insertError } = await supabase
        .from('attachments')
        .insert(attachmentData)
        .select('*, users(full_name)')
        .single()

      if (insertError) throw insertError

      setUploadProgress(100)
      return data
    } catch (err) {
      console.error('Error uploading file:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [user?.tenantId, user?.id, entityType, entityId])

  const linkDriveFile = useCallback(async (driveFile: DriveFileInfo): Promise<Attachment | null> => {
    if (!user?.tenantId) return null

    try {
      const attachmentData: AttachmentInsert = {
        tenant_id: user.tenantId,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        file_name: driveFile.name,
        file_size: driveFile.size || null,
        file_mime_type: driveFile.mimeType || null,
        storage_type: 'google_drive',
        drive_file_id: driveFile.id,
        external_url: driveFile.webViewLink || null,
      }

      const { data, error: insertError } = await supabase
        .from('attachments')
        .insert(attachmentData)
        .select('*, users(full_name)')
        .single()

      if (insertError) throw insertError
      return data
    } catch (err) {
      console.error('Error linking Drive file:', err)
      setError(err instanceof Error ? err.message : 'Failed to link Drive file')
      return null
    }
  }, [user?.tenantId, user?.id, entityType, entityId])

  const linkExternalUrl = useCallback(async (
    url: string,
    fileName: string,
    description?: string
  ): Promise<Attachment | null> => {
    if (!user?.tenantId) return null

    try {
      const attachmentData: AttachmentInsert = {
        tenant_id: user.tenantId,
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        file_name: fileName,
        storage_type: 'external',
        external_url: url,
        description,
      }

      const { data, error: insertError } = await supabase
        .from('attachments')
        .insert(attachmentData)
        .select('*, users(full_name)')
        .single()

      if (insertError) throw insertError
      return data
    } catch (err) {
      console.error('Error linking external URL:', err)
      setError(err instanceof Error ? err.message : 'Failed to link external URL')
      return null
    }
  }, [user?.tenantId, user?.id, entityType, entityId])

  const deleteAttachment = useCallback(async (attachmentId: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      // Get attachment to check storage path
      const attachment = attachments.find(a => a.id === attachmentId)

      // Delete from Supabase Storage if applicable
      if (attachment?.storage_type === 'supabase' && attachment.storage_path) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([attachment.storage_path])

        if (storageError) {
          console.warn('Failed to delete from storage:', storageError)
        }
      }

      // Delete attachment record
      const { error: deleteError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
      return true
    } catch (err) {
      console.error('Error deleting attachment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete attachment')
      return false
    }
  }, [user?.tenantId, attachments])

  const updateDescription = useCallback(async (attachmentId: string, description: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: updateError } = await supabase
        .from('attachments')
        .update({ description })
        .eq('id', attachmentId)
        .eq('tenant_id', user.tenantId)

      if (updateError) throw updateError

      setAttachments(prev => prev.map(a =>
        a.id === attachmentId ? { ...a, description } : a
      ))
      return true
    } catch (err) {
      console.error('Error updating description:', err)
      setError(err instanceof Error ? err.message : 'Failed to update description')
      return false
    }
  }, [user?.tenantId])

  const getDownloadUrl = useCallback(async (attachment: Attachment): Promise<string | null> => {
    if (attachment.storage_type === 'external' || attachment.storage_type === 'google_drive') {
      return attachment.external_url || null
    }

    if (attachment.storage_type === 'supabase' && attachment.storage_path) {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(attachment.storage_path, 3600) // 1 hour expiry

      return data?.signedUrl || null
    }

    return null
  }, [])

  const refresh = useCallback(async () => {
    await fetchAttachments(0, false)
  }, [fetchAttachments])

  // Initial fetch
  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  // Real-time subscription
  useEffect(() => {
    if (!user?.tenantId || !entityId) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const filter = `tenant_id=eq.${user.tenantId},entity_type=eq.${entityType},entity_id=eq.${entityId}`

    const channel = supabase
      .channel(`attachments-${entityType}-${entityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attachments',
          filter,
        },
        async (payload) => {
          // Fetch the full attachment with user info
          const { data } = await supabase
            .from('attachments')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data && !data.parent_attachment_id) {
            setAttachments(prev => [data, ...prev.filter(a => a.id !== data.id)])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attachments',
          filter,
        },
        async (payload) => {
          const { data } = await supabase
            .from('attachments')
            .select('*, users(full_name)')
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setAttachments(prev => prev.map(a => a.id === data.id ? data : a))
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'attachments',
          filter,
        },
        (payload) => {
          setAttachments(prev => prev.filter(a => a.id !== payload.old.id))
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [user?.tenantId, entityType, entityId])

  return {
    attachments,
    loading,
    loadingMore,
    hasMore,
    error,
    uploading,
    uploadProgress,
    loadMore,
    uploadFile,
    linkDriveFile,
    linkExternalUrl,
    deleteAttachment,
    updateDescription,
    refresh,
    getDownloadUrl,
  }
}

// Hook for storage quota management
export function useStorageQuota() {
  const { user } = useAuth()
  const [quota, setQuota] = useState<StorageQuota | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    const fetchQuota = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('storage_quotas')
          .select('*')
          .eq('tenant_id', user.tenantId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError
        }

        setQuota(data)
      } catch (err) {
        console.error('Error fetching storage quota:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch storage quota')
      } finally {
        setLoading(false)
      }
    }

    fetchQuota()
  }, [user?.tenantId])

  const usedPercentage = quota
    ? Math.round((quota.used_storage_bytes / quota.max_storage_bytes) * 100)
    : 0

  const remainingBytes = quota
    ? quota.max_storage_bytes - quota.used_storage_bytes
    : 0

  return {
    quota,
    loading,
    error,
    usedPercentage,
    remainingBytes,
  }
}

// Helper to format file size
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

// Helper to get file icon based on mime type
export function getFileTypeIcon(mimeType: string | null): string {
  if (!mimeType) return 'file'

  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'file-text'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table'
  if (mimeType.includes('document') || mimeType.includes('word')) return 'file-text'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive'

  return 'file'
}

// Helper to check if file can be previewed
export function canPreviewFile(mimeType: string | null): boolean {
  if (!mimeType) return false

  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf'
  )
}
