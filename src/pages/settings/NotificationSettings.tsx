import { useState, useEffect } from 'react'
import { useNotificationPreferences, NOTIFICATION_CATEGORIES } from '@/lib/hooks/useNotifications'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Mail, Monitor, Clock, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

function ToggleSwitch({ enabled, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        enabled ? 'bg-primary' : 'bg-muted'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function NotificationSettingsPage() {
  const { preferences, loading, updatePreferences } = useNotificationPreferences()
  const [saving, setSaving] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<{
    email_enabled: boolean
    in_app_enabled: boolean
    browser_push_enabled: boolean
    quiet_hours_enabled: boolean
    quiet_hours_start: string
    quiet_hours_end: string
    digest_mode: 'immediate' | 'hourly' | 'daily'
    category_preferences: Record<string, boolean>
  } | null>(null)

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        email_enabled: preferences.email_enabled,
        in_app_enabled: preferences.in_app_enabled,
        browser_push_enabled: preferences.browser_push_enabled,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start || '22:00',
        quiet_hours_end: preferences.quiet_hours_end || '08:00',
        digest_mode: preferences.digest_mode,
        category_preferences: preferences.category_preferences || {},
      })
    }
  }, [preferences])

  const handleSave = async () => {
    if (!localPrefs) return

    setSaving(true)
    try {
      await updatePreferences({
        email_enabled: localPrefs.email_enabled,
        in_app_enabled: localPrefs.in_app_enabled,
        browser_push_enabled: localPrefs.browser_push_enabled,
        quiet_hours_enabled: localPrefs.quiet_hours_enabled,
        quiet_hours_start: localPrefs.quiet_hours_enabled ? localPrefs.quiet_hours_start : null,
        quiet_hours_end: localPrefs.quiet_hours_enabled ? localPrefs.quiet_hours_end : null,
        digest_mode: localPrefs.digest_mode,
        category_preferences: localPrefs.category_preferences,
      })
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const updateLocalPref = <K extends keyof NonNullable<typeof localPrefs>>(
    key: K,
    value: NonNullable<typeof localPrefs>[K]
  ) => {
    setLocalPrefs(prev => (prev ? { ...prev, [key]: value } : null))
  }

  const updateCategoryPref = (category: string, enabled: boolean) => {
    setLocalPrefs(prev =>
      prev
        ? {
            ...prev,
            category_preferences: { ...prev.category_preferences, [category]: enabled },
          }
        : null
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!localPrefs) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
          <p className="text-muted-foreground">Control how and when you receive notifications</p>
        </div>
      </div>

      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Delivery Channels
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">In-app notifications</p>
                <p className="text-xs text-muted-foreground">Show notifications in the app</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={localPrefs.in_app_enabled}
              onChange={(v) => updateLocalPref('in_app_enabled', v)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={localPrefs.email_enabled}
              onChange={(v) => updateLocalPref('email_enabled', v)}
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Browser push notifications</p>
                <p className="text-xs text-muted-foreground">Receive push notifications in your browser</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={localPrefs.browser_push_enabled}
              onChange={(v) => updateLocalPref('browser_push_enabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Frequency</CardTitle>
          <CardDescription>Choose how often to receive notification summaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'immediate' as const, label: 'Immediate', desc: 'Get notified right away' },
              { value: 'hourly' as const, label: 'Hourly digest', desc: 'Summary every hour' },
              { value: 'daily' as const, label: 'Daily digest', desc: 'Summary once a day' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateLocalPref('digest_mode', option.value)}
                className={`flex-1 min-w-[120px] p-3 text-left rounded-lg border transition-colors ${
                  localPrefs.digest_mode === option.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-input hover:bg-muted'
                }`}
              >
                <p className="font-medium text-sm">{option.label}</p>
                <p className={`text-xs ${localPrefs.digest_mode === option.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {option.desc}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>Pause notifications during specific times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable quiet hours</p>
              <p className="text-xs text-muted-foreground">Mute notifications during specified hours</p>
            </div>
            <ToggleSwitch
              enabled={localPrefs.quiet_hours_enabled}
              onChange={(v) => updateLocalPref('quiet_hours_enabled', v)}
            />
          </div>

          {localPrefs.quiet_hours_enabled && (
            <div className="flex items-center gap-4 pt-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Input
                  type="time"
                  value={localPrefs.quiet_hours_start}
                  onChange={(e) => updateLocalPref('quiet_hours_start', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Input
                  type="time"
                  value={localPrefs.quiet_hours_end}
                  onChange={(e) => updateLocalPref('quiet_hours_end', e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Choose which types of notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div key={category.value} className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">{category.label}</p>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
              <ToggleSwitch
                enabled={localPrefs.category_preferences[category.value] !== false}
                onChange={(v) => updateCategoryPref(category.value, v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
