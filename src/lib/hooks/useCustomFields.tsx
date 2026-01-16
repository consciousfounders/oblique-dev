import { useState, useEffect, useCallback } from 'react'
import { supabase, type CustomField, type CustomFieldModule, type CustomFieldType, type PicklistOption } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface CustomFieldWithValue extends CustomField {
  value: unknown
  lookup_value_id: string | null
}

interface UseCustomFieldsOptions {
  module: CustomFieldModule
  entityId?: string
}

interface UseCustomFieldsReturn {
  fields: CustomField[]
  fieldsWithValues: CustomFieldWithValue[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  saveValues: (values: Record<string, { value: unknown; lookup_value_id?: string | null }>) => Promise<boolean>
}

export function useCustomFields(options: UseCustomFieldsOptions): UseCustomFieldsReturn {
  const { module, entityId } = options
  const { user } = useAuth()
  const [fields, setFields] = useState<CustomField[]>([])
  const [fieldsWithValues, setFieldsWithValues] = useState<CustomFieldWithValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFields = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch custom fields for the module
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('module', module)
        .eq('is_active', true)
        .order('position', { ascending: true })

      if (fieldsError) throw fieldsError

      const customFields = (fieldsData || []) as CustomField[]
      setFields(customFields)

      // If we have an entity ID, also fetch values
      if (entityId && customFields.length > 0) {
        const { data: valuesData, error: valuesError } = await supabase
          .from('custom_field_values')
          .select('*')
          .eq('tenant_id', user.tenantId)
          .eq('entity_id', entityId)
          .eq('module', module)

        if (valuesError) throw valuesError

        // Map values to fields
        const valuesMap = new Map(
          (valuesData || []).map(v => [v.field_id, v])
        )

        const withValues: CustomFieldWithValue[] = customFields.map(field => ({
          ...field,
          value: valuesMap.get(field.id)?.value ?? getDefaultValue(field),
          lookup_value_id: valuesMap.get(field.id)?.lookup_value_id ?? null,
        }))

        setFieldsWithValues(withValues)
      } else {
        // No entity, use default values
        const withDefaults: CustomFieldWithValue[] = customFields.map(field => ({
          ...field,
          value: getDefaultValue(field),
          lookup_value_id: null,
        }))
        setFieldsWithValues(withDefaults)
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch custom fields')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, module, entityId])

  const saveValues = useCallback(async (
    values: Record<string, { value: unknown; lookup_value_id?: string | null }>
  ): Promise<boolean> => {
    if (!user?.tenantId || !entityId) return false

    try {
      // Prepare the values for upsert
      const fieldValuePairs = Object.entries(values).map(([fieldId, data]) => ({
        tenant_id: user.tenantId,
        field_id: fieldId,
        entity_id: entityId,
        module,
        value: data.value,
        lookup_value_id: data.lookup_value_id || null,
      }))

      // Use upsert to handle both insert and update
      const { error: upsertError } = await supabase
        .from('custom_field_values')
        .upsert(fieldValuePairs, {
          onConflict: 'field_id,entity_id',
        })

      if (upsertError) throw upsertError

      // Refresh the data
      await fetchFields()
      return true
    } catch (err) {
      console.error('Error saving custom field values:', err)
      setError(err instanceof Error ? err.message : 'Failed to save custom field values')
      return false
    }
  }, [user?.tenantId, entityId, module, fetchFields])

  const refresh = useCallback(async () => {
    await fetchFields()
  }, [fetchFields])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  return {
    fields,
    fieldsWithValues,
    loading,
    error,
    refresh,
    saveValues,
  }
}

// Hook for managing custom field definitions (admin only)
interface UseCustomFieldManagerReturn {
  fields: CustomField[]
  loading: boolean
  error: string | null
  createField: (field: CreateCustomFieldInput) => Promise<CustomField | null>
  updateField: (fieldId: string, updates: Partial<CustomField>) => Promise<CustomField | null>
  deleteField: (fieldId: string) => Promise<boolean>
  reorderFields: (fieldIds: string[]) => Promise<boolean>
  refresh: () => Promise<void>
}

interface CreateCustomFieldInput {
  module: CustomFieldModule
  name: string
  label: string
  description?: string
  field_type: CustomFieldType
  is_required?: boolean
  is_unique?: boolean
  default_value?: string
  min_value?: number
  max_value?: number
  decimal_places?: number
  currency_code?: string
  min_length?: number
  max_length?: number
  pattern?: string
  pattern_error_message?: string
  picklist_options?: PicklistOption[]
  allow_multiple?: boolean
  lookup_module?: CustomFieldModule
  visible_to_roles?: string[]
  editable_by_roles?: string[]
  field_group?: string
}

export function useCustomFieldManager(module: CustomFieldModule): UseCustomFieldManagerReturn {
  const { user } = useAuth()
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFields = useCallback(async () => {
    if (!user?.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('module', module)
        .order('position', { ascending: true })

      if (fetchError) throw fetchError
      setFields((data || []) as CustomField[])
    } catch (err) {
      console.error('Error fetching custom fields:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch custom fields')
    } finally {
      setLoading(false)
    }
  }, [user?.tenantId, module])

  const createField = useCallback(async (input: CreateCustomFieldInput): Promise<CustomField | null> => {
    if (!user?.tenantId) return null

    try {
      // Get the next position
      const maxPosition = fields.length > 0
        ? Math.max(...fields.map(f => f.position))
        : -1

      const { data, error: insertError } = await supabase
        .from('custom_fields')
        .insert({
          tenant_id: user.tenantId,
          created_by: user.id,
          position: maxPosition + 1,
          ...input,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const newField = data as CustomField
      setFields(prev => [...prev, newField])
      return newField
    } catch (err) {
      console.error('Error creating custom field:', err)
      setError(err instanceof Error ? err.message : 'Failed to create custom field')
      return null
    }
  }, [user?.tenantId, user?.id, fields])

  const updateField = useCallback(async (
    fieldId: string,
    updates: Partial<CustomField>
  ): Promise<CustomField | null> => {
    if (!user?.tenantId) return null

    try {
      const { data, error: updateError } = await supabase
        .from('custom_fields')
        .update(updates)
        .eq('id', fieldId)
        .eq('tenant_id', user.tenantId)
        .select()
        .single()

      if (updateError) throw updateError

      const updatedField = data as CustomField
      setFields(prev => prev.map(f => f.id === fieldId ? updatedField : f))
      return updatedField
    } catch (err) {
      console.error('Error updating custom field:', err)
      setError(err instanceof Error ? err.message : 'Failed to update custom field')
      return null
    }
  }, [user?.tenantId])

  const deleteField = useCallback(async (fieldId: string): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      const { error: deleteError } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId)
        .eq('tenant_id', user.tenantId)

      if (deleteError) throw deleteError

      setFields(prev => prev.filter(f => f.id !== fieldId))
      return true
    } catch (err) {
      console.error('Error deleting custom field:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete custom field')
      return false
    }
  }, [user?.tenantId])

  const reorderFields = useCallback(async (fieldIds: string[]): Promise<boolean> => {
    if (!user?.tenantId) return false

    try {
      // Update positions in order
      const updates = fieldIds.map((id, index) =>
        supabase
          .from('custom_fields')
          .update({ position: index })
          .eq('id', id)
          .eq('tenant_id', user.tenantId)
      )

      await Promise.all(updates)

      // Update local state
      const orderedFields = fieldIds
        .map(id => fields.find(f => f.id === id))
        .filter((f): f is CustomField => f !== undefined)
        .map((f, index) => ({ ...f, position: index }))

      setFields(orderedFields)
      return true
    } catch (err) {
      console.error('Error reordering custom fields:', err)
      setError(err instanceof Error ? err.message : 'Failed to reorder custom fields')
      return false
    }
  }, [user?.tenantId, fields])

  const refresh = useCallback(async () => {
    await fetchFields()
  }, [fetchFields])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  return {
    fields,
    loading,
    error,
    createField,
    updateField,
    deleteField,
    reorderFields,
    refresh,
  }
}

// Helper to get default value based on field type
function getDefaultValue(field: CustomField): unknown {
  if (field.default_value !== null) {
    // Parse default value based on type
    switch (field.field_type) {
      case 'number':
      case 'decimal':
      case 'currency':
        return parseFloat(field.default_value) || 0
      case 'checkbox':
        return field.default_value === 'true'
      case 'multi_picklist':
        try {
          return JSON.parse(field.default_value)
        } catch {
          return []
        }
      default:
        return field.default_value
    }
  }

  // Type-specific defaults
  switch (field.field_type) {
    case 'number':
    case 'decimal':
    case 'currency':
      return null
    case 'checkbox':
      return false
    case 'multi_picklist':
      return []
    case 'picklist':
      // Check if there's a default option
      const defaultOption = field.picklist_options?.find(o => o.is_default)
      return defaultOption?.value ?? null
    default:
      return null
  }
}

// Validation helper for custom field values
export function validateCustomFieldValue(
  field: CustomField,
  value: unknown
): { valid: boolean; error?: string } {
  // Required check
  if (field.is_required) {
    if (value === null || value === undefined || value === '' ||
        (Array.isArray(value) && value.length === 0)) {
      return { valid: false, error: `${field.label} is required` }
    }
  }

  // Skip validation for empty optional fields
  if (value === null || value === undefined || value === '') {
    return { valid: true }
  }

  switch (field.field_type) {
    case 'text':
    case 'textarea':
      const strValue = String(value)
      if (field.min_length && strValue.length < field.min_length) {
        return { valid: false, error: `${field.label} must be at least ${field.min_length} characters` }
      }
      if (field.max_length && strValue.length > field.max_length) {
        return { valid: false, error: `${field.label} must be at most ${field.max_length} characters` }
      }
      if (field.pattern) {
        const regex = new RegExp(field.pattern)
        if (!regex.test(strValue)) {
          return { valid: false, error: field.pattern_error_message || `${field.label} format is invalid` }
        }
      }
      break

    case 'number':
    case 'decimal':
    case 'currency':
      const numValue = typeof value === 'number' ? value : parseFloat(String(value))
      if (isNaN(numValue)) {
        return { valid: false, error: `${field.label} must be a number` }
      }
      if (field.min_value !== null && numValue < field.min_value) {
        return { valid: false, error: `${field.label} must be at least ${field.min_value}` }
      }
      if (field.max_value !== null && numValue > field.max_value) {
        return { valid: false, error: `${field.label} must be at most ${field.max_value}` }
      }
      break

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(value))) {
        return { valid: false, error: `${field.label} must be a valid email address` }
      }
      break

    case 'url':
      try {
        new URL(String(value))
      } catch {
        return { valid: false, error: `${field.label} must be a valid URL` }
      }
      break

    case 'phone':
      const phoneRegex = /^[\d\s\-+()]+$/
      if (!phoneRegex.test(String(value))) {
        return { valid: false, error: `${field.label} must be a valid phone number` }
      }
      break

    case 'picklist':
      if (field.picklist_options) {
        const validValues = field.picklist_options.map(o => o.value)
        if (!validValues.includes(String(value))) {
          return { valid: false, error: `${field.label} has an invalid selection` }
        }
      }
      break

    case 'multi_picklist':
      if (field.picklist_options && Array.isArray(value)) {
        const validValues = field.picklist_options.map(o => o.value)
        const invalidValue = (value as string[]).find(v => !validValues.includes(v))
        if (invalidValue) {
          return { valid: false, error: `${field.label} has an invalid selection` }
        }
      }
      break
  }

  return { valid: true }
}
