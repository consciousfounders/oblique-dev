import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getAllEntityMetadata,
  getEntityMetadata,
  getExpandableRelationships,
} from '@/lib/api/metadata'
import { apiClient, type QueryParams, type EntityType } from '@/lib/api/client'
import { Play, Check, Copy, Loader2 } from 'lucide-react'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export function ApiExplorer() {
  const entities = getAllEntityMetadata()
  const [selectedEntity, setSelectedEntity] = useState(entities[0]?.name || '')
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [resourceId, setResourceId] = useState('')
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState<string>('')
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const entityMeta = getEntityMetadata(selectedEntity)
  const expandableRels = getExpandableRelationships(selectedEntity)

  function getEndpoint(): string {
    let endpoint = `/api/v1/${selectedEntity}`
    if (resourceId && (method === 'GET' || method === 'PATCH' || method === 'DELETE')) {
      endpoint += `/${resourceId}`
    }
    return endpoint
  }

  function buildCurlCommand(): string {
    const endpoint = getEndpoint()
    const params = new URLSearchParams()
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) params.append(key, value)
    })
    const queryString = params.toString() ? `?${params.toString()}` : ''

    let curl = `curl -X ${method} "https://api.oblique.dev${endpoint}${queryString}" \\
  -H "Authorization: Bearer obl_your_api_key" \\
  -H "Content-Type: application/json"`

    if ((method === 'POST' || method === 'PATCH') && requestBody) {
      curl += ` \\
  -d '${requestBody}'`
    }

    return curl
  }

  async function executeRequest() {
    setLoading(true)
    setResponse('')
    setResponseStatus(null)

    try {
      const startTime = Date.now()

      const params: QueryParams = {
        page: queryParams.page ? parseInt(queryParams.page) : 1,
        limit: queryParams.limit ? parseInt(queryParams.limit) : 50,
        sort_by: queryParams.sort_by || undefined,
        sort_order: (queryParams.sort_order as 'asc' | 'desc') || undefined,
        fields: queryParams.fields ? queryParams.fields.split(',') : undefined,
        expand: queryParams.expand ? queryParams.expand.split(',') : undefined,
      }

      let result: { data: unknown; error: unknown; meta?: unknown }

      switch (method) {
        case 'GET':
          if (resourceId) {
            result = await apiClient.get(selectedEntity as EntityType, resourceId, {
              fields: params.fields,
              expand: params.expand,
            })
          } else {
            result = await apiClient.list(selectedEntity as EntityType, params)
          }
          break

        case 'POST':
          try {
            const body = requestBody ? JSON.parse(requestBody) : {}
            result = await apiClient.create(selectedEntity as EntityType, body, 'demo-tenant')
          } catch {
            result = { data: null, error: { error: { code: 'parse_error', message: 'Invalid JSON body' } } }
          }
          break

        case 'PATCH':
          if (!resourceId) {
            result = { data: null, error: { error: { code: 'missing_id', message: 'Resource ID is required for PATCH' } } }
          } else {
            try {
              const body = requestBody ? JSON.parse(requestBody) : {}
              result = await apiClient.update(selectedEntity as EntityType, resourceId, body)
            } catch {
              result = { data: null, error: { error: { code: 'parse_error', message: 'Invalid JSON body' } } }
            }
          }
          break

        case 'DELETE':
          if (!resourceId) {
            result = { data: null, error: { error: { code: 'missing_id', message: 'Resource ID is required for DELETE' } } }
          } else {
            result = await apiClient.delete(selectedEntity as EntityType, resourceId)
          }
          break

        default:
          result = { data: null, error: { error: { code: 'unsupported', message: 'Unsupported method' } } }
      }

      const duration = Date.now() - startTime

      if (result.error) {
        setResponseStatus(400)
        setResponse(JSON.stringify(result.error, null, 2))
      } else {
        setResponseStatus(200)
        setResponse(
          JSON.stringify(
            {
              data: result.data,
              meta: result.meta,
              _debug: { duration_ms: duration },
            },
            null,
            2
          )
        )
      }
    } catch (err) {
      setResponseStatus(500)
      setResponse(
        JSON.stringify(
          {
            error: {
              code: 'internal_error',
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          },
          null,
          2
        )
      )
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function setExampleBody() {
    if (!entityMeta) return

    const example: Record<string, unknown> = {}
    for (const field of entityMeta.fields) {
      if (field.read_only || field.name === 'tenant_id') continue

      switch (field.type) {
        case 'string':
          example[field.name] = field.name === 'email' ? 'example@email.com' : `Example ${field.label}`
          break
        case 'number':
          example[field.name] = 0
          break
        case 'boolean':
          example[field.name] = false
          break
        case 'uuid':
          example[field.name] = '00000000-0000-0000-0000-000000000000'
          break
        case 'enum':
          example[field.name] = field.enum_values?.[0] || ''
          break
        case 'date':
          example[field.name] = new Date().toISOString().split('T')[0]
          break
        case 'datetime':
          example[field.name] = new Date().toISOString()
          break
      }
    }

    setRequestBody(JSON.stringify(example, null, 2))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Explorer</CardTitle>
          <CardDescription>
            Test API requests interactively. Note: This uses your current session for authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Entity and Method Selection */}
          <div className="flex gap-4 flex-wrap">
            <div className="w-32">
              <label className="text-sm font-medium block mb-1.5">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium block mb-1.5">Entity</label>
              <select
                value={selectedEntity}
                onChange={(e) => {
                  setSelectedEntity(e.target.value)
                  setResourceId('')
                  setRequestBody('')
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                {entities.map((entity) => (
                  <option key={entity.name} value={entity.name}>
                    {entity.plural_label}
                  </option>
                ))}
              </select>
            </div>

            {(method !== 'POST') && (
              <div className="w-72">
                <label className="text-sm font-medium block mb-1.5">Resource ID (optional)</label>
                <Input
                  placeholder="UUID"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Endpoint Preview */}
          <div className="p-3 bg-muted rounded-md">
            <span className={`font-mono text-sm font-medium ${
              method === 'GET' ? 'text-green-600 dark:text-green-400' :
              method === 'POST' ? 'text-blue-600 dark:text-blue-400' :
              method === 'PATCH' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {method}
            </span>
            <span className="font-mono text-sm ml-2">{getEndpoint()}</span>
          </div>

          {/* Query Parameters (for GET) */}
          {method === 'GET' && !resourceId && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Query Parameters</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">page</label>
                  <Input
                    type="number"
                    placeholder="1"
                    value={queryParams.page || ''}
                    onChange={(e) => setQueryParams(p => ({ ...p, page: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">limit</label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={queryParams.limit || ''}
                    onChange={(e) => setQueryParams(p => ({ ...p, limit: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">sort_by</label>
                  <select
                    value={queryParams.sort_by || ''}
                    onChange={(e) => setQueryParams(p => ({ ...p, sort_by: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Default</option>
                    {entityMeta?.fields.map((field) => (
                      <option key={field.name} value={field.name}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">sort_order</label>
                  <select
                    value={queryParams.sort_order || ''}
                    onChange={(e) => setQueryParams(p => ({ ...p, sort_order: e.target.value }))}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">Ascending</option>
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">fields (comma-separated)</label>
                  <Input
                    placeholder="id,name,email"
                    value={queryParams.fields || ''}
                    onChange={(e) => setQueryParams(p => ({ ...p, fields: e.target.value }))}
                  />
                </div>
                {expandableRels.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">expand</label>
                    <select
                      value={queryParams.expand || ''}
                      onChange={(e) => setQueryParams(p => ({ ...p, expand: e.target.value }))}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">None</option>
                      {expandableRels.map((rel) => (
                        <option key={rel} value={rel}>
                          {rel}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Request Body (for POST/PATCH) */}
          {(method === 'POST' || method === 'PATCH') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Request Body (JSON)</label>
                <Button variant="outline" size="sm" onClick={setExampleBody}>
                  Generate Example
                </Button>
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full h-48 p-3 rounded-md border border-input bg-background font-mono text-sm resize-none"
                placeholder="{}"
              />
            </div>
          )}

          {/* Execute Button */}
          <div className="flex items-center gap-3">
            <Button onClick={executeRequest} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Execute Request
                </>
              )}
            </Button>
          </div>

          {/* Response */}
          {response && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Response</label>
                  {responseStatus && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {responseStatus}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(response)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto max-h-96 overflow-y-auto">
                <code>{response}</code>
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* cURL Command */}
      <Card>
        <CardHeader>
          <CardTitle>cURL Command</CardTitle>
          <CardDescription>Copy this command to run in your terminal</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{buildCurlCommand()}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(buildCurlCommand())}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
