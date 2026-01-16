import type { WebForm, AssignmentRule } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface User {
  id: string
  full_name: string | null
  email: string
}

interface FormSettingsProps {
  form: WebForm
  onUpdate: (updates: Partial<WebForm>) => void
  assignmentRules: AssignmentRule[]
  users: User[]
}

export function FormSettings({ form, onUpdate, assignmentRules, users }: FormSettingsProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>Configure basic form appearance and behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Form Name</label>
            <Input
              value={form.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value || null })}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Optional form description"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Submit Button Text</label>
            <Input
              value={form.submit_button_text}
              onChange={(e) => onUpdate({ submit_button_text: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Success Message</label>
            <textarea
              value={form.success_message}
              onChange={(e) => onUpdate({ success_message: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Redirect URL (optional)</label>
            <Input
              value={form.redirect_url || ''}
              onChange={(e) => onUpdate({ redirect_url: e.target.value || null })}
              placeholder="https://example.com/thank-you"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If set, users will be redirected here after submission instead of seeing the success message.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Styling */}
      <Card>
        <CardHeader>
          <CardTitle>Styling</CardTitle>
          <CardDescription>Customize the look and feel of your form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.primary_color || '#3b82f6'}
                  onChange={(e) => onUpdate({ primary_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.primary_color || '#3b82f6'}
                  onChange={(e) => onUpdate({ primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Background Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.background_color || '#ffffff'}
                  onChange={(e) => onUpdate({ background_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.background_color || '#ffffff'}
                  onChange={(e) => onUpdate({ background_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Text Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.text_color || '#1f2937'}
                  onChange={(e) => onUpdate({ text_color: e.target.value })}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={form.text_color || '#1f2937'}
                  onChange={(e) => onUpdate({ text_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Font Family</label>
            <select
              value={form.font_family || 'Inter, sans-serif'}
              onChange={(e) => onUpdate({ font_family: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Border Radius</label>
            <select
              value={form.border_radius || '8px'}
              onChange={(e) => onUpdate({ border_radius: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="0px">None</option>
              <option value="4px">Small (4px)</option>
              <option value="8px">Medium (8px)</option>
              <option value="12px">Large (12px)</option>
              <option value="16px">Extra Large (16px)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Custom CSS (optional)</label>
            <textarea
              value={form.custom_css || ''}
              onChange={(e) => onUpdate({ custom_css: e.target.value || null })}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs"
              placeholder=".form-container { /* your styles */ }"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show_branding"
              checked={form.show_branding}
              onChange={(e) => onUpdate({ show_branding: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="show_branding" className="text-sm">Show "Powered by" branding</label>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Configure how and when the form is displayed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Display Type</label>
            <select
              value={form.display_type}
              onChange={(e) => onUpdate({ display_type: e.target.value as WebForm['display_type'] })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="embedded">Embedded</option>
              <option value="popup">Popup Modal</option>
              <option value="slide_in">Slide In</option>
              <option value="full_page">Full Page</option>
            </select>
          </div>

          {(form.display_type === 'popup' || form.display_type === 'slide_in') && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Trigger</label>
                <select
                  value={form.popup_trigger || 'time'}
                  onChange={(e) => onUpdate({ popup_trigger: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="time">Time Delay</option>
                  <option value="scroll">Scroll Percentage</option>
                  <option value="exit_intent">Exit Intent</option>
                  <option value="click">Button Click</option>
                </select>
              </div>

              {form.popup_trigger === 'time' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Delay (seconds)</label>
                  <Input
                    type="number"
                    value={form.popup_delay_seconds || 5}
                    onChange={(e) => onUpdate({ popup_delay_seconds: parseInt(e.target.value) || 5 })}
                    min={0}
                    max={60}
                  />
                </div>
              )}

              {form.popup_trigger === 'scroll' && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Scroll Percentage</label>
                  <Input
                    type="number"
                    value={form.popup_scroll_percentage || 50}
                    onChange={(e) => onUpdate({ popup_scroll_percentage: parseInt(e.target.value) || 50 })}
                    min={0}
                    max={100}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Spam Protection */}
      <Card>
        <CardHeader>
          <CardTitle>Spam Protection</CardTitle>
          <CardDescription>Protect your form from spam submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="honeypot_enabled"
              checked={form.honeypot_enabled}
              onChange={(e) => onUpdate({ honeypot_enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="honeypot_enabled" className="text-sm">Enable honeypot field (recommended)</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enable_captcha"
              checked={form.enable_captcha}
              onChange={(e) => onUpdate({ enable_captcha: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="enable_captcha" className="text-sm">Enable CAPTCHA</label>
          </div>

          {form.enable_captcha && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">CAPTCHA Type</label>
                <select
                  value={form.captcha_type || 'recaptcha_v2'}
                  onChange={(e) => onUpdate({ captcha_type: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="recaptcha_v2">Google reCAPTCHA v2</option>
                  <option value="recaptcha_v3">Google reCAPTCHA v3</option>
                  <option value="hcaptcha">hCaptcha</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Site Key</label>
                <Input
                  value={form.captcha_site_key || ''}
                  onChange={(e) => onUpdate({ captcha_site_key: e.target.value || null })}
                  placeholder="Your CAPTCHA site key"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Routing */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Routing</CardTitle>
          <CardDescription>Configure how leads are assigned when the form is submitted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Assignment Rule</label>
            <select
              value={form.assignment_rule_id || ''}
              onChange={(e) => onUpdate({ assignment_rule_id: e.target.value || null })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">No automatic assignment</option>
              {assignmentRules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.rule_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Default Owner (fallback)</label>
            <select
              value={form.default_owner_id || ''}
              onChange={(e) => onUpdate({ default_owner_id: e.target.value || null })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Lead Source</label>
            <Input
              value={form.default_lead_source || 'web_form'}
              onChange={(e) => onUpdate({ default_lead_source: e.target.value || 'web_form' })}
              placeholder="web_form"
            />
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Handling</CardTitle>
          <CardDescription>Configure how duplicate leads are handled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="duplicate_check_enabled"
              checked={form.duplicate_check_enabled}
              onChange={(e) => onUpdate({ duplicate_check_enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="duplicate_check_enabled" className="text-sm">Enable duplicate checking</label>
          </div>

          {form.duplicate_check_enabled && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Check Field</label>
                <select
                  value={form.duplicate_field || 'email'}
                  onChange={(e) => onUpdate({ duplicate_field: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">When Duplicate Found</label>
                <select
                  value={form.duplicate_action || 'create_new'}
                  onChange={(e) => onUpdate({ duplicate_action: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="create_new">Create new lead anyway</option>
                  <option value="update_existing">Update existing lead</option>
                  <option value="reject">Reject submission</option>
                </select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure notification settings for form submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="notify_on_submission"
              checked={form.notify_on_submission}
              onChange={(e) => onUpdate({ notify_on_submission: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="notify_on_submission" className="text-sm">Notify assigned user on submission</label>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Additional Notification Emails</label>
            <Input
              value={(form.notification_emails || []).join(', ')}
              onChange={(e) => onUpdate({
                notification_emails: e.target.value
                  ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  : null
              })}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated list of emails to notify on submission.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="send_auto_response"
              checked={form.send_auto_response}
              onChange={(e) => onUpdate({ send_auto_response: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="send_auto_response" className="text-sm">Send auto-response email to submitter</label>
          </div>

          {form.send_auto_response && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Auto-response Subject</label>
                <Input
                  value={form.auto_response_subject || ''}
                  onChange={(e) => onUpdate({ auto_response_subject: e.target.value || null })}
                  placeholder="Thank you for contacting us"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Auto-response Body</label>
                <textarea
                  value={form.auto_response_body || ''}
                  onChange={(e) => onUpdate({ auto_response_body: e.target.value || null })}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Thank you for reaching out. We will get back to you soon."
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking</CardTitle>
          <CardDescription>Configure tracking and analytics settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="capture_utm_params"
              checked={form.capture_utm_params}
              onChange={(e) => onUpdate({ capture_utm_params: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="capture_utm_params" className="text-sm">Capture UTM parameters</label>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically capture utm_source, utm_medium, utm_campaign, etc. from the page URL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
