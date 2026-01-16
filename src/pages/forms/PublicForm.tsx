import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface FormField {
  id: string
  field_type: string
  label: string
  name: string
  placeholder: string | null
  help_text: string | null
  default_value: string | null
  is_required: boolean
  min_length: number | null
  max_length: number | null
  pattern: string | null
  pattern_error_message: string | null
  options: { label: string; value: string }[] | null
  width: string | null
  conditional_logic: Record<string, unknown> | null
}

interface PublicFormData {
  id: string
  name: string
  description: string | null
  submit_button_text: string
  success_message: string
  redirect_url: string | null
  primary_color: string | null
  background_color: string | null
  text_color: string | null
  font_family: string | null
  border_radius: string | null
  custom_css: string | null
  show_branding: boolean
  enable_captcha: boolean
  captcha_type: string | null
  captcha_site_key: string | null
  honeypot_enabled: boolean
  fields: FormField[]
}

export function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()

  const [form, setForm] = useState<PublicFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Extract tenant slug from the URL (format: /f/{tenant_slug}/{form_slug})
  const tenantSlug = slug?.split('/')[0] || ''
  const formSlug = slug?.split('/')[1] || slug || ''

  useEffect(() => {
    fetchForm()
    trackView()
  }, [tenantSlug, formSlug])

  async function fetchForm() {
    try {
      const { data, error } = await supabase.rpc('get_public_form', {
        p_tenant_slug: tenantSlug,
        p_form_slug: formSlug,
      })

      if (error) throw error

      if (!data) {
        setError('Form not found')
        return
      }

      setForm(data as PublicFormData)

      // Set default values
      const defaults: Record<string, string> = {}
      ;(data.fields || []).forEach((field: FormField) => {
        if (field.default_value) {
          defaults[field.name] = field.default_value
        }
      })
      setFormData(defaults)
    } catch (err) {
      console.error('Error fetching form:', err)
      setError('Failed to load form')
    } finally {
      setLoading(false)
    }
  }

  async function trackView() {
    try {
      const utmParams = {
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
      }

      await supabase.rpc('track_form_view', {
        p_tenant_slug: tenantSlug,
        p_form_slug: formSlug,
        p_tracking_data: {
          session_id: getSessionId(),
          user_agent: navigator.userAgent,
          referrer_url: document.referrer,
          page_url: window.location.href,
          ...utmParams,
        },
      })
    } catch (err) {
      console.error('Error tracking view:', err)
    }
  }

  function getSessionId(): string {
    let sessionId = sessionStorage.getItem('form_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      sessionStorage.setItem('form_session_id', sessionId)
    }
    return sessionId
  }

  function validateField(field: FormField, value: string): string | null {
    if (field.is_required && !value.trim()) {
      return `${field.label} is required`
    }

    if (value && field.min_length && value.length < field.min_length) {
      return `${field.label} must be at least ${field.min_length} characters`
    }

    if (value && field.max_length && value.length > field.max_length) {
      return `${field.label} must be at most ${field.max_length} characters`
    }

    if (value && field.pattern) {
      try {
        const regex = new RegExp(field.pattern)
        if (!regex.test(value)) {
          return field.pattern_error_message || `${field.label} is invalid`
        }
      } catch {
        // Invalid regex pattern
      }
    }

    if (value && field.field_type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address'
      }
    }

    return null
  }

  function handleFieldChange(name: string, value: string) {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    // Validate all fields
    const errors: Record<string, string> = {}
    form.fields.forEach((field) => {
      const value = formData[field.name] || ''
      const fieldError = validateField(field, value)
      if (fieldError) {
        errors[field.name] = fieldError
      }
    })

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Collect UTM params
      const utmParams = {
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign'),
        utm_term: searchParams.get('utm_term'),
        utm_content: searchParams.get('utm_content'),
      }

      // Tracking data
      const trackingData = {
        ip_address: null, // Server will capture this
        user_agent: navigator.userAgent,
        referrer_url: document.referrer,
        page_url: window.location.href,
      }

      const { data, error: submitError } = await supabase.rpc('submit_web_form', {
        p_tenant_slug: tenantSlug,
        p_form_slug: formSlug,
        p_submission_data: formData,
        p_utm_params: utmParams,
        p_tracking_data: trackingData,
      })

      if (submitError) throw submitError

      if (!data.success) {
        setError(data.error || 'Submission failed')
        return
      }

      setSubmitted(true)

      // Redirect if configured
      if (data.redirect_url) {
        window.location.href = data.redirect_url
      }
    } catch (err) {
      console.error('Error submitting form:', err)
      setError('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Form Not Found</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!form) {
    return null
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: form.background_color || '#f9fafb',
          fontFamily: form.font_family || 'Inter, sans-serif',
        }}
      >
        <Card
          className="max-w-md w-full"
          style={{
            backgroundColor: form.background_color || '#ffffff',
            borderRadius: form.border_radius || '8px',
          }}
        >
          <CardContent className="pt-6 text-center">
            <CheckCircle
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: form.primary_color || '#22c55e' }}
            />
            <h2
              className="text-xl font-semibold mb-2"
              style={{ color: form.text_color || '#1f2937' }}
            >
              Thank You!
            </h2>
            <p
              className="text-muted-foreground"
              style={{ color: form.text_color || '#6b7280' }}
            >
              {form.success_message}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: form.background_color || '#f9fafb',
        fontFamily: form.font_family || 'Inter, sans-serif',
      }}
    >
      {form.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: form.custom_css }} />
      )}

      <Card
        className="max-w-xl w-full"
        style={{
          backgroundColor: form.background_color || '#ffffff',
          borderRadius: form.border_radius || '8px',
        }}
      >
        <CardHeader>
          <CardTitle style={{ color: form.text_color || '#1f2937' }}>
            {form.name}
          </CardTitle>
          {form.description && (
            <CardDescription style={{ color: form.text_color || '#6b7280' }}>
              {form.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex flex-wrap -mx-2">
              {form.fields.map((field) => (
                <div
                  key={field.id}
                  className="px-2 mb-4"
                  style={{ width: field.width || '100%' }}
                >
                  {field.field_type !== 'hidden' && (
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: form.text_color || '#1f2937' }}
                    >
                      {field.label}
                      {field.is_required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                  )}

                  {/* Text, Email, Phone, URL, Number, Date inputs */}
                  {['text', 'email', 'phone', 'url', 'number', 'date'].includes(field.field_type) && (
                    <Input
                      type={field.field_type === 'phone' ? 'tel' : field.field_type}
                      name={field.name}
                      placeholder={field.placeholder || ''}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      style={{ borderRadius: form.border_radius || '6px' }}
                      className={validationErrors[field.name] ? 'border-red-500' : ''}
                    />
                  )}

                  {/* Textarea */}
                  {field.field_type === 'textarea' && (
                    <textarea
                      name={field.name}
                      placeholder={field.placeholder || ''}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      rows={4}
                      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                        validationErrors[field.name] ? 'border-red-500' : ''
                      }`}
                      style={{ borderRadius: form.border_radius || '6px' }}
                    />
                  )}

                  {/* Select/Dropdown */}
                  {field.field_type === 'select' && (
                    <select
                      name={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${
                        validationErrors[field.name] ? 'border-red-500' : ''
                      }`}
                      style={{ borderRadius: form.border_radius || '6px' }}
                    >
                      <option value="">Select an option...</option>
                      {(field.options || []).map((opt, idx) => (
                        <option key={idx} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Radio */}
                  {field.field_type === 'radio' && (
                    <div className="space-y-2">
                      {(field.options || []).map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={field.name}
                            value={opt.value}
                            checked={formData[field.name] === opt.value}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          />
                          <span style={{ color: form.text_color || '#1f2937' }}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Checkbox */}
                  {field.field_type === 'checkbox' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={formData[field.name] === 'true'}
                        onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'true' : '')}
                      />
                      <span style={{ color: form.text_color || '#1f2937' }}>
                        {field.placeholder || field.label}
                      </span>
                    </label>
                  )}

                  {/* Hidden */}
                  {field.field_type === 'hidden' && (
                    <input
                      type="hidden"
                      name={field.name}
                      value={formData[field.name] || field.default_value || ''}
                    />
                  )}

                  {/* Validation error */}
                  {validationErrors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors[field.name]}</p>
                  )}

                  {/* Help text */}
                  {field.help_text && !validationErrors[field.name] && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: form.text_color || '#6b7280' }}
                    >
                      {field.help_text}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Honeypot field (hidden) */}
            {form.honeypot_enabled && (
              <input
                type="text"
                name="_honeypot"
                value={formData['_honeypot'] || ''}
                onChange={(e) => handleFieldChange('_honeypot', e.target.value)}
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              style={{
                backgroundColor: form.primary_color || '#3b82f6',
                borderRadius: form.border_radius || '6px',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                form.submit_button_text || 'Submit'
              )}
            </Button>

            {form.show_branding && (
              <p
                className="text-center text-xs mt-4"
                style={{ color: form.text_color || '#9ca3af' }}
              >
                Powered by Oblique CRM
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
