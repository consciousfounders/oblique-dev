import { useState, useEffect, useMemo } from 'react'
import { useCustomFields } from '@/lib/hooks/useCustomFields'
import type { CustomField, CustomFieldModule, PicklistOption } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'

interface CustomFieldRendererProps {
  module: CustomFieldModule
  entityId?: string
  values: Record<string, unknown>
  onChange: (values: Record<string, unknown>) => void
  readOnly?: boolean
}

export function CustomFieldRenderer({
  module,
  entityId,
  values,
  onChange,
  readOnly = false,
}: CustomFieldRendererProps) {
  const { fields, loading } = useCustomFields({ module, entityId })

  // Group fields by field_group
  const groupedFields = useMemo(() => {
    const groups: Record<string, CustomField[]> = {}
    fields.forEach(field => {
      const group = field.field_group || 'Custom Fields'
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(field)
    })
    return groups
  }, [fields])

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded" />
        <div className="h-10 bg-muted rounded" />
      </div>
    )
  }

  if (fields.length === 0) {
    return null
  }

  function handleFieldChange(fieldName: string, value: unknown) {
    onChange({ ...values, [fieldName]: value })
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedFields).map(([group, groupFields]) => (
        <div key={group}>
          <h3 className="text-sm font-medium mb-3 text-muted-foreground">{group}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {groupFields.map(field => (
              <CustomFieldInput
                key={field.id}
                field={field}
                value={values[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface CustomFieldInputProps {
  field: CustomField
  value: unknown
  onChange: (value: unknown) => void
  readOnly?: boolean
}

function CustomFieldInput({ field, value, onChange, readOnly }: CustomFieldInputProps) {
  const label = (
    <label className="text-sm font-medium mb-1 block">
      {field.label}
      {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )

  const helpText = field.description && (
    <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
  )

  switch (field.field_type) {
    case 'text':
      return (
        <div>
          {label}
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            disabled={readOnly}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
          />
          {helpText}
        </div>
      )

    case 'textarea':
      return (
        <div className="sm:col-span-2">
          {label}
          <textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.label}
            disabled={readOnly}
            rows={3}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {helpText}
        </div>
      )

    case 'number':
      return (
        <div>
          {label}
          <Input
            type="number"
            value={value !== null && value !== undefined ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
            placeholder={field.label}
            disabled={readOnly}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
          />
          {helpText}
        </div>
      )

    case 'decimal':
    case 'currency':
      return (
        <div>
          {label}
          <div className="relative">
            {field.field_type === 'currency' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {field.currency_code === 'USD' ? '$' : field.currency_code}
              </span>
            )}
            <Input
              type="number"
              step={Math.pow(10, -field.decimal_places).toString()}
              value={value !== null && value !== undefined ? String(value) : ''}
              onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder={field.label}
              disabled={readOnly}
              min={field.min_value || undefined}
              max={field.max_value || undefined}
              className={field.field_type === 'currency' ? 'pl-8' : ''}
            />
          </div>
          {helpText}
        </div>
      )

    case 'date':
      return (
        <div>
          {label}
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'datetime':
      return (
        <div>
          {label}
          <Input
            type="datetime-local"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'picklist':
      return (
        <div>
          {label}
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={readOnly}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select...</option>
            {(field.picklist_options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {helpText}
        </div>
      )

    case 'multi_picklist':
      return (
        <div>
          {label}
          <MultiPicklistInput
            options={field.picklist_options || []}
            value={(value as string[]) || []}
            onChange={onChange}
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'checkbox':
      return (
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id={`custom-field-${field.id}`}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="rounded border-input"
          />
          <label htmlFor={`custom-field-${field.id}`} className="text-sm font-medium">
            {field.label}
            {field.is_required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {field.description && (
            <span className="text-xs text-muted-foreground ml-2">({field.description})</span>
          )}
        </div>
      )

    case 'url':
      return (
        <div>
          {label}
          <Input
            type="url"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com"
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'email':
      return (
        <div>
          {label}
          <Input
            type="email"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@example.com"
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'phone':
      return (
        <div>
          {label}
          <Input
            type="tel"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="+1 (555) 123-4567"
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    case 'lookup':
      return (
        <div>
          {label}
          <LookupInput
            lookupModule={field.lookup_module!}
            value={(value as string) || ''}
            onChange={onChange}
            disabled={readOnly}
          />
          {helpText}
        </div>
      )

    default:
      return null
  }
}

interface MultiPicklistInputProps {
  options: PicklistOption[]
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
}

function MultiPicklistInput({ options, value, onChange, disabled }: MultiPicklistInputProps) {
  function toggleOption(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <input
            type="checkbox"
            checked={value.includes(option.value)}
            onChange={() => toggleOption(option.value)}
            disabled={disabled}
            className="rounded border-input"
          />
          <span className="text-sm">{option.label}</span>
          {option.color && (
            <span
              className="w-3 h-3 rounded-full ml-auto"
              style={{ backgroundColor: option.color }}
            />
          )}
        </label>
      ))}
    </div>
  )
}

interface LookupInputProps {
  lookupModule: CustomFieldModule
  value: string
  onChange: (value: unknown) => void
  disabled?: boolean
}

function LookupInput({ lookupModule, value, onChange, disabled }: LookupInputProps) {
  const { user } = useAuth()
  const [options, setOptions] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.tenantId) return

    async function fetchOptions() {
      setLoading(true)
      try {
        let query = supabase
          .from(lookupModule)
          .select('id, name')
          .eq('tenant_id', user!.tenantId)
          .order('name')
          .limit(50)

        if (search) {
          query = query.ilike('name', `%${search}%`)
        }

        const { data } = await query

        // Handle different table structures
        const mappedData = (data || []).map((item: Record<string, unknown>) => {
          if (lookupModule === 'contacts' || lookupModule === 'leads') {
            return {
              id: item.id as string,
              name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown'
            }
          }
          return {
            id: item.id as string,
            name: (item.name as string) || 'Unknown'
          }
        })

        setOptions(mappedData)
      } catch (error) {
        console.error('Error fetching lookup options:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [user?.tenantId, lookupModule, search])

  return (
    <div className="space-y-2">
      <Input
        placeholder={`Search ${lookupModule}...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={disabled}
      />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  )
}

// Component for displaying custom field values (read-only display)
interface CustomFieldDisplayProps {
  module: CustomFieldModule
  entityId: string
}

export function CustomFieldDisplay({ module, entityId }: CustomFieldDisplayProps) {
  const { fieldsWithValues, loading } = useCustomFields({ module, entityId })

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded" />
  }

  if (fieldsWithValues.length === 0) {
    return null
  }

  // Group by field_group
  const groups: Record<string, typeof fieldsWithValues> = {}
  fieldsWithValues.forEach(field => {
    const group = field.field_group || 'Custom Fields'
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(field)
  })

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, groupFields]) => (
        <div key={group}>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{group}</h4>
          <dl className="grid gap-2 sm:grid-cols-2">
            {groupFields.map(field => (
              <div key={field.id} className="space-y-1">
                <dt className="text-sm text-muted-foreground">{field.label}</dt>
                <dd className="text-sm font-medium">
                  <CustomFieldValueDisplay field={field} value={field.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}

interface CustomFieldValueDisplayProps {
  field: CustomField
  value: unknown
}

function CustomFieldValueDisplay({ field, value }: CustomFieldValueDisplayProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">-</span>
  }

  switch (field.field_type) {
    case 'checkbox':
      return <span>{value ? 'Yes' : 'No'}</span>

    case 'picklist':
      const option = field.picklist_options?.find(o => o.value === value)
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
          style={option?.color ? { backgroundColor: `${option.color}20`, color: option.color } : undefined}
        >
          {option?.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: option.color }} />}
          {option?.label || String(value)}
        </span>
      )

    case 'multi_picklist':
      const selectedOptions = (value as string[]).map(v => field.picklist_options?.find(o => o.value === v))
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((opt, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted"
              style={opt?.color ? { backgroundColor: `${opt.color}20`, color: opt.color } : undefined}
            >
              {opt?.label || (value as string[])[i]}
            </span>
          ))}
        </div>
      )

    case 'currency':
      return (
        <span>
          {field.currency_code === 'USD' ? '$' : field.currency_code + ' '}
          {Number(value).toLocaleString(undefined, { minimumFractionDigits: field.decimal_places, maximumFractionDigits: field.decimal_places })}
        </span>
      )

    case 'decimal':
      return <span>{Number(value).toLocaleString(undefined, { minimumFractionDigits: field.decimal_places, maximumFractionDigits: field.decimal_places })}</span>

    case 'date':
      return <span>{new Date(value as string).toLocaleDateString()}</span>

    case 'datetime':
      return <span>{new Date(value as string).toLocaleString()}</span>

    case 'url':
      return (
        <a href={value as string} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {value as string}
        </a>
      )

    case 'email':
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {value as string}
        </a>
      )

    case 'phone':
      return (
        <a href={`tel:${value}`} className="text-primary hover:underline">
          {value as string}
        </a>
      )

    default:
      return <span>{String(value)}</span>
  }
}
