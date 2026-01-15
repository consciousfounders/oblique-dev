import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { apiKeyService } from '@/lib/api/keys'
import { API_SCOPES, type ApiScope, type ApiKeyResponse } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  Clock,
  Key,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export function ApiKeysSection() {
  const { user } = useAuth()
  const [keys, setKeys] = useState<ApiKeyResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([])
  const [rateLimitMinute, setRateLimitMinute] = useState(60)
  const [rateLimitDay, setRateLimitDay] = useState(10000)
  const [creating, setCreating] = useState(false)

  // Created key display
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadKeys()
  }, [])

  async function loadKeys() {
    setLoading(true)
    const { data, error } = await apiKeyService.listKeys()
    if (error) {
      setError(error)
    } else {
      setKeys(data || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!newKeyName.trim() || selectedScopes.length === 0 || !user?.tenantId) return

    setCreating(true)
    const { data, error } = await apiKeyService.createKey(
      {
        name: newKeyName,
        scopes: selectedScopes,
        rate_limit_per_minute: rateLimitMinute,
        rate_limit_per_day: rateLimitDay,
      },
      user.tenantId,
      user.id
    )

    if (error) {
      setError(error)
    } else if (data) {
      setCreatedKey(data.key)
      setKeys(prev => [data, ...prev])
      setNewKeyName('')
      setSelectedScopes([])
      setRateLimitMinute(60)
      setRateLimitDay(10000)
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const { success, error } = await apiKeyService.revokeKey(id)
    if (error) {
      setError(error)
    } else if (success) {
      setKeys(prev => prev.filter(k => k.id !== id))
    }
    setDeleteId(null)
    setDeleting(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  function toggleScope(scope: ApiScope) {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
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
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Create and manage API keys for programmatic access to your CRM data
            </CardDescription>
          </div>
          <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Trigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold">Create API Key</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Generate a new API key with specific permissions
                </Dialog.Description>

                {createdKey ? (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md border border-green-500/50 bg-green-500/10">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        API Key Created Successfully
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Make sure to copy your API key now. You won't be able to see it again!
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                          {createdKey}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(createdKey)}
                        >
                          {copiedKey ? (
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
                          setCreatedKey(null)
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
                        placeholder="My API Key"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Scopes</label>
                      <p className="text-xs text-muted-foreground">
                        Select the permissions for this API key
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {API_SCOPES.map(({ scope, label }) => (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => toggleScope(scope)}
                            className={`px-3 py-2 text-sm rounded-md border text-left transition-colors ${
                              selectedScopes.includes(scope)
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input hover:bg-muted'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate Limit / Minute</label>
                        <Input
                          type="number"
                          value={rateLimitMinute}
                          onChange={(e) => setRateLimitMinute(Number(e.target.value))}
                          min={1}
                          max={1000}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Rate Limit / Day</label>
                        <Input
                          type="number"
                          value={rateLimitDay}
                          onChange={(e) => setRateLimitDay(Number(e.target.value))}
                          min={1}
                          max={100000}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Dialog.Close asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={handleCreate}
                        disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
                      >
                        {creating ? 'Creating...' : 'Create Key'}
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys yet</p>
              <p className="text-sm mt-1">Create an API key to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                        {key.key_prefix}...
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{key.scopes.length} scopes</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last used: {formatDate(key.last_used_at)}
                      </span>
                      <span>
                        Rate: {key.rate_limit_per_minute}/min, {key.rate_limit_per_day}/day
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog.Root
                      open={deleteId === key.id}
                      onOpenChange={(open) => setDeleteId(open ? key.id : null)}
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
                            Revoke API Key
                          </Dialog.Title>
                          <Dialog.Description className="text-sm text-muted-foreground mt-2">
                            Are you sure you want to revoke "{key.name}"? This action cannot be
                            undone and any applications using this key will stop working.
                          </Dialog.Description>
                          <div className="flex justify-end gap-2 mt-4">
                            <Dialog.Close asChild>
                              <Button variant="outline">Cancel</Button>
                            </Dialog.Close>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(key.id)}
                              disabled={deleting}
                            >
                              {deleting ? 'Revoking...' : 'Revoke Key'}
                            </Button>
                          </div>
                        </Dialog.Content>
                      </Dialog.Portal>
                    </Dialog.Root>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
          <CardDescription>How to use your API key</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Authentication Header</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>Authorization: Bearer obl_your_api_key_here</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Example Request (cURL)</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`curl -X GET "https://api.oblique.dev/api/v1/accounts" \\
  -H "Authorization: Bearer obl_your_api_key_here" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Example Request (JavaScript)</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`const response = await fetch('https://api.oblique.dev/api/v1/accounts', {
  headers: {
    'Authorization': 'Bearer obl_your_api_key_here',
    'Content-Type': 'application/json'
  }
});
const data = await response.json();`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
