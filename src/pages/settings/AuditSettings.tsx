import { useState, useEffect } from 'react'
import { useAuditSettings } from '@/lib/hooks/useAuditLog'
import { AUDIT_ENTITY_TYPES } from '@/lib/supabase'
import { usePermissions } from '@/lib/hooks/usePermissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Loader2, Shield, Clock, Download, AlertTriangle, Check } from 'lucide-react'

export function AuditSettingsPage() {
  const { settings, loading, error, updateSettings } = useAuditSettings()
  const { isAdmin } = usePermissions()
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Local state for form
  const [trackCreates, setTrackCreates] = useState(true)
  const [trackUpdates, setTrackUpdates] = useState(true)
  const [trackDeletes, setTrackDeletes] = useState(true)
  const [trackedEntities, setTrackedEntities] = useState<string[]>([])
  const [excludedFields, setExcludedFields] = useState('')
  const [retentionDays, setRetentionDays] = useState(365)
  const [enableDataExport, setEnableDataExport] = useState(true)
  const [gdprMode, setGdprMode] = useState(false)

  // Sync settings to local state
  useEffect(() => {
    if (settings) {
      setTrackCreates(settings.track_creates)
      setTrackUpdates(settings.track_updates)
      setTrackDeletes(settings.track_deletes)
      setTrackedEntities(settings.tracked_entities || [])
      setExcludedFields((settings.excluded_fields || []).join(', '))
      setRetentionDays(settings.retention_days)
      setEnableDataExport(settings.enable_data_export)
      setGdprMode(settings.gdpr_mode)
    }
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const success = await updateSettings({
      track_creates: trackCreates,
      track_updates: trackUpdates,
      track_deletes: trackDeletes,
      tracked_entities: trackedEntities,
      excluded_fields: excludedFields.split(',').map(f => f.trim()).filter(f => f),
      retention_days: retentionDays,
      enable_data_export: enableDataExport,
      gdpr_mode: gdprMode,
    })

    if (success) {
      setMessage({ type: 'success', text: 'Audit settings saved successfully' })
    } else {
      setMessage({ type: 'error', text: 'Failed to save audit settings' })
    }

    setSaving(false)
  }

  const toggleEntity = (entityPlural: string) => {
    if (trackedEntities.includes(entityPlural)) {
      setTrackedEntities(trackedEntities.filter(e => e !== entityPlural))
    } else {
      setTrackedEntities([...trackedEntities, entityPlural])
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access audit settings.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Error Loading Settings</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Audit Trail Settings</h1>
        <p className="text-muted-foreground">Configure how changes are tracked in your CRM</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md border text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tracking Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Change Tracking
          </CardTitle>
          <CardDescription>Choose which types of changes to track</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Track Record Creation</p>
              <p className="text-sm text-muted-foreground">Log when new records are created</p>
            </div>
            <Switch
              checked={trackCreates}
              onCheckedChange={setTrackCreates}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Track Record Updates</p>
              <p className="text-sm text-muted-foreground">Log field-level changes to records</p>
            </div>
            <Switch
              checked={trackUpdates}
              onCheckedChange={setTrackUpdates}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Track Record Deletion</p>
              <p className="text-sm text-muted-foreground">Log when records are deleted</p>
            </div>
            <Switch
              checked={trackDeletes}
              onCheckedChange={setTrackDeletes}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tracked Entities */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked Entities</CardTitle>
          <CardDescription>Select which record types to audit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {AUDIT_ENTITY_TYPES.map(({ value, label, plural }) => (
              <button
                key={value}
                onClick={() => toggleEntity(plural)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  trackedEntities.includes(plural)
                    ? 'border-primary bg-primary/5'
                    : 'border-input hover:bg-muted'
                }`}
              >
                <span className="font-medium">{label}s</span>
                {trackedEntities.includes(plural) && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Excluded Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Excluded Fields</CardTitle>
          <CardDescription>
            Fields to exclude from tracking (comma-separated, e.g., "password, api_key")
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={excludedFields}
            onChange={(e) => setExcludedFields(e.target.value)}
            placeholder="password, secret_key, ..."
          />
        </CardContent>
      </Card>

      {/* Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Retention Policy
          </CardTitle>
          <CardDescription>How long to keep audit logs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)}
              min={30}
              max={3650}
              className="w-32"
            />
            <span className="text-muted-foreground">days</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Audit logs older than {retentionDays} days will be automatically deleted.
            Minimum: 30 days, Maximum: 10 years.
          </p>
        </CardContent>
      </Card>

      {/* Compliance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-500" />
            Compliance
          </CardTitle>
          <CardDescription>Data export and GDPR compliance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Data Export</p>
              <p className="text-sm text-muted-foreground">Allow exporting audit logs and user activity data</p>
            </div>
            <Switch
              checked={enableDataExport}
              onCheckedChange={setEnableDataExport}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">GDPR Mode</p>
              <p className="text-sm text-muted-foreground">
                Enable stricter data handling for GDPR compliance
              </p>
            </div>
            <Switch
              checked={gdprMode}
              onCheckedChange={setGdprMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </div>
  )
}
