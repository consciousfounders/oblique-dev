import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { webhookService, type WebhookDelivery } from '@/lib/api/webhooks'
import { WEBHOOK_EVENTS, type WebhookEventType, type WebhookResponse } from '@/lib/api/types'
import {
  createInboundWebhookService,
  type InboundWebhook,
  type InboundWebhookLog,
  type CreateInboundWebhookRequest,
  type InboundAuthType,
  type TargetEntity,
} from '@/lib/services/webhooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import {
  Plus,
  Trash2,
  AlertCircle,
  Webhook,
  Check,
  X,
  RefreshCw,
  Play,
  Clock,
  ChevronDown,
  ChevronRight,
  Copy,
  ArrowDownToLine,
  ArrowUpFromLine,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'

// Tab value type
type WebhookTabValue = 'outbound' | 'inbound'

export function WebhooksSection() {
  const [activeTab, setActiveTab] = useState<WebhookTabValue>('outbound')

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WebhookTabValue)}>
        <TabsList className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-6">
          <TabsTrigger
            value="outbound"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            Outbound Webhooks
          </TabsTrigger>
          <TabsTrigger
            value="inbound"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Inbound Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound" className="focus:outline-none">
          <OutboundWebhooksSection />
        </TabsContent>
        <TabsContent value="inbound" className="focus:outline-none">
          <InboundWebhooksSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =====================
// OUTBOUND WEBHOOKS
// =====================

function OutboundWebhooksSection() {
  const { user } = useAuth()
  const [webhooks, setWebhooks] = useState<WebhookResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([])
  const [creating, setCreating] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message?: string } | null>(null)

  // Deliveries
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<string | null>(null)

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function loadWebhooks() {
    setLoading(true)
    const { data, error } = await webhookService.listWebhooks()
    if (error) {
      setError(error)
    } else {
      setWebhooks(data || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!newName.trim() || !newUrl.trim() || selectedEvents.length === 0 || !user?.tenantId) return

    setCreating(true)
    const { data, error } = await webhookService.createWebhook(
      {
        name: newName,
        url: newUrl,
        events: selectedEvents,
      },
      user.tenantId,
      user.id
    )

    if (error) {
      setError(error)
    } else if (data) {
      setCreatedSecret(data.secret || null)
      setWebhooks(prev => [data, ...prev])
      setNewName('')
      setNewUrl('')
      setSelectedEvents([])
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const { success, error } = await webhookService.deleteWebhook(id)
    if (error) {
      setError(error)
    } else if (success) {
      setWebhooks(prev => prev.filter(w => w.id !== id))
    }
    setDeleteId(null)
    setDeleting(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    const { success, error } = await webhookService.toggleWebhook(id, isActive)
    if (error) {
      setError(error)
    } else if (success) {
      setWebhooks(prev =>
        prev.map(w => (w.id === id ? { ...w, is_active: isActive, failure_count: isActive ? 0 : w.failure_count } : w))
      )
    }
  }

  async function handleTest(id: string) {
    setTestingId(id)
    setTestResult(null)
    const { success, error } = await webhookService.testWebhook(id)
    setTestResult({ id, success, message: error || undefined })
    setTestingId(null)
  }

  async function loadDeliveries(webhookId: string) {
    if (expandedWebhook === webhookId) {
      setExpandedWebhook(null)
      return
    }

    setLoadingDeliveries(webhookId)
    const { data, error } = await webhookService.getDeliveries(webhookId, 10)
    if (!error && data) {
      setDeliveries(prev => ({ ...prev, [webhookId]: data }))
    }
    setExpandedWebhook(webhookId)
    setLoadingDeliveries(null)
  }

  function toggleEvent(event: WebhookEventType) {
    setSelectedEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    )
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Outbound Webhooks</CardTitle>
            <CardDescription>
              Send real-time notifications to external services when events occur in your CRM
            </CardDescription>
          </div>
          <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Trigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Webhook
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold">Create Outbound Webhook</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Configure a webhook endpoint to receive event notifications
                </Dialog.Description>

                {createdSecret ? (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md border border-green-500/50 bg-green-500/10">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        Webhook Created Successfully
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Copy your webhook secret now. You won't be able to see it again!
                        Use this secret to verify webhook signatures.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                          {createdSecret}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(createdSecret)}
                        >
                          {copiedSecret ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setCreatedSecret(null)
                          setCreateOpen(false)
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="My Webhook"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Endpoint URL</label>
                      <Input
                        type="url"
                        placeholder="https://example.com/webhooks"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be a publicly accessible HTTPS URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Events</label>
                      <p className="text-xs text-muted-foreground">
                        Select the events you want to receive
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                        {WEBHOOK_EVENTS.map(({ event, label }) => (
                          <button
                            key={event}
                            type="button"
                            onClick={() => toggleEvent(event)}
                            className={`px-3 py-2 text-xs rounded-md border text-left transition-colors ${
                              selectedEvents.includes(event)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input hover:bg-muted'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Dialog.Close asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={handleCreate}
                        disabled={creating || !newName.trim() || !newUrl.trim() || selectedEvents.length === 0}
                      >
                        {creating ? 'Creating...' : 'Create Webhook'}
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No webhooks configured</p>
              <p className="text-sm mt-1">Create a webhook to receive event notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            webhook.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {webhook.failure_count > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-600 dark:text-red-400">
                            {webhook.failure_count} failures
                          </span>
                        )}
                        {testResult?.id === webhook.id && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              testResult.success
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {testResult.success ? 'Test passed' : testResult.message || 'Test failed'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-md">
                        {webhook.url}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{webhook.events.length} events</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last triggered: {formatDate(webhook.last_triggered_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadDeliveries(webhook.id)}
                      >
                        {expandedWebhook === webhook.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                        disabled={testingId === webhook.id || !webhook.is_active}
                      >
                        {testingId === webhook.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(webhook.id, !webhook.is_active)}
                      >
                        {webhook.is_active ? (
                          <X className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Dialog.Root
                        open={deleteId === webhook.id}
                        onOpenChange={(open) => setDeleteId(open ? webhook.id : null)}
                      >
                        <Dialog.Trigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-sm">
                            <Dialog.Title className="text-lg font-semibold">
                              Delete Webhook
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-2">
                              Are you sure you want to delete "{webhook.name}"? This action cannot be
                              undone and you will stop receiving notifications.
                            </Dialog.Description>
                            <div className="flex justify-end gap-2 mt-4">
                              <Dialog.Close asChild>
                                <Button variant="outline">Cancel</Button>
                              </Dialog.Close>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(webhook.id)}
                                disabled={deleting}
                              >
                                {deleting ? 'Deleting...' : 'Delete Webhook'}
                              </Button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>

                  {/* Deliveries Expansion */}
                  {expandedWebhook === webhook.id && (
                    <div className="border-t bg-muted/30 p-4">
                      <h4 className="text-sm font-medium mb-3">Recent Deliveries</h4>
                      {loadingDeliveries === webhook.id ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        </div>
                      ) : deliveries[webhook.id]?.length ? (
                        <div className="space-y-2">
                          {deliveries[webhook.id].map((delivery) => (
                            <div
                              key={delivery.id}
                              className="flex items-center gap-3 p-2 bg-background rounded text-xs"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  delivery.success ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              />
                              <span className="font-mono">{delivery.event_type}</span>
                              <span className="text-muted-foreground">
                                {delivery.response_status ? `HTTP ${delivery.response_status}` : 'Failed'}
                              </span>
                              {delivery.delivery_time_ms && (
                                <span className="text-muted-foreground">
                                  {delivery.delivery_time_ms}ms
                                </span>
                              )}
                              {delivery.retry_count > 0 && (
                                <span className="text-orange-500">
                                  Retry #{delivery.retry_count}
                                </span>
                              )}
                              <span className="ml-auto text-muted-foreground">
                                {formatDate(delivery.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No deliveries yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Verification</CardTitle>
          <CardDescription>How to verify webhook signatures</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            All webhook deliveries include a signature header for verification. Use the secret
            provided when creating the webhook to verify the payload authenticity.
          </p>
          <div>
            <h4 className="text-sm font-medium mb-2">Signature Header</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>X-Webhook-Signature: sha256=&lt;hmac_signature&gt;</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Verification Example (Node.js)</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// =====================
// INBOUND WEBHOOKS
// =====================

const AUTH_TYPES: { value: InboundAuthType; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No authentication required' },
  { value: 'api_key', label: 'API Key', description: 'Validate using X-API-Key header' },
  { value: 'hmac', label: 'HMAC Signature', description: 'Validate request signature' },
  { value: 'basic', label: 'Basic Auth', description: 'HTTP Basic authentication' },
]

const TARGET_ENTITIES: { value: TargetEntity; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'contact', label: 'Contact' },
  { value: 'account', label: 'Account' },
  { value: 'deal', label: 'Deal' },
  { value: 'activity', label: 'Activity' },
]

function InboundWebhooksSection() {
  const { user } = useAuth()
  const [webhooks, setWebhooks] = useState<InboundWebhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [formData, setFormData] = useState<CreateInboundWebhookRequest>({
    name: '',
    description: '',
    auth_type: 'api_key',
    target_entity: 'lead',
    field_mappings: {},
    default_values: {},
    create_if_not_exists: true,
    update_if_exists: false,
    lookup_field: '',
  })
  const [creating, setCreating] = useState(false)
  const [createdWebhook, setCreatedWebhook] = useState<InboundWebhook | null>(null)

  // Field mappings
  const [mappingKey, setMappingKey] = useState('')
  const [mappingValue, setMappingValue] = useState('')

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Details/logs view
  const [viewingWebhook, setViewingWebhook] = useState<string | null>(null)
  const [webhookLogs, setWebhookLogs] = useState<InboundWebhookLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Secrets visibility
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (user?.tenantId) {
      loadWebhooks()
    }
  }, [user?.tenantId])

  async function loadWebhooks() {
    if (!user?.tenantId) return
    setLoading(true)
    const service = createInboundWebhookService(user.tenantId)
    const { data, error } = await service.listInboundWebhooks()
    if (error) {
      setError(error)
    } else {
      setWebhooks(data || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!user?.tenantId || !formData.name.trim()) return

    setCreating(true)
    const service = createInboundWebhookService(user.tenantId)
    const { data, error } = await service.createInboundWebhook(formData, user.id)

    if (error) {
      setError(error)
    } else if (data) {
      setCreatedWebhook(data)
      setWebhooks(prev => [data, ...prev])
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!user?.tenantId) return
    setDeleting(true)
    const service = createInboundWebhookService(user.tenantId)
    const { success, error } = await service.deleteInboundWebhook(id)
    if (error) {
      setError(error)
    } else if (success) {
      setWebhooks(prev => prev.filter(w => w.id !== id))
    }
    setDeleteId(null)
    setDeleting(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    if (!user?.tenantId) return
    const service = createInboundWebhookService(user.tenantId)
    const { error } = await service.updateInboundWebhook(id, { is_active: isActive })
    if (error) {
      setError(error)
    } else {
      setWebhooks(prev => prev.map(w => (w.id === id ? { ...w, is_active: isActive } : w)))
    }
  }

  async function loadLogs(webhookId: string) {
    if (!user?.tenantId) return
    if (viewingWebhook === webhookId) {
      setViewingWebhook(null)
      return
    }

    setLoadingLogs(true)
    setViewingWebhook(webhookId)
    const service = createInboundWebhookService(user.tenantId)
    const { data, error } = await service.getWebhookLogs(webhookId, 20)
    if (!error && data) {
      setWebhookLogs(data)
    }
    setLoadingLogs(false)
  }

  function addFieldMapping() {
    if (!mappingKey.trim() || !mappingValue.trim()) return
    setFormData(prev => ({
      ...prev,
      field_mappings: {
        ...prev.field_mappings,
        [mappingKey.trim()]: mappingValue.trim(),
      },
    }))
    setMappingKey('')
    setMappingValue('')
  }

  function removeFieldMapping(key: string) {
    setFormData(prev => {
      const newMappings = { ...prev.field_mappings }
      delete newMappings[key]
      return { ...prev, field_mappings: newMappings }
    })
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getWebhookUrl(slug: string): string {
    return `${window.location.origin}/api/webhooks/inbound/${slug}`
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return 'Never'
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      auth_type: 'api_key',
      target_entity: 'lead',
      field_mappings: {},
      default_values: {},
      create_if_not_exists: true,
      update_if_exists: false,
      lookup_field: '',
    })
    setCreatedWebhook(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-sm underline">
            Dismiss
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Inbound Webhooks</CardTitle>
            <CardDescription>
              Receive data from external systems and automatically create or update CRM records
            </CardDescription>
          </div>
          <Dialog.Root
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open)
              if (!open) resetForm()
            }}
          >
            <Dialog.Trigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Inbound Webhook
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold">Create Inbound Webhook</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Configure an endpoint to receive data from external systems
                </Dialog.Description>

                {createdWebhook ? (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md border border-green-500/50 bg-green-500/10">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        Webhook Created Successfully
                      </p>
                      <div className="space-y-3 text-sm">
                        <div>
                          <label className="text-xs text-muted-foreground">Webhook URL</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                              {getWebhookUrl(createdWebhook.endpoint_slug)}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(getWebhookUrl(createdWebhook.endpoint_slug), 'url')}
                            >
                              {copiedId === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        {createdWebhook.api_key && (
                          <div>
                            <label className="text-xs text-muted-foreground">API Key</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                                {createdWebhook.api_key}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(createdWebhook.api_key!, 'apikey')}
                              >
                                {copiedId === 'apikey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        )}
                        {createdWebhook.hmac_secret && (
                          <div>
                            <label className="text-xs text-muted-foreground">HMAC Secret</label>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                                {createdWebhook.hmac_secret}
                              </code>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(createdWebhook.hmac_secret!, 'secret')}
                              >
                                {copiedId === 'secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Save these credentials - you won't be able to see them again!
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => { resetForm(); setCreateOpen(false) }}>
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Name</label>
                      <Input
                        placeholder="Zapier Lead Import"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        placeholder="Import leads from Zapier..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Authentication</label>
                        <Select.Root
                          value={formData.auth_type}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, auth_type: v as InboundAuthType }))}
                        >
                          <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background text-sm">
                            <Select.Value />
                            <Select.Icon>
                              <ChevronDown className="w-4 h-4" />
                            </Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="bg-background border rounded-md shadow-lg overflow-hidden">
                              <Select.Viewport>
                                {AUTH_TYPES.map((auth) => (
                                  <Select.Item
                                    key={auth.value}
                                    value={auth.value}
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-muted outline-none"
                                  >
                                    <Select.ItemText>{auth.label}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Entity</label>
                        <Select.Root
                          value={formData.target_entity}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, target_entity: v as TargetEntity }))}
                        >
                          <Select.Trigger className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background text-sm">
                            <Select.Value />
                            <Select.Icon>
                              <ChevronDown className="w-4 h-4" />
                            </Select.Icon>
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="bg-background border rounded-md shadow-lg overflow-hidden">
                              <Select.Viewport>
                                {TARGET_ENTITIES.map((entity) => (
                                  <Select.Item
                                    key={entity.value}
                                    value={entity.value}
                                    className="px-3 py-2 text-sm cursor-pointer hover:bg-muted outline-none"
                                  >
                                    <Select.ItemText>{entity.label}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Field Mappings</label>
                      <p className="text-xs text-muted-foreground">
                        Map incoming JSON fields to CRM fields (e.g., "user.email" → "email")
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Source field (e.g., data.email)"
                          value={mappingKey}
                          onChange={(e) => setMappingKey(e.target.value)}
                          className="flex-1"
                        />
                        <span className="flex items-center text-muted-foreground">→</span>
                        <Input
                          placeholder="Target field (e.g., email)"
                          value={mappingValue}
                          onChange={(e) => setMappingValue(e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={addFieldMapping} disabled={!mappingKey || !mappingValue}>
                          Add
                        </Button>
                      </div>
                      {Object.keys(formData.field_mappings).length > 0 && (
                        <div className="space-y-1 mt-2">
                          {Object.entries(formData.field_mappings).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded">
                              <code>{key}</code>
                              <span className="text-muted-foreground">→</span>
                              <code>{value}</code>
                              <button
                                onClick={() => removeFieldMapping(key)}
                                className="ml-auto text-destructive hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Lookup Field (Optional)</label>
                      <Input
                        placeholder="email"
                        value={formData.lookup_field}
                        onChange={(e) => setFormData(prev => ({ ...prev, lookup_field: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Field to use for matching existing records (e.g., "email")
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.create_if_not_exists}
                          onChange={(e) => setFormData(prev => ({ ...prev, create_if_not_exists: e.target.checked }))}
                          className="rounded"
                        />
                        Create new records
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.update_if_exists}
                          onChange={(e) => setFormData(prev => ({ ...prev, update_if_exists: e.target.checked }))}
                          className="rounded"
                        />
                        Update existing records
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Dialog.Close asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={handleCreate}
                        disabled={creating || !formData.name.trim()}
                      >
                        {creating ? 'Creating...' : 'Create Webhook'}
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownToLine className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No inbound webhooks configured</p>
              <p className="text-sm mt-1">Create an inbound webhook to receive data from external systems</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{webhook.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            webhook.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {webhook.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {TARGET_ENTITIES.find(e => e.value === webhook.target_entity)?.label || webhook.target_entity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span className="truncate max-w-md">
                          {getWebhookUrl(webhook.endpoint_slug)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(getWebhookUrl(webhook.endpoint_slug), webhook.id)}
                          className="text-primary hover:underline"
                        >
                          {copiedId === webhook.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Settings className="w-3 h-3" />
                          {AUTH_TYPES.find(a => a.value === webhook.auth_type)?.label || webhook.auth_type}
                        </span>
                        <span className="text-green-600">{webhook.success_count} received</span>
                        {webhook.error_count > 0 && (
                          <span className="text-red-600">{webhook.error_count} errors</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last received: {formatDate(webhook.last_received_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [webhook.id]: !prev[webhook.id] }))}
                        title={showSecrets[webhook.id] ? 'Hide credentials' : 'Show credentials'}
                      >
                        {showSecrets[webhook.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadLogs(webhook.id)}
                      >
                        {viewingWebhook === webhook.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(webhook.id, !webhook.is_active)}
                      >
                        {webhook.is_active ? (
                          <X className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Dialog.Root
                        open={deleteId === webhook.id}
                        onOpenChange={(open) => setDeleteId(open ? webhook.id : null)}
                      >
                        <Dialog.Trigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-sm">
                            <Dialog.Title className="text-lg font-semibold">
                              Delete Inbound Webhook
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-2">
                              Are you sure you want to delete "{webhook.name}"? This action cannot be
                              undone and external systems will no longer be able to send data.
                            </Dialog.Description>
                            <div className="flex justify-end gap-2 mt-4">
                              <Dialog.Close asChild>
                                <Button variant="outline">Cancel</Button>
                              </Dialog.Close>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(webhook.id)}
                                disabled={deleting}
                              >
                                {deleting ? 'Deleting...' : 'Delete Webhook'}
                              </Button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>

                  {/* Credentials Expansion */}
                  {showSecrets[webhook.id] && (
                    <div className="border-t bg-yellow-500/5 p-4">
                      <h4 className="text-sm font-medium mb-3">Credentials</h4>
                      <div className="space-y-2 text-xs">
                        {webhook.api_key && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">API Key:</span>
                            <code className="flex-1 p-1 bg-muted rounded font-mono">{webhook.api_key}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(webhook.api_key!, `apikey-${webhook.id}`)}
                            >
                              {copiedId === `apikey-${webhook.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        )}
                        {webhook.hmac_secret && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">Secret:</span>
                            <code className="flex-1 p-1 bg-muted rounded font-mono">{webhook.hmac_secret}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(webhook.hmac_secret!, `secret-${webhook.id}`)}
                            >
                              {copiedId === `secret-${webhook.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logs Expansion */}
                  {viewingWebhook === webhook.id && (
                    <div className="border-t bg-muted/30 p-4">
                      <h4 className="text-sm font-medium mb-3">Recent Requests</h4>
                      {loadingLogs ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                        </div>
                      ) : webhookLogs.length ? (
                        <div className="space-y-2">
                          {webhookLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center gap-3 p-2 bg-background rounded text-xs"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  log.status === 'success' ? 'bg-green-500' :
                                  log.status === 'error' ? 'bg-red-500' :
                                  log.status === 'auth_failed' ? 'bg-orange-500' :
                                  log.status === 'validation_failed' ? 'bg-yellow-500' :
                                  'bg-gray-500'
                                }`}
                              />
                              <span className="font-mono uppercase">{log.request_method}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  log.status === 'success' ? 'bg-green-500/10 text-green-600' :
                                  log.status === 'error' ? 'bg-red-500/10 text-red-600' :
                                  log.status === 'auth_failed' ? 'bg-orange-500/10 text-orange-600' :
                                  log.status === 'validation_failed' ? 'bg-yellow-500/10 text-yellow-600' :
                                  'bg-gray-500/10 text-gray-600'
                                }`}
                              >
                                {log.status.replace('_', ' ')}
                              </span>
                              {log.operation && (
                                <span className="text-muted-foreground">
                                  {log.operation}d {log.entity_type}
                                </span>
                              )}
                              {log.error_message && (
                                <span className="text-red-600 truncate max-w-xs" title={log.error_message}>
                                  {log.error_message}
                                </span>
                              )}
                              <span className="ml-auto text-muted-foreground">
                                {formatDate(log.received_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No requests received yet
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inbound Webhook Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Sending Data to Inbound Webhooks</CardTitle>
          <CardDescription>How to send data from external systems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send POST requests to your webhook URL with JSON data. Configure field mappings to
            automatically map incoming data to CRM fields.
          </p>
          <div>
            <h4 className="text-sm font-medium mb-2">Example Request (with API Key)</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`curl -X POST "https://your-app.com/api/webhooks/inbound/abc123xyz" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: inwh_your_api_key" \\
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "company": "Acme Inc"
  }'`}</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Example with HMAC Signature</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`# Generate signature
SIGNATURE=$(echo -n '{"email":"john@example.com"}' | \\
  openssl dgst -sha256 -hmac "your_secret" | cut -d' ' -f2)

curl -X POST "https://your-app.com/api/webhooks/inbound/abc123xyz" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \\
  -d '{"email":"john@example.com"}'`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
