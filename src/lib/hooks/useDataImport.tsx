// Hook for data import operations

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type {
  DataEntityType,
  ImportConfig,
  ImportResult,
  ImportError,
  ImportPreview,
  FieldMapping,
} from '@/lib/data-management/types'
import {
  parseFile,
  generateImportPreview,
  mapRowToEntity,
  validateRow,
  getUniqueFields,
} from '@/lib/data-management/csv-parser'

interface ImportState {
  file: File | null
  preview: ImportPreview | null
  config: ImportConfig | null
  isLoading: boolean
  isImporting: boolean
  progress: { current: number; total: number; status: string }
  result: ImportResult | null
  error: string | null
}

const initialState: ImportState = {
  file: null,
  preview: null,
  config: null,
  isLoading: false,
  isImporting: false,
  progress: { current: 0, total: 0, status: '' },
  result: null,
  error: null,
}

export function useDataImport() {
  const { user } = useAuth()
  const [state, setState] = useState<ImportState>(initialState)

  // Reset state
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  // Set file and generate preview
  const setFile = useCallback(async (file: File, entityType: DataEntityType) => {
    if (!file) return

    setState(prev => ({ ...prev, file, isLoading: true, error: null }))

    try {
      const content = await file.text()
      const preview = await generateImportPreview(
        content,
        entityType,
        100,
        (progress) => setState(prev => ({ ...prev, progress }))
      )

      const config: ImportConfig = {
        entityType,
        fieldMappings: preview.suggestedMappings,
        duplicateHandling: 'skip',
        duplicateCheckFields: getUniqueFields(entityType),
      }

      setState(prev => ({
        ...prev,
        preview,
        config,
        isLoading: false,
        progress: { current: 0, total: 0, status: '' },
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to parse file',
      }))
    }
  }, [])

  // Update field mappings
  const updateFieldMappings = useCallback((mappings: FieldMapping[]) => {
    setState(prev => {
      if (!prev.config) return prev
      return {
        ...prev,
        config: { ...prev.config, fieldMappings: mappings },
      }
    })
  }, [])

  // Update duplicate handling
  const setDuplicateHandling = useCallback((handling: ImportConfig['duplicateHandling']) => {
    setState(prev => {
      if (!prev.config) return prev
      return {
        ...prev,
        config: { ...prev.config, duplicateHandling: handling },
      }
    })
  }, [])

  // Check for duplicates in database
  const checkDuplicate = useCallback(async (
    entityType: DataEntityType,
    record: Record<string, unknown>,
    checkFields: string[]
  ): Promise<boolean> => {
    if (!user?.tenantId || checkFields.length === 0) return false

    for (const field of checkFields) {
      const value = record[field]
      if (!value) continue

      const { data, error } = await supabase
        .from(entityType)
        .select('id')
        .eq('tenant_id', user.tenantId)
        .eq(field, value)
        .limit(1)

      if (!error && data && data.length > 0) {
        return true
      }
    }

    return false
  }, [user?.tenantId])

  // Execute import
  const executeImport = useCallback(async (): Promise<ImportResult | null> => {
    if (!state.file || !state.config || !state.preview || !user?.tenantId) {
      setState(prev => ({ ...prev, error: 'Missing required data for import' }))
      return null
    }

    setState(prev => ({
      ...prev,
      isImporting: true,
      error: null,
      progress: { current: 0, total: state.preview?.totalRows || 0, status: 'Starting import...' },
    }))

    const { config } = state
    const errors: ImportError[] = []
    let success = 0
    let failed = 0
    let duplicates = 0

    try {
      // Parse the full file
      const content = await state.file.text()
      const { headers, rows } = await parseFile({ text: () => Promise.resolve(content) } as File)

      const totalRows = rows.length

      // Process in batches
      const batchSize = 50
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, Math.min(i + batchSize, rows.length))
        const recordsToInsert: Record<string, unknown>[] = []

        for (let j = 0; j < batch.length; j++) {
          const rowIndex = i + j
          const row = batch[j]

          // Convert row to object
          const rowData: Record<string, string> = {}
          headers.forEach((header, idx) => {
            rowData[header] = row[idx] || ''
          })

          // Validate row
          const rowErrors = validateRow(rowData, config.entityType, config.fieldMappings)
          if (rowErrors.length > 0) {
            errors.push({
              row: rowIndex + 2,
              message: rowErrors.join('; '),
              data: rowData,
            })
            failed++
            continue
          }

          // Map to entity
          const record = mapRowToEntity(rowData, config.fieldMappings)

          // Check for duplicates
          if (config.duplicateCheckFields.length > 0) {
            const isDuplicate = await checkDuplicate(
              config.entityType,
              record,
              config.duplicateCheckFields
            )

            if (isDuplicate) {
              if (config.duplicateHandling === 'skip') {
                duplicates++
                continue
              } else if (config.duplicateHandling === 'update') {
                // Update existing record
                const uniqueField = config.duplicateCheckFields[0]
                const uniqueValue = record[uniqueField]

                const { error } = await supabase
                  .from(config.entityType)
                  .update(record)
                  .eq('tenant_id', user.tenantId)
                  .eq(uniqueField, uniqueValue)

                if (error) {
                  errors.push({
                    row: rowIndex + 2,
                    message: error.message,
                    data: rowData,
                  })
                  failed++
                } else {
                  success++
                }
                continue
              }
              // 'create_new' falls through to normal insert
            }
          }

          recordsToInsert.push({
            ...record,
            tenant_id: user.tenantId,
            owner_id: user.id,
          })
        }

        // Bulk insert batch
        if (recordsToInsert.length > 0) {
          const { error, data } = await supabase
            .from(config.entityType)
            .insert(recordsToInsert)
            .select()

          if (error) {
            // If bulk insert fails, try one by one
            for (const record of recordsToInsert) {
              const { error: singleError } = await supabase
                .from(config.entityType)
                .insert(record)

              if (singleError) {
                errors.push({
                  row: i + 2,
                  message: singleError.message,
                })
                failed++
              } else {
                success++
              }
            }
          } else {
            success += data?.length || recordsToInsert.length
          }
        }

        // Update progress
        setState(prev => ({
          ...prev,
          progress: {
            current: Math.min(i + batchSize, totalRows),
            total: totalRows,
            status: `Importing... ${Math.min(i + batchSize, totalRows)}/${totalRows} rows`,
          },
        }))
      }

      const result: ImportResult = {
        jobId: crypto.randomUUID(),
        success,
        failed,
        duplicates,
        errors,
      }

      setState(prev => ({
        ...prev,
        isImporting: false,
        result,
        progress: { current: totalRows, total: totalRows, status: 'Complete' },
      }))

      return result
    } catch (error) {
      setState(prev => ({
        ...prev,
        isImporting: false,
        error: error instanceof Error ? error.message : 'Import failed',
      }))
      return null
    }
  }, [state.file, state.config, state.preview, user?.tenantId, user?.id, checkDuplicate])

  return {
    // State
    file: state.file,
    preview: state.preview,
    config: state.config,
    isLoading: state.isLoading,
    isImporting: state.isImporting,
    progress: state.progress,
    result: state.result,
    error: state.error,

    // Actions
    setFile,
    updateFieldMappings,
    setDuplicateHandling,
    executeImport,
    reset,
  }
}
