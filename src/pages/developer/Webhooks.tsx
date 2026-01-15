import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { webhookService, type WebhookDelivery } from '@/lib/api/webhooks'
import { WEBHOOK_EVENTS, type WebhookEventType, type WebhookResponse } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export function WebhooksSection() {
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
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Receive real-time notifications when events occur in your CRM
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
                <Dialog.Title className="text-lg font-semibold">Create Webhook</Dialog.Title>
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
