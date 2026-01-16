// Hook for data export operations

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type {
  DataEntityType,
  ExportConfig,
  ExportFilter,
} from '@/lib/data-management/types'
import {
  generateCSVContent,
  downloadCSV,
  generateExportFilename,
  getDefaultExportFields,
  getAvailableExportFields,
} from '@/lib/data-management/csv-generator'

interface ExportState {
  isExporting: boolean
  progress: { current: number; total: number; status: string }
  error: string | null
}

const initialState: ExportState = {
  isExporting: false,
  progress: { current: 0, total: 0, status: '' },
  error: null,
}

export function useDataExport() {
  const { user } = useAuth()
  const [state, setState] = useState<ExportState>(initialState)

  // Fetch records for export
  const fetchRecords = useCallback(async (
    entityType: DataEntityType,
    filters?: ExportFilter[]
  ): Promise<Record<string, unknown>[]> => {
    if (!user?.tenantId) {
      throw new Error('User not authenticated')
    }

    let query = supabase
      .from(entityType)
      .select('*')
      .eq('tenant_id', user.tenantId)

    // Apply filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.field, filter.value)
            break
          case 'neq':
            query = query.neq(filter.field, filter.value)
            break
          case 'gt':
            query = query.gt(filter.field, filter.value)
            break
          case 'gte':
            query = query.gte(filter.field, filter.value)
            break
          case 'lt':
            query = query.lt(filter.field, filter.value)
            break
          case 'lte':
            query = query.lte(filter.field, filter.value)
            break
          case 'like':
            query = query.ilike(filter.field, `%${filter.value}%`)
            break
          case 'in':
            if (Array.isArray(filter.value)) {
              query = query.in(filter.field, filter.value)
            }
            break
        }
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data || []
  }, [user?.tenantId])

  // Execute export
  const executeExport = useCallback(async (config: ExportConfig): Promise<boolean> => {
    if (!user?.tenantId) {
      setState(prev => ({ ...prev, error: 'User not authenticated' }))
      return false
    }

    setState({
      isExporting: true,
      progress: { current: 0, total: 100, status: 'Fetching records...' },
      error: null,
    })

    try {
      // Fetch records
      const records = await fetchRecords(config.entityType, config.filters)

      setState(prev => ({
        ...prev,
        progress: { current: 50, total: 100, status: `Processing ${records.length} records...` },
      }))

      if (records.length === 0) {
        setState(prev => ({
          ...prev,
          isExporting: false,
          error: 'No records found to export',
        }))
        return false
      }

      // Generate CSV
      const csvContent = generateCSVContent(
        records,
        config,
        (progress) => {
          const percentage = 50 + Math.round((progress.current / progress.total) * 40)
          setState(prev => ({
            ...prev,
            progress: { current: percentage, total: 100, status: progress.status },
          }))
        }
      )

      // Download file
      const filename = generateExportFilename(config.entityType, config.format)
      downloadCSV(csvContent, filename)

      setState({
        isExporting: false,
        progress: { current: 100, total: 100, status: 'Complete' },
        error: null,
      })

      return true
    } catch (error) {
      setState({
        isExporting: false,
        progress: { current: 0, total: 0, status: '' },
        error: error instanceof Error ? error.message : 'Export failed',
      })
      return false
    }
  }, [user?.tenantId, fetchRecords])

  // Get record count for entity type
  const getRecordCount = useCallback(async (
    entityType: DataEntityType,
    filters?: ExportFilter[]
  ): Promise<number> => {
    if (!user?.tenantId) return 0

    let query = supabase
      .from(entityType)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', user.tenantId)

    // Apply filters
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        switch (filter.operator) {
          case 'eq':
            query = query.eq(filter.field, filter.value)
            break
          case 'neq':
            query = query.neq(filter.field, filter.value)
            break
          case 'like':
            query = query.ilike(filter.field, `%${filter.value}%`)
            break
        }
      }
    }

    const { count, error } = await query

    if (error) {
      console.error('Error getting record count:', error)
      return 0
    }

    return count || 0
  }, [user?.tenantId])

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return {
    // State
    isExporting: state.isExporting,
    progress: state.progress,
    error: state.error,

    // Actions
    executeExport,
    getRecordCount,
    reset,

    // Helpers
    getDefaultExportFields,
    getAvailableExportFields,
  }
}
