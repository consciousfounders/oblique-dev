import { useState } from 'react'
import { useCustomFieldManager } from '@/lib/hooks/useCustomFields'
import type { CustomField, CustomFieldModule, CustomFieldType, PicklistOption } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  X,
  Type,
  AlignLeft,
  Hash,
  DollarSign,
  Calendar,
  Clock,
  List,
  CheckSquare,
  Link as LinkIcon,
  Mail,
  Phone,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

interface CustomFieldManagerProps {
  module: CustomFieldModule
}

const FIELD_TYPE_OPTIONS: { type: CustomFieldType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, description: 'Single line text' },
  { type: 'textarea', label: 'Text Area', icon: <AlignLeft className="w-4 h-4" />, description: 'Multi-line text' },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" />, description: 'Integer number' },
  { type: 'decimal', label: 'Decimal', icon: <Hash className="w-4 h-4" />, description: 'Decimal number' },
  { type: 'currency', label: 'Currency', icon: <DollarSign className="w-4 h-4" />, description: 'Monetary value' },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" />, description: 'Date only' },
  { type: 'datetime', label: 'Date & Time', icon: <Clock className="w-4 h-4" />, description: 'Date with time' },
  { type: 'picklist', label: 'Picklist', icon: <List className="w-4 h-4" />, description: 'Single select dropdown' },
  { type: 'multi_picklist', label: 'Multi-Picklist', icon: <List className="w-4 h-4" />, description: 'Multi-select dropdown' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" />, description: 'Yes/No toggle' },
  { type: 'url', label: 'URL', icon: <LinkIcon className="w-4 h-4" />, description: 'Web address' },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" />, description: 'Email address' },
  { type: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" />, description: 'Phone number' },
  { type: 'lookup', label: 'Lookup', icon: <Search className="w-4 h-4" />, description: 'Link to other record' },
]

const MODULE_LABELS: Record<CustomFieldModule, string> = {
  accounts: 'Accounts',
  contacts: 'Contacts',
  leads: 'Leads',
  deals: 'Deals',
}

interface FieldFormState {
  name: string
  label: string
  description: string
  field_type: CustomFieldType
  is_required: boolean
  is_unique: boolean
  default_value: string
  min_value: string
  max_value: string
  decimal_places: number
  currency_code: string
  min_length: string
  max_length: string
  pattern: string
  pattern_error_message: string
  picklist_options: PicklistOption[]
  lookup_module: CustomFieldModule | ''
  field_group: string
}

const initialFormState: FieldFormState = {
  name: '',
  label: '',
  description: '',
  field_type: 'text',
  is_required: false,
  is_unique: false,
  default_value: '',
  min_value: '',
  max_value: '',
  decimal_places: 2,
  currency_code: 'USD',
  min_length: '',
  max_length: '',
  pattern: '',
  pattern_error_message: '',
  picklist_options: [],
  lookup_module: '',
  field_group: '',
}

export function CustomFieldManager({ module }: CustomFieldManagerProps) {
  const { fields, loading, createField, updateField, deleteField, reorderFields } = useCustomFieldManager(module)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [formState, setFormState] = useState<FieldFormState>(initialFormState)
  const [saving, setSaving] = useState(false)
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null)

  function resetForm() {
    setFormState(initialFormState)
    setShowCreateForm(false)
    setEditingField(null)
  }

  function startEdit(field: CustomField) {
    setFormState({
      name: field.name,
      label: field.label,
      description: field.description || '',
      field_type: field.field_type,
      is_required: field.is_required,
      is_unique: field.is_unique,
      default_value: field.default_value || '',
      min_value: field.min_value?.toString() || '',
      max_value: field.max_value?.toString() || '',
      decimal_places: field.decimal_places,
      currency_code: field.currency_code,
      min_length: field.min_length?.toString() || '',
      max_length: field.max_length?.toString() || '',
      pattern: field.pattern || '',
      pattern_error_message: field.pattern_error_message || '',
      picklist_options: field.picklist_options || [],
      lookup_module: field.lookup_module || '',
      field_group: field.field_group || '',
    })
    setEditingField(field)
    setShowCreateForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const fieldData = {
        module,
        name: formState.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        label: formState.label,
        description: formState.description || undefined,
        field_type: formState.field_type,
        is_required: formState.is_required,
        is_unique: formState.is_unique,
        default_value: formState.default_value || undefined,
        min_value: formState.min_value ? parseFloat(formState.min_value) : undefined,
        max_value: formState.max_value ? parseFloat(formState.max_value) : undefined,
        decimal_places: formState.decimal_places,
        currency_code: formState.currency_code,
        min_length: formState.min_length ? parseInt(formState.min_length) : undefined,
        max_length: formState.max_length ? parseInt(formState.max_length) : undefined,
        pattern: formState.pattern || undefined,
        pattern_error_message: formState.pattern_error_message || undefined,
        picklist_options: formState.picklist_options.length > 0 ? formState.picklist_options : undefined,
        lookup_module: formState.lookup_module || undefined,
        field_group: formState.field_group || undefined,
      }

      if (editingField) {
        const result = await updateField(editingField.id, fieldData)
        if (result) {
          toast.success('Field updated successfully')
          resetForm()
        }
      } else {
        const result = await createField(fieldData)
        if (result) {
          toast.success('Field created successfully')
          resetForm()
        }
      }
    } catch (error) {
      console.error('Error saving field:', error)
      toast.error('Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(field: CustomField) {
    if (!confirm(`Are you sure you want to delete the "${field.label}" field? This will also delete all values stored for this field.`)) {
      return
    }

    const result = await deleteField(field.id)
    if (result) {
      toast.success('Field deleted successfully')
    }
  }

  function handleDragStart(index: number) {
    setDraggedFieldIndex(index)
  }

  async function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedFieldIndex === null || draggedFieldIndex === index) return

    const newFields = [...fields]
    const draggedField = newFields[draggedFieldIndex]
    newFields.splice(draggedFieldIndex, 1)
    newFields.splice(index, 0, draggedField)

    setDraggedFieldIndex(index)
    await reorderFields(newFields.map(f => f.id))
  }

  function handleDragEnd() {
    setDraggedFieldIndex(null)
  }

  function addPicklistOption() {
    setFormState({
      ...formState,
      picklist_options: [
        ...formState.picklist_options,
        { label: `Option ${formState.picklist_options.length + 1}`, value: `option_${formState.picklist_options.length + 1}` },
      ],
    })
  }

  function updatePicklistOption(index: number, key: keyof PicklistOption, value: string | boolean) {
    const newOptions = [...formState.picklist_options]
    newOptions[index] = { ...newOptions[index], [key]: value }
    setFormState({ ...formState, picklist_options: newOptions })
  }

  function removePicklistOption(index: number) {
    setFormState({
      ...formState,
      picklist_options: formState.picklist_options.filter((_, i) => i !== index),
    })
  }

  const showNumberValidation = ['number', 'decimal', 'currency'].includes(formState.field_type)
  const showTextValidation = ['text', 'textarea'].includes(formState.field_type)
  const showPicklistOptions = ['picklist', 'multi_picklist'].includes(formState.field_type)
  const showLookupModule = formState.field_type === 'lookup'

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Custom Fields for {MODULE_LABELS[module]}</h2>
          <p className="text-sm text-muted-foreground">
            Add custom fields to capture additional data specific to your business
          </p>
        </div>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        )}
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingField ? 'Edit Field' : 'Create New Field'}</CardTitle>
            <CardDescription>
              {editingField ? 'Update the field configuration' : 'Configure your new custom field'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field Type Selection */}
              {!editingField && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Field Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {FIELD_TYPE_OPTIONS.map(({ type, label, icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormState({ ...formState, field_type: type })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                          formState.field_type === type
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Label *</label>
                  <Input
                    value={formState.label}
                    onChange={(e) => setFormState({ ...formState, label: e.target.value })}
                    placeholder="e.g., Customer Type"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">API Name *</label>
                  <Input
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    placeholder="e.g., customer_type"
                    required
                    disabled={!!editingField}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lowercase letters, numbers, and underscores only
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Input
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Help text for this field"
                />
              </div>

              {/* Picklist Options */}
              {showPicklistOptions && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Options</label>
                  <div className="space-y-2">
                    {formState.picklist_options.map((option, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={option.label}
                          onChange={(e) => updatePicklistOption(index, 'label', e.target.value)}
                          placeholder="Label"
                          className="flex-1"
                        />
                        <Input
                          value={option.value}
                          onChange={(e) => updatePicklistOption(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1"
                        />
                        <Input
                          type="color"
                          value={option.color || '#3b82f6'}
                          onChange={(e) => updatePicklistOption(index, 'color', e.target.value)}
                          className="w-12 h-9 p-1"
                          title="Option color"
                        />
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={option.is_default || false}
                            onChange={(e) => updatePicklistOption(index, 'is_default', e.target.checked)}
                            className="rounded"
                          />
                          Default
                        </label>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePicklistOption(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPicklistOption}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {/* Lookup Module */}
              {showLookupModule && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Lookup Module</label>
                  <select
                    value={formState.lookup_module}
                    onChange={(e) => setFormState({ ...formState, lookup_module: e.target.value as CustomFieldModule | '' })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select a module...</option>
                    {Object.entries(MODULE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Number Validation */}
              {showNumberValidation && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Value</label>
                    <Input
                      type="number"
                      value={formState.min_value}
                      onChange={(e) => setFormState({ ...formState, min_value: e.target.value })}
                      placeholder="No minimum"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Value</label>
                    <Input
                      type="number"
                      value={formState.max_value}
                      onChange={(e) => setFormState({ ...formState, max_value: e.target.value })}
                      placeholder="No maximum"
                    />
                  </div>
                  {formState.field_type !== 'number' && (
                    <div>
                      <label className="text-sm font-medium mb-1 block">Decimal Places</label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={formState.decimal_places}
                        onChange={(e) => setFormState({ ...formState, decimal_places: parseInt(e.target.value) || 2 })}
                      />
                    </div>
                  )}
                </div>
              )}

              {formState.field_type === 'currency' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Currency Code</label>
                  <Input
                    value={formState.currency_code}
                    onChange={(e) => setFormState({ ...formState, currency_code: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    maxLength={3}
                    className="w-24"
                  />
                </div>
              )}

              {/* Text Validation */}
              {showTextValidation && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Min Length</label>
                    <Input
                      type="number"
                      value={formState.min_length}
                      onChange={(e) => setFormState({ ...formState, min_length: e.target.value })}
                      placeholder="No minimum"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Max Length</label>
                    <Input
                      type="number"
                      value={formState.max_length}
                      onChange={(e) => setFormState({ ...formState, max_length: e.target.value })}
                      placeholder="No maximum"
                    />
                  </div>
                </div>
              )}

              {showTextValidation && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Validation Pattern (Regex)</label>
                    <Input
                      value={formState.pattern}
                      onChange={(e) => setFormState({ ...formState, pattern: e.target.value })}
                      placeholder="^[a-zA-Z]+$"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pattern Error Message</label>
                    <Input
                      value={formState.pattern_error_message}
                      onChange={(e) => setFormState({ ...formState, pattern_error_message: e.target.value })}
                      placeholder="Please enter a valid value"
                    />
                  </div>
                </div>
              )}

              {/* Default Value */}
              <div>
                <label className="text-sm font-medium mb-1 block">Default Value</label>
                <Input
                  value={formState.default_value}
                  onChange={(e) => setFormState({ ...formState, default_value: e.target.value })}
                  placeholder="Optional default value"
                />
              </div>

              {/* Field Group */}
              <div>
                <label className="text-sm font-medium mb-1 block">Field Group</label>
                <Input
                  value={formState.field_group}
                  onChange={(e) => setFormState({ ...formState, field_group: e.target.value })}
                  placeholder="e.g., Additional Info"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Group related fields together in forms
                </p>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.is_required}
                    onChange={(e) => setFormState({ ...formState, is_required: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Required field</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formState.is_unique}
                    onChange={(e) => setFormState({ ...formState, is_unique: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Unique value</span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingField ? 'Update Field' : 'Create Field'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Fields List */}
      {fields.length === 0 && !showCreateForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No custom fields yet. Click "Add Field" to create your first custom field.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-4 border rounded-lg bg-background transition-colors ${
                draggedFieldIndex === index ? 'opacity-50' : 'hover:bg-muted/50'
              }`}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{field.label}</span>
                  {field.is_required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                  {!field.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Inactive</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{FIELD_TYPE_OPTIONS.find(t => t.type === field.field_type)?.label || field.field_type}</span>
                  <span className="text-muted-foreground/50">|</span>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">{field.name}</code>
                  {field.field_group && (
                    <>
                      <span className="text-muted-foreground/50">|</span>
                      <span className="text-xs">{field.field_group}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(field)}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(field)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
