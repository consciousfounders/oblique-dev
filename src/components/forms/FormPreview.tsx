import type { WebForm, WebFormField } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FormPreviewProps {
  form: WebForm
  fields: WebFormField[]
}

export function FormPreview({ form, fields }: FormPreviewProps) {
  const options = (field: WebFormField) =>
    (field.options as { label: string; value: string }[]) || []

  return (
    <Card
      style={{
        backgroundColor: form.background_color || '#ffffff',
        color: form.text_color || '#1f2937',
        fontFamily: form.font_family || 'Inter, sans-serif',
        borderRadius: form.border_radius || '8px',
      }}
    >
      {form.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: form.custom_css }} />
      )}

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
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div className="flex flex-wrap -mx-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="px-2 mb-4"
                style={{ width: field.width || '100%' }}
              >
                {field.field_type !== 'hidden' && (
                  <label className="block text-sm font-medium mb-1">
                    {field.label}
                    {field.is_required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}

                {/* Text, Email, Phone, URL, Number, Date inputs */}
                {['text', 'email', 'phone', 'url', 'number', 'date'].includes(field.field_type) && (
                  <Input
                    type={field.field_type === 'phone' ? 'tel' : field.field_type}
                    placeholder={field.placeholder || ''}
                    defaultValue={field.default_value || ''}
                    required={field.is_required}
                    minLength={field.min_length || undefined}
                    maxLength={field.max_length || undefined}
                    pattern={field.pattern || undefined}
                    style={{
                      borderRadius: form.border_radius || '6px',
                    }}
                  />
                )}

                {/* Textarea */}
                {field.field_type === 'textarea' && (
                  <textarea
                    placeholder={field.placeholder || ''}
                    defaultValue={field.default_value || ''}
                    required={field.is_required}
                    minLength={field.min_length || undefined}
                    maxLength={field.max_length || undefined}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    style={{
                      borderRadius: form.border_radius || '6px',
                    }}
                  />
                )}

                {/* Select/Dropdown */}
                {field.field_type === 'select' && (
                  <select
                    defaultValue={field.default_value || ''}
                    required={field.is_required}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    style={{
                      borderRadius: form.border_radius || '6px',
                    }}
                  >
                    <option value="">Select an option...</option>
                    {options(field).map((opt, idx) => (
                      <option key={idx} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Radio */}
                {field.field_type === 'radio' && (
                  <div className="space-y-2">
                    {options(field).map((opt, idx) => (
                      <label key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={field.name}
                          value={opt.value}
                          defaultChecked={field.default_value === opt.value}
                          required={field.is_required}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Checkbox */}
                {field.field_type === 'checkbox' && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={field.default_value === 'true'}
                      required={field.is_required}
                    />
                    <span>{field.placeholder || field.label}</span>
                  </label>
                )}

                {/* Hidden */}
                {field.field_type === 'hidden' && (
                  <input
                    type="hidden"
                    name={field.name}
                    value={field.default_value || ''}
                  />
                )}

                {field.help_text && (
                  <p className="text-xs text-muted-foreground mt-1">{field.help_text}</p>
                )}
              </div>
            ))}
          </div>

          {/* Honeypot field (hidden) */}
          {form.honeypot_enabled && (
            <input
              type="text"
              name="_honeypot"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />
          )}

          <Button
            type="submit"
            className="w-full"
            style={{
              backgroundColor: form.primary_color || '#3b82f6',
              borderRadius: form.border_radius || '6px',
            }}
          >
            {form.submit_button_text || 'Submit'}
          </Button>

          {form.show_branding && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Powered by Oblique CRM
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
