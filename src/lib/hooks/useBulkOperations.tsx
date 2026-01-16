// Hook for bulk data operations (update, delete, reassign, merge)

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type {
  DataEntityType,
  BulkOperationResult,
} from '@/lib/data-management/types'

interface BulkOperationState {
  isProcessing: boolean
  progress: { current: number; total: number; status: string }
  result: BulkOperationResult | null
  error: string | null
}

const initialState: BulkOperationState = {
  isProcessing: false,
  progress: { current: 0, total: 0, status: '' },
  result: null,
  error: null,
}

export function useBulkOperations() {
  const { user } = useAuth()
  const [state, setState] = useState<BulkOperationState>(initialState)

  // Bulk update records
  const bulkUpdate = useCallback(async (
    entityType: DataEntityType,
    recordIds: string[],
    updateData: Record<string, unknown>
  ): Promise<BulkOperationResult | null> => {
    if (!user?.tenantId) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return null
    }

    if (recordIds.length === 0) {
      setState(prev => ({ ...prev, error: 'No records selected' }))
      return null
    }

    setState({
      isProcessing: true,
      progress: { current: 0, total: recordIds.length, status: 'Updating records...' },
      result: null,
      error: null,
    })

    const errors: { id: string; error: string }[] = []
    let successCount = 0

    try {
      // Process in batches
      const batchSize = 50
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batchIds = recordIds.slice(i, Math.min(i + batchSize, recordIds.length))

        const { error } = await supabase
          .from(entityType)
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('tenant_id', user.tenantId)
          .in('id', batchIds)

        if (error) {
          // Try one by one if batch fails
          for (const id of batchIds) {
            const { error: singleError } = await supabase
              .from(entityType)
              .update({ ...updateData, updated_at: new Date().toISOString() })
              .eq('tenant_id', user.tenantId)
              .eq('id', id)

            if (singleError) {
              errors.push({ id, error: singleError.message })
            } else {
              successCount++
            }
          }
        } else {
          successCount += batchIds.length
        }

        setState(prev => ({
          ...prev,
          progress: {
            current: Math.min(i + batchSize, recordIds.length),
            total: recordIds.length,
            status: `Updated ${Math.min(i + batchSize, recordIds.length)}/${recordIds.length} records`,
          },
        }))
      }

      const result: BulkOperationResult = {
        operation: 'update',
        success_count: successCount,
        failure_count: recordIds.length - successCount,
        errors,
      }

      setState({
        isProcessing: false,
        progress: { current: recordIds.length, total: recordIds.length, status: 'Complete' },
        result,
        error: null,
      })

      return result
    } catch (error) {
      setState({
        isProcessing: false,
        progress: { current: 0, total: 0, status: '' },
        result: null,
        error: error instanceof Error ? error.message : 'Bulk update failed',
      })
      return null
    }
  }, [user?.tenantId])

  // Bulk delete records
  const bulkDelete = useCallback(async (
    entityType: DataEntityType,
    recordIds: string[]
  ): Promise<BulkOperationResult | null> => {
    if (!user?.tenantId) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return null
    }

    if (recordIds.length === 0) {
      setState(prev => ({ ...prev, error: 'No records selected' }))
      return null
    }

    setState({
      isProcessing: true,
      progress: { current: 0, total: recordIds.length, status: 'Deleting records...' },
      result: null,
      error: null,
    })

    const errors: { id: string; error: string }[] = []
    let successCount = 0

    try {
      // Process in batches
      const batchSize = 50
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batchIds = recordIds.slice(i, Math.min(i + batchSize, recordIds.length))

        const { error } = await supabase
          .from(entityType)
          .delete()
          .eq('tenant_id', user.tenantId)
          .in('id', batchIds)

        if (error) {
          // Try one by one if batch fails
          for (const id of batchIds) {
            const { error: singleError } = await supabase
              .from(entityType)
              .delete()
              .eq('tenant_id', user.tenantId)
              .eq('id', id)

            if (singleError) {
              errors.push({ id, error: singleError.message })
            } else {
              successCount++
            }
          }
        } else {
          successCount += batchIds.length
        }

        setState(prev => ({
          ...prev,
          progress: {
            current: Math.min(i + batchSize, recordIds.length),
            total: recordIds.length,
            status: `Deleted ${Math.min(i + batchSize, recordIds.length)}/${recordIds.length} records`,
          },
        }))
      }

      const result: BulkOperationResult = {
        operation: 'delete',
        success_count: successCount,
        failure_count: recordIds.length - successCount,
        errors,
      }

      setState({
        isProcessing: false,
        progress: { current: recordIds.length, total: recordIds.length, status: 'Complete' },
        result,
        error: null,
      })

      return result
    } catch (error) {
      setState({
        isProcessing: false,
        progress: { current: 0, total: 0, status: '' },
        result: null,
        error: error instanceof Error ? error.message : 'Bulk delete failed',
      })
      return null
    }
  }, [user?.tenantId])

  // Bulk reassign owner
  const bulkReassign = useCallback(async (
    entityType: DataEntityType,
    recordIds: string[],
    newOwnerId: string
  ): Promise<BulkOperationResult | null> => {
    return bulkUpdate(entityType, recordIds, { owner_id: newOwnerId })
  }, [bulkUpdate])

  // Merge duplicate records
  const mergeRecords = useCallback(async (
    entityType: DataEntityType,
    primaryRecordId: string,
    duplicateRecordIds: string[]
  ): Promise<BulkOperationResult | null> => {
    if (!user?.tenantId) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return null
    }

    if (!primaryRecordId || duplicateRecordIds.length === 0) {
      setState(prev => ({ ...prev, error: 'Invalid merge configuration' }))
      return null
    }

    setState({
      isProcessing: true,
      progress: { current: 0, total: duplicateRecordIds.length + 1, status: 'Merging records...' },
      result: null,
      error: null,
    })

    const errors: { id: string; error: string }[] = []
    let successCount = 0

    try {
      // Get the primary record
      const { data: primaryRecord, error: fetchError } = await supabase
        .from(entityType)
        .select('*')
        .eq('id', primaryRecordId)
        .single()

      if (fetchError || !primaryRecord) {
        throw new Error('Primary record not found')
      }

      // Update related records to point to primary
      // For contacts/leads, update activities, notes, attachments
      const relatedTables = ['activities', 'notes', 'attachments']

      for (const duplicateId of duplicateRecordIds) {
        for (const table of relatedTables) {
          await supabase
            .from(table)
            .update({ entity_id: primaryRecordId })
            .eq('entity_type', entityType.slice(0, -1)) // Remove 's' from entity type
            .eq('entity_id', duplicateId)
        }

        // Delete the duplicate record
        const { error: deleteError } = await supabase
          .from(entityType)
          .delete()
          .eq('tenant_id', user.tenantId)
          .eq('id', duplicateId)

        if (deleteError) {
          errors.push({ id: duplicateId, error: deleteError.message })
        } else {
          successCount++
        }

        setState(prev => ({
          ...prev,
          progress: {
            current: successCount + 1,
            total: duplicateRecordIds.length + 1,
            status: `Merged ${successCount}/${duplicateRecordIds.length} records`,
          },
        }))
      }

      const result: BulkOperationResult = {
        operation: 'merge',
        success_count: successCount,
        failure_count: duplicateRecordIds.length - successCount,
        errors,
      }

      setState({
        isProcessing: false,
        progress: { current: duplicateRecordIds.length + 1, total: duplicateRecordIds.length + 1, status: 'Complete' },
        result,
        error: null,
      })

      return result
    } catch (error) {
      setState({
        isProcessing: false,
        progress: { current: 0, total: 0, status: '' },
        result: null,
        error: error instanceof Error ? error.message : 'Merge failed',
      })
      return null
    }
  }, [user?.tenantId])

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    // State
    isProcessing: state.isProcessing,
    progress: state.progress,
    result: state.result,
    error: state.error,

    // Actions
    bulkUpdate,
    bulkDelete,
    bulkReassign,
    mergeRecords,
    reset,
  }
}
