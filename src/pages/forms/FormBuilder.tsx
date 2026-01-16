import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { WebForm, WebFormField, WebFormFieldType, AssignmentRule } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Save,
  Eye,
  Play,
  Pause,
  GripVertical,
  Trash2,
  Type,
  Mail,
  Phone,
  AlignLeft,
  List,
  CheckSquare,
  Hash,
  Calendar,
  Link as LinkIcon,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { FormFieldEditor } from '@/components/forms/FormFieldEditor'
import { FormPreview } from '@/components/forms/FormPreview'
import { FormSettings } from '@/components/forms/FormSettings'

interface User {
  id: string
  full_name: string | null
  email: string
}

const FIELD_TYPES: { type: WebFormFieldType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" /> },
  { type: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
  { type: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" /> },
  { type: 'textarea', label: 'Text Area', icon: <AlignLeft className="w-4 h-4" /> },
  { type: 'select', label: 'Dropdown', icon: <List className="w-4 h-4" /> },
  { type: 'radio', label: 'Radio', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="w-4 h-4" /> },
  { type: 'number', label: 'Number', icon: <Hash className="w-4 h-4" /> },
  { type: 'date', label: 'Date', icon: <Calendar className="w-4 h-4" /> },
  { type: 'url', label: 'URL', icon: <LinkIcon className="w-4 h-4" /> },
  { type: 'hidden', label: 'Hidden', icon: <EyeOff className="w-4 h-4" /> },
]

export function FormBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<WebForm | null>(null)
  const [fields, setFields] = useState<WebFormField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'fields' | 'settings' | 'preview'>('fields')
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null)
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRule[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchForm()
      fetchAssignmentRules()
      fetchUsers()
    }
  }, [id, user?.tenantId])

  async function fetchForm() {
    try {
      const [formResult, fieldsResult] = await Promise.all([
        supabase.from('web_forms').select('*').eq('id', id).single(),
        supabase.from('web_form_fields').select('*').eq('form_id', id).order('position'),
      ])

      if (formResult.error) throw formResult.error
      if (fieldsResult.error) throw fieldsResult.error

      setForm(formResult.data)
      setFields(fieldsResult.data || [])
    } catch (error) {
      console.error('Error fetching form:', error)
      toast.error('Failed to load form')
      navigate('/forms')
    } finally {
      setLoading(false)
    }
  }

  async function fetchAssignmentRules() {
    try {
      const { data, error } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('entity_type', 'lead')
        .eq('is_active', true)

      if (error) throw error
      setAssignmentRules(data || [])
    } catch (error) {
      console.error('Error fetching assignment rules:', error)
    }
  }

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function saveForm() {
    if (!form) return

    setSaving(true)
    try {
      // Update form settings
      const { error: formError } = await supabase
        .from('web_forms')
        .update({
          name: form.name,
          description: form.description,
          submit_button_text: form.submit_button_text,
          success_message: form.success_message,
          redirect_url: form.redirect_url,
          primary_color: form.primary_color,
          background_color: form.background_color,
          text_color: form.text_color,
          font_family: form.font_family,
          border_radius: form.border_radius,
          custom_css: form.custom_css,
          display_type: form.display_type,
          show_branding: form.show_branding,
          popup_trigger: form.popup_trigger,
          popup_delay_seconds: form.popup_delay_seconds,
          popup_scroll_percentage: form.popup_scroll_percentage,
          enable_captcha: form.enable_captcha,
          captcha_type: form.captcha_type,
          captcha_site_key: form.captcha_site_key,
          honeypot_enabled: form.honeypot_enabled,
          assignment_rule_id: form.assignment_rule_id,
          default_owner_id: form.default_owner_id,
          default_lead_source: form.default_lead_source,
          notify_on_submission: form.notify_on_submission,
          notification_emails: form.notification_emails,
          send_auto_response: form.send_auto_response,
          auto_response_subject: form.auto_response_subject,
          auto_response_body: form.auto_response_body,
          capture_utm_params: form.capture_utm_params,
          duplicate_check_enabled: form.duplicate_check_enabled,
          duplicate_field: form.duplicate_field,
          duplicate_action: form.duplicate_action,
        })
        .eq('id', form.id)

      if (formError) throw formError

      // Delete existing fields and recreate them
      const { error: deleteError } = await supabase
        .from('web_form_fields')
        .delete()
        .eq('form_id', form.id)

      if (deleteError) throw deleteError

      // Insert updated fields
      if (fields.length > 0) {
        const fieldsToInsert = fields.map((field, index) => ({
          form_id: form.id,
          field_type: field.field_type,
          label: field.label,
          name: field.name,
          placeholder: field.placeholder,
          help_text: field.help_text,
          default_value: field.default_value,
          is_required: field.is_required,
          min_length: field.min_length,
          max_length: field.max_length,
          pattern: field.pattern,
          pattern_error_message: field.pattern_error_message,
          options: field.options,
          lead_field_mapping: field.lead_field_mapping,
          width: field.width,
          position: index,
          conditional_logic: field.conditional_logic,
        }))

        const { error: insertError } = await supabase
          .from('web_form_fields')
          .insert(fieldsToInsert)

        if (insertError) throw insertError
      }

      toast.success('Form saved successfully')
      setHasChanges(false)
      // Refresh fields to get new IDs
      const { data: newFields } = await supabase
        .from('web_form_fields')
        .select('*')
        .eq('form_id', form.id)
        .order('position')
      setFields(newFields || [])
    } catch (error) {
      console.error('Error saving form:', error)
      toast.error('Failed to save form')
    } finally {
      setSaving(false)
    }
  }

  async function updateFormStatus(status: WebForm['status']) {
    if (!form) return

    try {
      const { error } = await supabase
        .from('web_forms')
        .update({ status })
        .eq('id', form.id)

      if (error) throw error

      setForm({ ...form, status })
      toast.success(`Form ${status === 'active' ? 'activated' : 'paused'}`)
    } catch (error) {
      console.error('Error updating form status:', error)
      toast.error('Failed to update form status')
    }
  }

  function addField(type: WebFormFieldType) {
    const newField: Partial<WebFormField> = {
      id: `temp-${Date.now()}`,
      form_id: id!,
      field_type: type,
      label: `New ${type} field`,
      name: `field_${Date.now()}`,
      placeholder: '',
      help_text: null,
      default_value: null,
      is_required: false,
      min_length: null,
      max_length: null,
      pattern: null,
      pattern_error_message: null,
      options: type === 'select' || type === 'radio' ? [{ label: 'Option 1', value: 'option_1' }] : null,
      lead_field_mapping: null,
      width: '100%',
      position: fields.length,
      conditional_logic: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setFields([...fields, newField as WebFormField])
    setSelectedFieldId(newField.id!)
    setHasChanges(true)
  }

  function updateField(fieldId: string, updates: Partial<WebFormField>) {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f))
    setHasChanges(true)
  }

  function deleteField(fieldId: string) {
    setFields(fields.filter(f => f.id !== fieldId))
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null)
    }
    setHasChanges(true)
  }

  function handleDragStart(index: number) {
    setDraggedFieldIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedFieldIndex === null || draggedFieldIndex === index) return

    const newFields = [...fields]
    const draggedField = newFields[draggedFieldIndex]
    newFields.splice(draggedFieldIndex, 1)
    newFields.splice(index, 0, draggedField)

    setFields(newFields)
    setDraggedFieldIndex(index)
    setHasChanges(true)
  }

  function handleDragEnd() {
    setDraggedFieldIndex(null)
  }

  const selectedField = fields.find(f => f.id === selectedFieldId)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value })
                  setHasChanges(true)
                }}
                className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
              />
              <p className="text-sm text-muted-foreground">
                {form.status === 'active' ? 'Active' : form.status === 'paused' ? 'Paused' : 'Draft'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {form.status === 'active' && (
              <Button variant="outline" size="sm" onClick={() => window.open(`/f/${form.slug}`, '_blank')}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
            {form.status !== 'active' ? (
              <Button variant="outline" size="sm" onClick={() => updateFormStatus('active')}>
                <Play className="w-4 h-4 mr-2" />
                Activate
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => updateFormStatus('paused')}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            <Button onClick={saveForm} disabled={saving || !hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('fields')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'fields'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Fields
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'fields' && (
          <div className="h-full flex">
            {/* Field Types Panel */}
            <div className="w-64 border-r bg-muted/30 p-4 overflow-y-auto">
              <h3 className="text-sm font-medium mb-3">Add Field</h3>
              <div className="grid grid-cols-2 gap-2">
                {FIELD_TYPES.map(({ type, label, icon }) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-background hover:bg-muted transition-colors text-xs"
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fields List */}
            <div className="flex-1 p-6 overflow-y-auto">
              {fields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground">
                    No fields yet. Add fields from the panel on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedFieldId === field.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      } ${draggedFieldIndex === index ? 'opacity-50' : ''}`}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          {field.is_required && (
                            <span className="text-xs text-red-500">*</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {field.field_type}
                          {field.lead_field_mapping && ` → ${field.lead_field_mapping}`}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteField(field.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Editor Panel */}
            {selectedField && (
              <div className="w-80 border-l bg-muted/30 p-4 overflow-y-auto">
                <FormFieldEditor
                  field={selectedField}
                  onUpdate={(updates) => updateField(selectedField.id, updates)}
                  onDelete={() => deleteField(selectedField.id)}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-y-auto p-6">
            <FormSettings
              form={form}
              onUpdate={(updates) => {
                setForm({ ...form, ...updates })
                setHasChanges(true)
              }}
              assignmentRules={assignmentRules}
              users={users}
            />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-xl mx-auto">
              <FormPreview form={form} fields={fields} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
