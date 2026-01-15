import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { oauthService, type OAuthApplication } from '@/lib/api/oauth'
import { API_SCOPES, type ApiScope } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Plus,
  Copy,
  Trash2,
  Check,
  AlertCircle,
  AppWindow,
  RefreshCw,
  ExternalLink,
  X,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

export function OAuthAppsSection() {
  const { user } = useAuth()
  const [apps, setApps] = useState<OAuthApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newAppName, setNewAppName] = useState('')
  const [newAppDescription, setNewAppDescription] = useState('')
  const [redirectUris, setRedirectUris] = useState<string[]>([''])
  const [selectedScopes, setSelectedScopes] = useState<ApiScope[]>([])
  const [creating, setCreating] = useState(false)

  // Created app display
  const [createdApp, setCreatedApp] = useState<{ clientId: string; clientSecret: string } | null>(null)
  const [copiedField, setCopiedField] = useState<'id' | 'secret' | null>(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Regenerate secret
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<{ appId: string; secret: string } | null>(null)

  useEffect(() => {
    loadApps()
  }, [])

  async function loadApps() {
    setLoading(true)
    const { data, error } = await oauthService.listApplications()
    if (error) {
      setError(error)
    } else {
      setApps(data || [])
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!newAppName.trim() || selectedScopes.length === 0 || !user?.tenantId) return

    const validUris = redirectUris.filter(uri => uri.trim().length > 0)
    if (validUris.length === 0) {
      setError('At least one redirect URI is required')
      return
    }

    setCreating(true)
    const { data, error } = await oauthService.createApplication(
      {
        name: newAppName,
        description: newAppDescription || undefined,
        redirect_uris: validUris,
        scopes: selectedScopes,
      },
      user.tenantId,
      user.id
    )

    if (error) {
      setError(error)
    } else if (data) {
      setCreatedApp({ clientId: data.client_id, clientSecret: data.client_secret })
      setApps(prev => [data, ...prev])
      setNewAppName('')
      setNewAppDescription('')
      setRedirectUris([''])
      setSelectedScopes([])
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const { success, error } = await oauthService.deleteApplication(id)
    if (error) {
      setError(error)
    } else if (success) {
      setApps(prev => prev.filter(a => a.id !== id))
    }
    setDeleteId(null)
    setDeleting(false)
  }

  async function handleRegenerateSecret(id: string) {
    setRegeneratingId(id)
    const { data, error } = await oauthService.regenerateClientSecret(id)
    if (error) {
      setError(error)
    } else if (data) {
      setNewSecret({ appId: id, secret: data.client_secret })
    }
    setRegeneratingId(null)
  }

  async function handleToggleActive(id: string, isActive: boolean) {
    const { data, error } = await oauthService.updateApplication(id, { is_active: isActive })
    if (error) {
      setError(error)
    } else if (data) {
      setApps(prev => prev.map(a => (a.id === id ? data : a)))
    }
  }

  function copyToClipboard(text: string, field: 'id' | 'secret') {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  function toggleScope(scope: ApiScope) {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  function addRedirectUri() {
    setRedirectUris(prev => [...prev, ''])
  }

  function updateRedirectUri(index: number, value: string) {
    setRedirectUris(prev => prev.map((uri, i) => (i === index ? value : uri)))
  }

  function removeRedirectUri(index: number) {
    if (redirectUris.length > 1) {
      setRedirectUris(prev => prev.filter((_, i) => i !== index))
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
            <CardTitle>OAuth Applications</CardTitle>
            <CardDescription>
              Register third-party applications to access your CRM data using OAuth 2.0
            </CardDescription>
          </div>
          <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Trigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Application
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-semibold">Create OAuth Application</Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mt-1">
                  Register a new application for OAuth 2.0 authentication
                </Dialog.Description>

                {createdApp ? (
                  <div className="mt-4 space-y-4">
                    <div className="p-4 rounded-md border border-green-500/50 bg-green-500/10">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                        Application Created Successfully
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Save these credentials now. The client secret will not be shown again!
                      </p>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium">Client ID</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                              {createdApp.clientId}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(createdApp.clientId, 'id')}
                            >
                              {copiedField === 'id' ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium">Client Secret</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                              {createdApp.clientSecret}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(createdApp.clientSecret, 'secret')}
                            >
                              {copiedField === 'secret' ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        onClick={() => {
                          setCreatedApp(null)
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
                      <label className="text-sm font-medium">Application Name</label>
                      <Input
                        placeholder="My App"
                        value={newAppName}
                        onChange={(e) => setNewAppName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Input
                        placeholder="Brief description of your application"
                        value={newAppDescription}
                        onChange={(e) => setNewAppDescription(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Redirect URIs</label>
                      <p className="text-xs text-muted-foreground">
                        URIs where users will be redirected after authorization
                      </p>
                      <div className="space-y-2">
                        {redirectUris.map((uri, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              type="url"
                              placeholder="https://example.com/callback"
                              value={uri}
                              onChange={(e) => updateRedirectUri(index, e.target.value)}
                            />
                            {redirectUris.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRedirectUri(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addRedirectUri}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add URI
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Scopes</label>
                      <p className="text-xs text-muted-foreground">
                        Select the permissions this application can request
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

                    <div className="flex justify-end gap-2 pt-4">
                      <Dialog.Close asChild>
                        <Button variant="outline">Cancel</Button>
                      </Dialog.Close>
                      <Button
                        onClick={handleCreate}
                        disabled={creating || !newAppName.trim() || selectedScopes.length === 0}
                      >
                        {creating ? 'Creating...' : 'Create Application'}
                      </Button>
                    </div>
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AppWindow className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No OAuth applications registered</p>
              <p className="text-sm mt-1">Create an application to enable OAuth 2.0 authentication</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{app.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            app.is_active
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {app.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {app.description && (
                        <p className="text-sm text-muted-foreground">{app.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Client ID:</span>
                        <code className="px-1.5 py-0.5 bg-muted rounded font-mono">
                          {app.client_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => copyToClipboard(app.client_id, 'id')}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Scopes: {app.scopes.length}</span>
                        <span>•</span>
                        <span>Redirect URIs: {app.redirect_uris.length}</span>
                        <span>•</span>
                        <span>Created: {formatDate(app.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Regenerate Secret Dialog */}
                      {newSecret?.appId === app.id ? (
                        <Dialog.Root open={true} onOpenChange={() => setNewSecret(null)}>
                          <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-md">
                              <Dialog.Title className="text-lg font-semibold">
                                New Client Secret Generated
                              </Dialog.Title>
                              <Dialog.Description className="text-sm text-muted-foreground mt-2">
                                Save this secret now. It will not be shown again. All existing tokens have been revoked.
                              </Dialog.Description>
                              <div className="mt-4">
                                <div className="flex items-center gap-2">
                                  <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                                    {newSecret.secret}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(newSecret.secret, 'secret')}
                                  >
                                    {copiedField === 'secret' ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div className="flex justify-end mt-4">
                                <Button onClick={() => setNewSecret(null)}>Done</Button>
                              </div>
                            </Dialog.Content>
                          </Dialog.Portal>
                        </Dialog.Root>
                      ) : null}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateSecret(app.id)}
                        disabled={regeneratingId === app.id}
                      >
                        {regeneratingId === app.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(app.id, !app.is_active)}
                      >
                        {app.is_active ? (
                          <X className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Check className="w-4 h-4 text-green-600" />
                        )}
                      </Button>
                      <Dialog.Root
                        open={deleteId === app.id}
                        onOpenChange={(open) => setDeleteId(open ? app.id : null)}
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
                              Delete Application
                            </Dialog.Title>
                            <Dialog.Description className="text-sm text-muted-foreground mt-2">
                              Are you sure you want to delete "{app.name}"? This will revoke all
                              tokens and users will need to re-authorize.
                            </Dialog.Description>
                            <div className="flex justify-end gap-2 mt-4">
                              <Dialog.Close asChild>
                                <Button variant="outline">Cancel</Button>
                              </Dialog.Close>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(app.id)}
                                disabled={deleting}
                              >
                                {deleting ? 'Deleting...' : 'Delete Application'}
                              </Button>
                            </div>
                          </Dialog.Content>
                        </Dialog.Portal>
                      </Dialog.Root>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OAuth Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth 2.0 Integration</CardTitle>
          <CardDescription>How to implement OAuth 2.0 authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Authorization Endpoint</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`GET /oauth/authorize?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code&
  scope=accounts:read contacts:read&
  state=RANDOM_STATE`}</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Token Endpoint</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_REDIRECT_URI"
}`}</code>
            </pre>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Refresh Token</h4>
            <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{`POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "refresh_token": "YOUR_REFRESH_TOKEN"
}`}</code>
            </pre>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="w-4 h-4" />
            <span>Access tokens expire after 1 hour. Refresh tokens are valid for 30 days.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
