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
  Terminal,
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

              {/* SDK Code Examples */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    SDK & Code Examples
                  </CardTitle>
                  <CardDescription>
                    Ready-to-use code snippets for integrating with the Oblique CRM API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* JavaScript/TypeScript SDK */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-xs font-mono">JS</span>
                      JavaScript / TypeScript
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Initialize the client:</p>
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                        <code>{`// oblique-sdk.ts
class ObliqueCRM {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = '${baseUrl}/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }

    return response.json();
  }

  // Accounts
  async listAccounts(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>);
    return this.request(\`/accounts?\${query}\`);
  }

  async getAccount(id: string) {
    return this.request(\`/accounts/\${id}\`);
  }

  async createAccount(data: { name: string; domain?: string; industry?: string }) {
    return this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(id: string, data: Partial<{ name: string; domain: string }>) {
    return this.request(\`/accounts/\${id}\`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request(\`/accounts/\${id}\`, { method: 'DELETE' });
  }

  // Similar methods for contacts, leads, deals...
}

// Usage
const crm = new ObliqueCRM('obl_your_api_key_here');

// List accounts with pagination
const accounts = await crm.listAccounts({ page: 1, limit: 50 });

// Create a new account
const newAccount = await crm.createAccount({
  name: 'Acme Corp',
  domain: 'acme.com',
  industry: 'Technology'
});`}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Python SDK */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-mono">PY</span>
                      Python
                    </h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Python SDK implementation:</p>
                      <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                        <code>{`# oblique_sdk.py
import requests
from typing import Optional, Dict, Any, List

class ObliqueCRM:
    def __init__(self, api_key: str, base_url: str = '${baseUrl}/api/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        response = self.session.request(
            method,
            f'{self.base_url}{endpoint}',
            **kwargs
        )
        response.raise_for_status()
        return response.json()

    # Accounts
    def list_accounts(
        self,
        page: int = 1,
        limit: int = 50,
        sort_by: Optional[str] = None,
        sort_order: str = 'asc'
    ) -> Dict[str, Any]:
        params = {'page': page, 'limit': limit}
        if sort_by:
            params['sort_by'] = sort_by
            params['sort_order'] = sort_order
        return self._request('GET', '/accounts', params=params)

    def get_account(self, account_id: str, expand: Optional[List[str]] = None) -> Dict[str, Any]:
        params = {}
        if expand:
            params['expand'] = ','.join(expand)
        return self._request('GET', f'/accounts/{account_id}', params=params)

    def create_account(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._request('POST', '/accounts', json=data)

    def update_account(self, account_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._request('PATCH', f'/accounts/{account_id}', json=data)

    def delete_account(self, account_id: str) -> Dict[str, Any]:
        return self._request('DELETE', f'/accounts/{account_id}')

    # Bulk operations
    def bulk_create_contacts(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        return self._request('POST', '/contacts/bulk', json={'records': records})

    # Search
    def search_contacts(self, query: str, page: int = 1, limit: int = 50) -> Dict[str, Any]:
        return self._request('GET', '/contacts/search', params={
            'q': query, 'page': page, 'limit': limit
        })


# Usage
crm = ObliqueCRM('obl_your_api_key_here')

# List accounts
accounts = crm.list_accounts(page=1, limit=25)
print(f"Found {accounts['meta']['total']} accounts")

# Create a contact
contact = crm.create_account({
    'name': 'Acme Corporation',
    'domain': 'acme.com',
    'industry': 'Technology'
})

# Get account with expanded relationships
account = crm.get_account(contact['data']['id'], expand=['contacts', 'deals'])`}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Webhook Handler Example */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Webhook Handler Examples</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Express.js (Node.js):</p>
                        <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                          <code>{`const crypto = require('crypto');
const express = require('express');
const app = express();

app.use(express.raw({ type: 'application/json' }));

const WEBHOOK_SECRET = 'whsec_your_secret';

app.post('/webhooks/oblique', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  // Verify signature
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');

  if (!crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  switch (event.event) {
    case 'deal.won':
      console.log('Deal won:', event.data);
      // Handle won deal...
      break;
    case 'contact.created':
      console.log('New contact:', event.data);
      // Handle new contact...
      break;
  }

  res.json({ received: true });
});`}</code>
                        </pre>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Flask (Python):</p>
                        <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                          <code>{`import hmac
import hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = 'whsec_your_secret'

def verify_signature(payload, signature):
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/webhooks/oblique', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data()

    if not verify_signature(payload, signature):
        return jsonify({'error': 'Invalid signature'}), 401

    event = request.get_json()

    if event['event'] == 'deal.won':
        print(f"Deal won: {event['data']}")
        # Handle won deal...
    elif event['event'] == 'contact.created':
        print(f"New contact: {event['data']}")
        # Handle new contact...

    return jsonify({'received': True})`}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* OAuth Flow Example */}
                  <div className="space-y-3">
                    <h4 className="font-medium">OAuth 2.0 Integration Example</h4>
                    <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
                      <code>{`// OAuth 2.0 Authorization Code Flow - React Example

// Step 1: Redirect user to authorization
function startOAuthFlow() {
  const params = new URLSearchParams({
    client_id: 'your_client_id',
    redirect_uri: 'https://yourapp.com/callback',
    response_type: 'code',
    scope: 'accounts:read contacts:read deals:write',
    state: crypto.randomUUID(), // Store this to verify later
  });

  window.location.href = \`${baseUrl}/oauth/authorize?\${params}\`;
}

// Step 2: Handle callback and exchange code for tokens
async function handleOAuthCallback(code: string, state: string) {
  // Verify state matches what you stored

  const response = await fetch('${baseUrl}/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: 'your_client_id',
      client_secret: 'your_client_secret',
      code: code,
      redirect_uri: 'https://yourapp.com/callback',
    }),
  });

  const tokens = await response.json();
  // tokens = { access_token, refresh_token, expires_in, token_type }

  // Store tokens securely and use access_token for API requests
}

// Step 3: Refresh expired tokens
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('${baseUrl}/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: 'your_client_id',
      client_secret: 'your_client_secret',
      refresh_token: refreshToken,
    }),
  });

  return response.json();
}`}</code>
                    </pre>
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
