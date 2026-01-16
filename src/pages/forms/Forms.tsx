import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { WebForm } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Plus,
  Search,
  FileText,
  Eye,
  Users,
  BarChart3,
  MoreVertical,
  Copy,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  Code
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface FormWithStats extends WebForm {
  views_count?: number
  submissions_count?: number
}

export function FormsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [forms, setForms] = useState<FormWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
  })

  useEffect(() => {
    if (user?.tenantId) {
      fetchForms()
    } else {
      setLoading(false)
    }
  }, [user?.tenantId])

  async function fetchForms() {
    try {
      const { data: formsData, error: formsError } = await supabase
        .from('web_forms')
        .select('*')
        .order('created_at', { ascending: false })

      if (formsError) throw formsError

      // Get submission counts for each form
      const formsWithStats = await Promise.all(
        (formsData || []).map(async (form) => {
          const [viewsResult, submissionsResult] = await Promise.all([
            supabase
              .from('web_form_views')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id),
            supabase
              .from('web_form_submissions')
              .select('id', { count: 'exact', head: true })
              .eq('form_id', form.id)
          ])

          return {
            ...form,
            views_count: viewsResult.count || 0,
            submissions_count: submissionsResult.count || 0,
          }
        })
      )

      setForms(formsWithStats)
    } catch (error) {
      console.error('Error fetching forms:', error)
      toast.error('Failed to load forms')
    } finally {
      setLoading(false)
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8)
  }

  async function createForm(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.tenantId) return

    try {
      const slug = generateSlug(newForm.name)

      const { data, error } = await supabase
        .from('web_forms')
        .insert({
          tenant_id: user.tenantId,
          name: newForm.name,
          description: newForm.description || null,
          slug,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Form created successfully')
      setShowCreate(false)
      setNewForm({ name: '', description: '' })
      navigate(`/forms/${data.id}`)
    } catch (error) {
      console.error('Error creating form:', error)
      toast.error('Failed to create form')
    }
  }

  async function updateFormStatus(formId: string, status: WebForm['status']) {
    try {
      const { error } = await supabase
        .from('web_forms')
        .update({ status })
        .eq('id', formId)

      if (error) throw error

      setForms(forms.map(f => f.id === formId ? { ...f, status } : f))
      toast.success(`Form ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'updated'}`)
    } catch (error) {
      console.error('Error updating form status:', error)
      toast.error('Failed to update form status')
    }
  }

  async function duplicateForm(form: FormWithStats) {
    if (!user?.tenantId) return

    try {
      const { data: newFormData, error: formError } = await supabase
        .from('web_forms')
        .insert({
          tenant_id: user.tenantId,
          name: `${form.name} (Copy)`,
          description: form.description,
          slug: generateSlug(`${form.name}-copy`),
          status: 'draft',
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
          enable_captcha: form.enable_captcha,
          captcha_type: form.captcha_type,
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
          created_by: user.id,
        })
        .select()
        .single()

      if (formError) throw formError

      // Copy form fields
      const { data: fields, error: fieldsError } = await supabase
        .from('web_form_fields')
        .select('*')
        .eq('form_id', form.id)

      if (!fieldsError && fields && fields.length > 0) {
        const newFields = fields.map(field => ({
          form_id: newFormData.id,
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
          position: field.position,
          conditional_logic: field.conditional_logic,
        }))

        await supabase.from('web_form_fields').insert(newFields)
      }

      toast.success('Form duplicated successfully')
      fetchForms()
    } catch (error) {
      console.error('Error duplicating form:', error)
      toast.error('Failed to duplicate form')
    }
  }

  async function deleteForm(formId: string) {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('web_forms')
        .delete()
        .eq('id', formId)

      if (error) throw error

      setForms(forms.filter(f => f.id !== formId))
      toast.success('Form deleted successfully')
    } catch (error) {
      console.error('Error deleting form:', error)
      toast.error('Failed to delete form')
    }
  }

  const filteredForms = forms.filter((form) => {
    const searchLower = search.toLowerCase()
    return (
      form.name.toLowerCase().includes(searchLower) ||
      form.description?.toLowerCase().includes(searchLower)
    )
  })

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    archived: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  if (!user?.tenantId && !user?.isSuperAdmin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">You are not assigned to a tenant yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Web Forms</h1>
          <p className="text-muted-foreground">Create and manage lead capture forms</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search forms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Form</CardTitle>
            <CardDescription>
              Start with a name and description, then add fields in the form builder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createForm} className="space-y-4">
              <Input
                placeholder="Form name *"
                value={newForm.name}
                onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Description (optional)"
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              />
              <div className="flex gap-2">
                <Button type="submit">Create & Edit Form</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Forms List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search ? 'No forms match your search' : 'No forms yet. Create your first form!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredForms.map((form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Link to={`/forms/${form.id}`} className="hover:underline">
                      <CardTitle className="text-lg truncate">{form.name}</CardTitle>
                    </Link>
                    {form.description && (
                      <CardDescription className="line-clamp-2 mt-1">
                        {form.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Edit Form
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/analytics`)}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/embed`)}>
                        <Code className="mr-2 h-4 w-4" />
                        Get Embed Code
                      </DropdownMenuItem>
                      {form.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() => window.open(`/f/${form.slug}`, '_blank')}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Preview Form
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      {form.status === 'draft' || form.status === 'paused' ? (
                        <DropdownMenuItem onClick={() => updateFormStatus(form.id, 'active')}>
                          <Play className="mr-2 h-4 w-4" />
                          Activate Form
                        </DropdownMenuItem>
                      ) : form.status === 'active' ? (
                        <DropdownMenuItem onClick={() => updateFormStatus(form.id, 'paused')}>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause Form
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => duplicateForm(form)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteForm(form.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[form.status]}`}>
                    {form.status}
                  </span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {form.views_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {form.submissions_count || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
