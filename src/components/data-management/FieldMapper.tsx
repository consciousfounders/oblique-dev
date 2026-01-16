// Field mapping component for data import

import { ArrowRight, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DataEntityType, FieldMapping } from '@/lib/data-management/types'
import { ENTITY_FIELDS } from '@/lib/data-management/types'

interface FieldMapperProps {
  sourceFields: string[]
  entityType: DataEntityType
  mappings: FieldMapping[]
  onMappingsChange: (mappings: FieldMapping[]) => void
}

export function FieldMapper({
  sourceFields,
  entityType,
  mappings,
  onMappingsChange,
}: FieldMapperProps) {
  const targetFields = ENTITY_FIELDS[entityType]
  const requiredFields = targetFields.filter(f => f.required)
  const mappedTargetFields = new Set(mappings.map(m => m.targetField))

  const missingRequired = requiredFields.filter(f => !mappedTargetFields.has(f.name))

  const updateMapping = (sourceField: string, targetField: string) => {
    const newMappings = mappings.filter(m => m.sourceField !== sourceField)
    if (targetField) {
      newMappings.push({
        sourceField,
        targetField,
        transform: 'trim',
      })
    }
    onMappingsChange(newMappings)
  }

  const getMappingForSource = (sourceField: string) => {
    return mappings.find(m => m.sourceField === sourceField)
  }

  const isTargetFieldMapped = (targetField: string, currentSource: string) => {
    const mapping = mappings.find(m => m.targetField === targetField)
    return mapping && mapping.sourceField !== currentSource
  }

  return (
    <div className="space-y-4">
      {/* Missing required fields warning */}
      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Missing required field mappings
            </p>
            <p className="text-yellow-700 dark:text-yellow-300">
              Please map the following required fields: {missingRequired.map(f => f.label).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Field mappings */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-sm font-medium text-muted-foreground px-2">
          <span>CSV Column</span>
          <span></span>
          <span>CRM Field</span>
        </div>

        {sourceFields.map(sourceField => {
          const mapping = getMappingForSource(sourceField)

          return (
            <div
              key={sourceField}
              className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center p-2 bg-muted/50 rounded-md"
            >
              <div className="text-sm font-medium truncate" title={sourceField}>
                {sourceField}
              </div>

              <ArrowRight className="w-4 h-4 text-muted-foreground" />

              <div className="flex items-center gap-2">
                <select
                  value={mapping?.targetField || ''}
                  onChange={(e) => updateMapping(sourceField, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">-- Skip this column --</option>
                  {targetFields.map(field => (
                    <option
                      key={field.name}
                      value={field.name}
                      disabled={isTargetFieldMapped(field.name, sourceField)}
                    >
                      {field.label}
                      {field.required ? ' *' : ''}
                      {isTargetFieldMapped(field.name, sourceField) ? ' (already mapped)' : ''}
                    </option>
                  ))}
                </select>

                {mapping && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => updateMapping(sourceField, '')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Unmapped target fields */}
      {targetFields.filter(f => !mappedTargetFields.has(f.name)).length > 0 && (
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground mb-2">
            Unmapped CRM fields (will be left empty):
          </p>
          <div className="flex flex-wrap gap-2">
            {targetFields
              .filter(f => !mappedTargetFields.has(f.name))
              .map(field => (
                <span
                  key={field.name}
                  className={`text-xs px-2 py-1 rounded ${
                    field.required
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-muted-foreground/20'
                  }`}
                >
                  {field.label}
                  {field.required && ' (required)'}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
