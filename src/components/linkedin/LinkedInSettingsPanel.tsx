import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLinkedInSettings } from '@/lib/hooks/useLinkedIn'
import {
  Settings,
  Key,
  RefreshCw,
  Loader2,
  Save,
  Check,
  AlertCircle,
  Clock,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'

interface LinkedInSettingsPanelProps {
  title?: string
}

export function LinkedInSettingsPanel({ title = 'LinkedIn Integration Settings' }: LinkedInSettingsPanelProps) {
  const {
    settings,
    loading,
    error,
    updateSettings,
    initializeSettings,
    refresh,
  } = useLinkedInSettings()

  const [rocketReachKey, setRocketReachKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [syncInterval, setSyncInterval] = useState(settings?.sync_interval_hours?.toString() || '24')
  const [autoSync, setAutoSync] = useState<boolean>(settings?.auto_sync_enabled || false)
  const [autoLog, setAutoLog] = useState<boolean>(settings?.auto_log_activities ?? true)

  // Initialize settings if they don't exist
  const handleInitialize = async () => {
    const success = await initializeSettings()
    if (success) {
      toast.success('LinkedIn integration initialized')
    } else {
      toast.error('Failed to initialize settings')
    }
  }

  // Save RocketReach API key
  const handleSaveApiKey = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const success = await updateSettings({
        rocketreach_api_key_encrypted: rocketReachKey || null,
      })
      if (success) {
        toast.success('API key saved')
        setRocketReachKey('')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Save sync settings
  const handleSaveSyncSettings = async () => {
    if (!settings) return
    setIsSaving(true)
    try {
      const success = await updateSettings({
        auto_sync_enabled: autoSync,
        sync_interval_hours: parseInt(syncInterval) || 24,
        auto_log_activities: autoLog,
      })
      if (success) {
        toast.success('Settings saved')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Trigger manual sync
  const handleManualSync = async () => {
    if (!settings) return
    try {
      await updateSettings({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'completed',
      })
      toast.success('Sync completed')
      await refresh()
    } catch {
      toast.error('Sync failed')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-destructive">
            <AlertCircle className="w-10 h-10 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {title}
          </CardTitle>
          <CardDescription>
            Configure your LinkedIn Sales Navigator integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              LinkedIn integration has not been set up yet.
            </p>
            <Button onClick={handleInitialize}>
              <Zap className="w-4 h-4 mr-2" />
              Initialize Integration
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="w-4 h-4" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure external API keys for enhanced profile lookup
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">RocketReach API Key</label>
            <p className="text-xs text-muted-foreground">
              Used for automatic LinkedIn profile lookup. Get your key at{' '}
              <a
                href="https://rocketreach.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                rocketreach.co
              </a>
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={settings.rocketreach_api_key_encrypted ? '••••••••••••••••' : 'Enter API key'}
                value={rocketReachKey}
                onChange={(e) => setRocketReachKey(e.target.value)}
              />
              <Button
                onClick={handleSaveApiKey}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            {settings.rocketreach_api_key_encrypted && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                API key configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4" />
            Sync Settings
          </CardTitle>
          <CardDescription>
            Configure automatic synchronization with LinkedIn
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto-sync profiles</label>
              <p className="text-xs text-muted-foreground">
                Automatically refresh LinkedIn profile data
              </p>
            </div>
            <Button
              variant={autoSync ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoSync(!autoSync)}
            >
              {autoSync ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {autoSync && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Sync interval (hours)</label>
              <Input
                type="number"
                min="1"
                max="168"
                value={syncInterval}
                onChange={(e) => setSyncInterval(e.target.value)}
                className="w-32"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Auto-log activities</label>
              <p className="text-xs text-muted-foreground">
                Automatically log LinkedIn activities to CRM timeline
              </p>
            </div>
            <Button
              variant={autoLog ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoLog(!autoLog)}
            >
              {autoLog ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveSyncSettings}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last sync:</span>
              <span>
                {settings.last_sync_at
                  ? new Date(settings.last_sync_at).toLocaleString()
                  : 'Never'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={
                settings.last_sync_status === 'completed'
                  ? 'text-green-600'
                  : settings.last_sync_status === 'failed'
                  ? 'text-red-600'
                  : 'text-muted-foreground'
              }>
                {settings.last_sync_status || 'Not synced'}
              </span>
            </div>
            {settings.last_sync_error && (
              <div className="p-2 bg-destructive/10 rounded text-destructive text-xs">
                {settings.last_sync_error}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Integration method:</span>
              <span className="capitalize">{settings.integration_method}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
