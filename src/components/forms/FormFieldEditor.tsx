import type { WebFormField } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, X } from 'lucide-react'

interface FormFieldEditorProps {
  field: WebFormField
  onUpdate: (updates: Partial<WebFormField>) => void
  onDelete: () => void
}

const LEAD_FIELD_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Title' },
]

const WIDTH_OPTIONS = [
  { value: '100%', label: 'Full Width' },
  { value: '50%', label: 'Half Width' },
  { value: '33%', label: 'Third Width' },
]

export function FormFieldEditor({ field, onUpdate, onDelete }: FormFieldEditorProps) {
  const hasOptions = field.field_type === 'select' || field.field_type === 'radio'
  const options = (field.options as { label: string; value: string }[]) || []

  function addOption() {
    const newOptions = [...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }]
    onUpdate({ options: newOptions })
  }

  function updateOption(index: number, key: 'label' | 'value', value: string) {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [key]: value }
    onUpdate({ options: newOptions })
  }

  function removeOption(index: number) {
    const newOptions = options.filter((_, i) => i !== index)
    onUpdate({ options: newOptions })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Edit Field</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>

      {/* Label */}
      <div>
        <label className="text-sm font-medium mb-1 block">Label</label>
        <Input
          value={field.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Field label"
        />
      </div>

      {/* Name/ID */}
      <div>
        <label className="text-sm font-medium mb-1 block">Field Name (ID)</label>
        <Input
          value={field.name}
          onChange={(e) => onUpdate({ name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
          placeholder="field_name"
        />
        <p className="text-xs text-muted-foreground mt-1">Used in form data. Letters, numbers, underscores only.</p>
      </div>

      {/* Placeholder */}
      {field.field_type !== 'checkbox' && field.field_type !== 'radio' && field.field_type !== 'hidden' && (
        <div>
          <label className="text-sm font-medium mb-1 block">Placeholder</label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value || null })}
            placeholder="Placeholder text"
          />
        </div>
      )}

      {/* Help Text */}
      <div>
        <label className="text-sm font-medium mb-1 block">Help Text</label>
        <Input
          value={field.help_text || ''}
          onChange={(e) => onUpdate({ help_text: e.target.value || null })}
          placeholder="Additional help text"
        />
      </div>

      {/* Default Value */}
      <div>
        <label className="text-sm font-medium mb-1 block">Default Value</label>
        <Input
          value={field.default_value || ''}
          onChange={(e) => onUpdate({ default_value: e.target.value || null })}
          placeholder="Default value"
        />
      </div>

      {/* Options for select/radio */}
      {hasOptions && (
        <div>
          <label className="text-sm font-medium mb-1 block">Options</label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(index, 'label', e.target.value)}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={option.value}
                  onChange={(e) => updateOption(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
                <Button variant="ghost" size="sm" onClick={() => removeOption(index)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addOption} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Required */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="required"
          checked={field.is_required}
          onChange={(e) => onUpdate({ is_required: e.target.checked })}
          className="rounded border-gray-300"
        />
        <label htmlFor="required" className="text-sm">Required field</label>
      </div>

      {/* Validation */}
      {(field.field_type === 'text' || field.field_type === 'textarea') && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Min Length</label>
              <Input
                type="number"
                value={field.min_length || ''}
                onChange={(e) => onUpdate({ min_length: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Length</label>
              <Input
                type="number"
                value={field.max_length || ''}
                onChange={(e) => onUpdate({ max_length: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="255"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Validation Pattern (Regex)</label>
            <Input
              value={field.pattern || ''}
              onChange={(e) => onUpdate({ pattern: e.target.value || null })}
              placeholder="^[a-zA-Z]+$"
            />
          </div>

          {field.pattern && (
            <div>
              <label className="text-sm font-medium mb-1 block">Pattern Error Message</label>
              <Input
                value={field.pattern_error_message || ''}
                onChange={(e) => onUpdate({ pattern_error_message: e.target.value || null })}
                placeholder="Please enter a valid value"
              />
            </div>
          )}
        </>
      )}

      {/* Width */}
      <div>
        <label className="text-sm font-medium mb-1 block">Width</label>
        <select
          value={field.width || '100%'}
          onChange={(e) => onUpdate({ width: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {WIDTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lead Field Mapping */}
      <div>
        <label className="text-sm font-medium mb-1 block">Map to Lead Field</label>
        <select
          value={field.lead_field_mapping || ''}
          onChange={(e) => onUpdate({ lead_field_mapping: e.target.value || null })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {LEAD_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Maps this field's value to the lead record.
        </p>
      </div>
    </div>
  )
}
