import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getOpenAPISpecJSON } from '@/lib/api/openapi'
import {
  getAllEntityMetadata,
  getEntityMetadata,
  getExpandableRelationships,
  getSearchableFields,
} from '@/lib/api/metadata'
import { API_SCOPES, WEBHOOK_EVENTS } from '@/lib/api/types'
import {
  Download,
  Copy,
  Check,
  Database,
  Key,
  Webhook,
  ChevronRight,
  ChevronDown,
  Book,
  Code,
  Layers,
} from 'lucide-react'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export function ApiDocs() {
  const entities = getAllEntityMetadata()
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://api.oblique.dev'

  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadOpenAPI() {
    const spec = getOpenAPISpecJSON(baseUrl)
    const blob = new Blob([spec], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'oblique-crm-openapi.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const methodColors: Record<HttpMethod, string> = {
    GET: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    PATCH: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  }

  const selectedEntityMeta = selectedEntity ? getEntityMetadata(selectedEntity) : null
  const expandableRels = selectedEntity ? getExpandableRelationships(selectedEntity) : []
  const searchableFields = selectedEntity ? getSearchableFields(selectedEntity) : []

  return (
    <div className="space-y-6">
      {/* Header with OpenAPI download */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Book className="w-5 h-5" />
              API Documentation
            </CardTitle>
            <CardDescription>
              Complete reference for the Oblique CRM REST API
            </CardDescription>
          </div>
          <Button variant="outline" onClick={downloadOpenAPI}>
            <Download className="w-4 h-4 mr-2" />
            Download OpenAPI Spec
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4 space-y-4">
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setSelectedEntity(null)
                    toggleSection('getting-started')
                  }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                    !selectedEntity ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <Code className="w-4 h-4" />
                  Getting Started
                </button>

                <div className="pt-4">
                  <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Entities
                  </p>
                  {entities.map((entity) => (
                    <button
                      key={entity.name}
                      onClick={() => setSelectedEntity(entity.name)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                        selectedEntity === entity.name
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Database className="w-4 h-4" />
                      {entity.plural_label}
                    </button>
                  ))}
                </div>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedEntity ? (
            <>
              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Base URL</h4>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                        {baseUrl}/api/v1
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(`${baseUrl}/api/v1`)}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Response Format</h4>
                    <p className="text-sm text-muted-foreground">
                      All responses follow a consistent JSON structure:
                    </p>
                    <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                      <code>{`{
  "data": { ... },      // The requested resource(s)
  "meta": {             // Pagination info (for list endpoints)
    "total": 100,
    "page": 1,
    "limit": 50,
    "has_more": true
  }
}`}</code>
                    </pre>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Error Responses</h4>
                    <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                      <code>{`{
  "error": {
    "code": "not_found",
    "message": "Resource not found",
    "details": { ... }
  }
}`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Authenticate requests using an API key in the Authorization header:
                  </p>
                  <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                    <code>Authorization: Bearer obl_your_api_key</code>
                  </pre>

                  <div className="space-y-2">
                    <h4 className="font-medium">Available Scopes</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {API_SCOPES.map(({ scope, description }) => (
                        <div key={scope} className="flex items-start gap-2 text-sm">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs shrink-0">
                            {scope}
                          </code>
                          <span className="text-muted-foreground text-xs">{description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Rate Limiting</h4>
                    <p className="text-sm text-muted-foreground">
                      Rate limits are enforced per API key. Check response headers:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li><code className="text-xs bg-muted px-1 rounded">X-RateLimit-Limit</code> - Max requests per minute</li>
                      <li><code className="text-xs bg-muted px-1 rounded">X-RateLimit-Remaining</code> - Remaining requests</li>
                      <li><code className="text-xs bg-muted px-1 rounded">X-RateLimit-Reset</code> - Reset timestamp</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Bulk Operations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    All entities support bulk operations at <code className="text-xs bg-muted px-1 rounded">/api/v1/{'{entity}'}/bulk</code>
                  </p>

                  <div className="space-y-2">
                    <h4 className="font-medium">Bulk Create (POST)</h4>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs">
                      <code>{`{ "records": [{ ... }, { ... }] }`}</code>
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Bulk Update (PATCH)</h4>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs">
                      <code>{`{ "ids": ["uuid1", "uuid2"], "data": { "field": "value" } }`}</code>
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Bulk Delete (DELETE)</h4>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs">
                      <code>{`{ "ids": ["uuid1", "uuid2"] }`}</code>
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Response</h4>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs">
                      <code>{`{ "success_count": 2, "failure_count": 0, "errors": [] }`}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* Webhooks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="w-5 h-5" />
                    Webhook Events
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Subscribe to these events for real-time notifications:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {WEBHOOK_EVENTS.map(({ event, description }) => (
                      <div key={event} className="flex items-start gap-2 text-sm">
                        <code className="px-1.5 py-0.5 bg-muted rounded text-xs shrink-0">
                          {event}
                        </code>
                        <span className="text-muted-foreground text-xs">{description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : selectedEntityMeta && (
            <>
              {/* Entity Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    {selectedEntityMeta.plural_label}
                  </CardTitle>
                  <CardDescription>{selectedEntityMeta.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    /api/v1/{selectedEntityMeta.name}
                  </code>
                </CardContent>
              </Card>

              {/* Endpoints */}
              <Card>
                <CardHeader>
                  <CardTitle>Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* List */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('list')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.GET}`}>
                        GET
                      </span>
                      <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}</code>
                      <span className="text-sm text-muted-foreground ml-auto mr-2">
                        List all {selectedEntityMeta.plural_label.toLowerCase()}
                      </span>
                      {expandedSections.has('list') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {expandedSections.has('list') && (
                      <div className="border-t p-4 bg-muted/30 text-sm space-y-3">
                        <div>
                          <h5 className="font-medium mb-2">Query Parameters</h5>
                          <ul className="space-y-1 text-muted-foreground">
                            <li><code className="text-xs bg-muted px-1 rounded">page</code> - Page number (default: 1)</li>
                            <li><code className="text-xs bg-muted px-1 rounded">limit</code> - Records per page (default: 50, max: 100)</li>
                            <li><code className="text-xs bg-muted px-1 rounded">sort_by</code> - Field to sort by</li>
                            <li><code className="text-xs bg-muted px-1 rounded">sort_order</code> - asc or desc</li>
                            <li><code className="text-xs bg-muted px-1 rounded">fields</code> - Comma-separated field list</li>
                            {expandableRels.length > 0 && (
                              <li><code className="text-xs bg-muted px-1 rounded">expand</code> - {expandableRels.join(', ')}</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Get */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('get')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.GET}`}>
                        GET
                      </span>
                      <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}/:id</code>
                      <span className="text-sm text-muted-foreground ml-auto mr-2">
                        Get a single {selectedEntityMeta.label.toLowerCase()}
                      </span>
                      {expandedSections.has('get') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Create */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('create')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.POST}`}>
                        POST
                      </span>
                      <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}</code>
                      <span className="text-sm text-muted-foreground ml-auto mr-2">
                        Create a new {selectedEntityMeta.label.toLowerCase()}
                      </span>
                      {expandedSections.has('create') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Update */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('update')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.PATCH}`}>
                        PATCH
                      </span>
                      <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}/:id</code>
                      <span className="text-sm text-muted-foreground ml-auto mr-2">
                        Update a {selectedEntityMeta.label.toLowerCase()}
                      </span>
                      {expandedSections.has('update') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="border rounded-lg">
                    <button
                      onClick={() => toggleSection('delete')}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                    >
                      <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.DELETE}`}>
                        DELETE
                      </span>
                      <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}/:id</code>
                      <span className="text-sm text-muted-foreground ml-auto mr-2">
                        Delete a {selectedEntityMeta.label.toLowerCase()}
                      </span>
                      {expandedSections.has('delete') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Search */}
                  {searchableFields.length > 0 && (
                    <div className="border rounded-lg">
                      <button
                        onClick={() => toggleSection('search')}
                        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50"
                      >
                        <span className={`px-2 py-1 text-xs font-mono font-medium rounded border ${methodColors.GET}`}>
                          GET
                        </span>
                        <code className="text-sm font-mono">/api/v1/{selectedEntityMeta.name}/search</code>
                        <span className="text-sm text-muted-foreground ml-auto mr-2">
                          Search {selectedEntityMeta.plural_label.toLowerCase()}
                        </span>
                        {expandedSections.has('search') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Fields */}
              <Card>
                <CardHeader>
                  <CardTitle>Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium">Field</th>
                          <th className="text-left py-2 px-3 font-medium">Type</th>
                          <th className="text-left py-2 px-3 font-medium">Required</th>
                          <th className="text-left py-2 px-3 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntityMeta.fields.map((field) => (
                          <tr key={field.name} className="border-b last:border-0">
                            <td className="py-2 px-3">
                              <code className="text-xs">{field.name}</code>
                              {field.read_only && (
                                <span className="ml-2 text-xs text-muted-foreground">(read-only)</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {field.type}
                              {field.enum_values && (
                                <span className="text-xs ml-1">
                                  ({field.enum_values.join(' | ')})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {field.required && !field.read_only ? (
                                <span className="text-green-600 dark:text-green-400">Yes</span>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {field.description || field.label}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Relationships */}
              {selectedEntityMeta.relationships.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Relationships</CardTitle>
                    <CardDescription>
                      Use the <code className="text-xs bg-muted px-1 rounded">expand</code> parameter to include related data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedEntityMeta.relationships.map((rel) => (
                        <div
                          key={rel.name}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <code className="text-sm font-medium">{rel.name}</code>
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">
                            {rel.type}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            → {rel.target_entity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
