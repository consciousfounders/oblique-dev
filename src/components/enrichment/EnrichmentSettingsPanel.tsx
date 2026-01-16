import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useEnrichmentSettings, useEnrichmentUsage } from '@/lib/hooks/useEnrichment'
import {
  ENRICHMENT_PROVIDERS,
  DEFAULT_ENRICHMENT_SETTINGS,
  type EnrichmentProvider,
  type EnrichmentSettings,
} from '@/lib/types/enrichment'
import {
  Settings,
  Zap,
  CreditCard,
  BarChart3,
  Loader2,
  Save,
  AlertCircle,
  Key,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// Provider card component
function ProviderCard({
  provider,
  enabled,
  apiKey,
  onToggle,
  onApiKeyChange,
}: {
  provider: EnrichmentProvider
  enabled: boolean
  apiKey: string
  onToggle: (enabled: boolean) => void
  onApiKeyChange: (key: string) => void
}) {
  const config = ENRICHMENT_PROVIDERS[provider]
  if (!config || provider === 'manual') return null

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">{config.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{config.description}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>

      {enabled && (
        <div className="mt-3">
          <Label htmlFor={`${provider}-api-key`} className="text-sm">API Key</Label>
          <Input
            id={`${provider}-api-key`}
            type="password"
            placeholder="Enter your API key"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="mt-1"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {config.capabilities.company_enrichment && (
          <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Company
          </span>
        )}
        {config.capabilities.contact_enrichment && (
          <span className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Contact
          </span>
        )}
        {config.capabilities.email_verification && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            Email Verify
          </span>
        )}
        {config.capabilities.technographics && (
          <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
            Tech Stack
          </span>
        )}
      </div>
    </div>
  )
}

// Usage stats component
function UsageStats() {
  const {
    loading,
    totalCreditsUsed,
    totalEnrichments,
    successRate,
  } = useEnrichmentUsage({ period: 'month' })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {totalEnrichments}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Enrichments</div>
      </div>
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {totalCreditsUsed}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Credits Used</div>
      </div>
      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {successRate.toFixed(0)}%
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
      </div>
    </div>
  )
}

export function EnrichmentSettingsPanel() {
  const { settings, loading, saving, error, saveSettings } = useEnrichmentSettings()

  // Local state for form
  const [formData, setFormData] = useState<Partial<EnrichmentSettings>>({})
  const [isDirty, setIsDirty] = useState(false)

  // Initialize form data from settings
  const getFieldValue = <K extends keyof EnrichmentSettings>(
    field: K
  ): EnrichmentSettings[K] => {
    if (field in formData) return formData[field] as EnrichmentSettings[K]
    if (settings && field in settings) return settings[field]
    return DEFAULT_ENRICHMENT_SETTINGS[field] as EnrichmentSettings[K]
  }

  const updateField = <K extends keyof EnrichmentSettings>(
    field: K,
    value: EnrichmentSettings[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    const success = await saveSettings(formData)
    if (success) {
      toast.success('Settings saved successfully')
      setIsDirty(false)
      setFormData({})
    } else {
      toast.error('Failed to save settings')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Data Enrichment Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure enrichment providers and automation settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !isDirty}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            This Month's Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageStats />
        </CardContent>
      </Card>

      {/* Provider Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4" />
            Enrichment Providers
          </CardTitle>
          <CardDescription>
            Configure your data enrichment provider credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProviderCard
            provider="clearbit"
            enabled={getFieldValue('clearbit_enabled')}
            apiKey={getFieldValue('clearbit_api_key_encrypted') || ''}
            onToggle={(enabled) => updateField('clearbit_enabled', enabled)}
            onApiKeyChange={(key) => updateField('clearbit_api_key_encrypted', key)}
          />
          <ProviderCard
            provider="apollo"
            enabled={getFieldValue('apollo_enabled')}
            apiKey={getFieldValue('apollo_api_key_encrypted') || ''}
            onToggle={(enabled) => updateField('apollo_enabled', enabled)}
            onApiKeyChange={(key) => updateField('apollo_api_key_encrypted', key)}
          />
          <ProviderCard
            provider="zoominfo"
            enabled={getFieldValue('zoominfo_enabled')}
            apiKey={getFieldValue('zoominfo_api_key_encrypted') || ''}
            onToggle={(enabled) => updateField('zoominfo_enabled', enabled)}
            onApiKeyChange={(key) => updateField('zoominfo_api_key_encrypted', key)}
          />
        </CardContent>
      </Card>

      {/* Default Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Default Providers
          </CardTitle>
          <CardDescription>
            Choose which provider to use by default for each type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Company Enrichment</Label>
              <select
                className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={getFieldValue('default_company_provider')}
                onChange={(e) => updateField('default_company_provider', e.target.value as EnrichmentProvider)}
              >
                <option value="clearbit">Clearbit</option>
                <option value="apollo">Apollo.io</option>
                <option value="zoominfo">ZoomInfo</option>
              </select>
            </div>
            <div>
              <Label>Contact Enrichment</Label>
              <select
                className="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                value={getFieldValue('default_contact_provider')}
                onChange={(e) => updateField('default_contact_provider', e.target.value as EnrichmentProvider)}
              >
                <option value="clearbit">Clearbit</option>
                <option value="apollo">Apollo.io</option>
                <option value="zoominfo">ZoomInfo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Automation
          </CardTitle>
          <CardDescription>
            Configure automatic enrichment triggers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-enrich on record creation</Label>
              <p className="text-sm text-gray-500">
                Automatically enrich new companies and contacts when created
              </p>
            </div>
            <Switch
              checked={getFieldValue('auto_enrich_on_create')}
              onCheckedChange={(checked: boolean) => updateField('auto_enrich_on_create', checked)}
            />
          </div>

          {getFieldValue('auto_enrich_on_create') && (
            <div className="ml-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enrich Companies</Label>
                <Switch
                  checked={getFieldValue('auto_enrich_companies')}
                  onCheckedChange={(checked: boolean) => updateField('auto_enrich_companies', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enrich Contacts</Label>
                <Switch
                  checked={getFieldValue('auto_enrich_contacts')}
                  onCheckedChange={(checked: boolean) => updateField('auto_enrich_contacts', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Enrich Leads</Label>
                <Switch
                  checked={getFieldValue('auto_enrich_leads')}
                  onCheckedChange={(checked: boolean) => updateField('auto_enrich_leads', checked)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <Label>Scheduled re-enrichment</Label>
              <p className="text-sm text-gray-500">
                Automatically refresh stale enrichment data
              </p>
            </div>
            <Switch
              checked={getFieldValue('scheduled_enrichment_enabled')}
              onCheckedChange={(checked: boolean) => updateField('scheduled_enrichment_enabled', checked)}
            />
          </div>

          {getFieldValue('scheduled_enrichment_enabled') && (
            <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
              <Label className="text-sm">Re-enrich records older than</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  min={7}
                  max={365}
                  value={getFieldValue('max_stale_days')}
                  onChange={(e) => updateField('max_stale_days', parseInt(e.target.value) || 90)}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limits & Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Limits & Budget
          </CardTitle>
          <CardDescription>
            Control enrichment costs and rate limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Daily Enrichment Limit</Label>
              <Input
                type="number"
                min={0}
                value={getFieldValue('daily_enrichment_limit')}
                onChange={(e) => updateField('daily_enrichment_limit', parseInt(e.target.value) || 100)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Max enrichments per day</p>
            </div>
            <div>
              <Label>Monthly Enrichment Limit</Label>
              <Input
                type="number"
                min={0}
                value={getFieldValue('monthly_enrichment_limit')}
                onChange={(e) => updateField('monthly_enrichment_limit', parseInt(e.target.value) || 2000)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Max enrichments per month</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label>Monthly Credit Budget</Label>
              <Input
                type="number"
                min={0}
                value={getFieldValue('monthly_credit_budget')}
                onChange={(e) => updateField('monthly_credit_budget', parseInt(e.target.value) || 1000)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Stop enriching when reached</p>
            </div>
            <div>
              <Label>Credit Alert Threshold</Label>
              <Input
                type="number"
                min={0}
                value={getFieldValue('credit_alert_threshold')}
                onChange={(e) => updateField('credit_alert_threshold', parseInt(e.target.value) || 100)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Alert when credits remaining</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
