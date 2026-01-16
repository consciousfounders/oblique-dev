import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { generateSDKCode } from '@/lib/api/sdk/javascript'
import { generatePythonSDK, generatePythonWebhookHandler } from '@/lib/api/sdk/python'
import { getOpenAPISpecJSON, getOpenAPISpecYAML } from '@/lib/api/openapi'
import {
  Download,
  Copy,
  Check,
  FileCode2,
  ExternalLink,
  Terminal,
  Book,
  Webhook,
} from 'lucide-react'

type Language = 'javascript' | 'python' | 'curl'

export function SDKDownloads() {
  const [copied, setCopied] = useState<string | null>(null)
  const [activeLanguage, setActiveLanguage] = useState<Language>('javascript')

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://api.oblique.dev'

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const jsQuickstart = `import { ObliqueCRM } from 'oblique-crm-sdk';

// Initialize the SDK
const crm = new ObliqueCRM({
  apiKey: 'obl_your_api_key_here',
});

// List accounts
const accounts = await crm.accounts.list({ limit: 10 });
console.log(accounts);

// Create a contact
const contact = await crm.contacts.create({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
});`

  const pythonQuickstart = `from oblique_crm import ObliqueCRM

# Initialize the SDK
crm = ObliqueCRM(api_key='obl_your_api_key_here')

# List accounts
accounts = crm.accounts.list(limit=10)
print(f"Found {accounts.meta.total} accounts")

# Create a contact
contact = crm.contacts.create({
    'first_name': 'John',
    'last_name': 'Doe',
    'email': 'john@example.com',
})`

  const curlQuickstart = `# List accounts
curl -X GET "${baseUrl}/api/v1/accounts?limit=10" \\
  -H "Authorization: Bearer obl_your_api_key_here"

# Create a contact
curl -X POST "${baseUrl}/api/v1/contacts" \\
  -H "Authorization: Bearer obl_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  }'`

  const quickstarts: Record<Language, string> = {
    javascript: jsQuickstart,
    python: pythonQuickstart,
    curl: curlQuickstart,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5" />
            SDKs & Downloads
          </CardTitle>
          <CardDescription>
            Download official SDKs and API specifications for integrating with Oblique CRM
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Get up and running in seconds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={activeLanguage === 'javascript' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveLanguage('javascript')}
            >
              JavaScript
            </Button>
            <Button
              variant={activeLanguage === 'python' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveLanguage('python')}
            >
              Python
            </Button>
            <Button
              variant={activeLanguage === 'curl' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveLanguage('curl')}
            >
              cURL
            </Button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
              <code>{quickstarts[activeLanguage]}</code>
            </pre>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(quickstarts[activeLanguage], 'quickstart')}
            >
              {copied === 'quickstart' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SDK Downloads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* JavaScript SDK */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-xs font-mono">
                JS
              </span>
              JavaScript / TypeScript SDK
            </CardTitle>
            <CardDescription>
              Full-featured SDK for Node.js and browser environments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• TypeScript support with full type definitions</li>
              <li>• Automatic retry with exponential backoff</li>
              <li>• Rate limit handling</li>
              <li>• Entity-based API (accounts, contacts, leads, deals)</li>
              <li>• Bulk operations support</li>
            </ul>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => downloadFile(generateSDKCode(), 'oblique-crm-sdk.ts', 'application/typescript')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download SDK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generateSDKCode(), 'js-sdk')}
              >
                {copied === 'js-sdk' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Python SDK */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-mono">
                PY
              </span>
              Python SDK
            </CardTitle>
            <CardDescription>
              Python SDK for server-side integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Type hints with dataclasses</li>
              <li>• Requests-based HTTP client</li>
              <li>• Automatic retry with backoff</li>
              <li>• Pagination support with iterators</li>
              <li>• Webhook signature verification</li>
            </ul>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => downloadFile(generatePythonSDK(), 'oblique_crm_sdk.py', 'text/x-python')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download SDK
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatePythonSDK(), 'py-sdk')}
              >
                {copied === 'py-sdk' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Handler Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Webhook Handler Examples
          </CardTitle>
          <CardDescription>
            Example code for handling webhooks from Oblique CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(generatePythonWebhookHandler(), 'webhook_handler.py', 'text/x-python')}
            >
              <Download className="w-4 h-4 mr-2" />
              Flask Example
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* OpenAPI Specification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Book className="w-4 h-4" />
            OpenAPI Specification
          </CardTitle>
          <CardDescription>
            Download the OpenAPI 3.0 specification for use with code generators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the OpenAPI spec to generate SDKs in any language, import into Postman,
            or integrate with API documentation tools.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="default"
              size="sm"
              onClick={() => downloadFile(getOpenAPISpecJSON(baseUrl), 'oblique-crm-openapi.json', 'application/json')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(getOpenAPISpecYAML(baseUrl), 'oblique-crm-openapi.yaml', 'application/yaml')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download YAML
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(getOpenAPISpecJSON(baseUrl), 'openapi')}
            >
              {copied === 'openapi' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy JSON
            </Button>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-2">Generate SDKs with OpenAPI Generator</h4>
            <pre className="p-3 bg-muted rounded-md text-xs overflow-x-auto">
              <code>{`# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript SDK
openapi-generator-cli generate \\
  -i oblique-crm-openapi.json \\
  -g typescript-fetch \\
  -o ./generated/typescript

# Generate Python SDK
openapi-generator-cli generate \\
  -i oblique-crm-openapi.json \\
  -g python \\
  -o ./generated/python

# Generate Go SDK
openapi-generator-cli generate \\
  -i oblique-crm-openapi.json \\
  -g go \\
  -o ./generated/go`}</code>
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="#"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Book className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">API Documentation</p>
                <p className="text-xs text-muted-foreground">Complete API reference</p>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
            </a>
            <a
              href="#"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Terminal className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">API Explorer</p>
                <p className="text-xs text-muted-foreground">Test API requests</p>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
            </a>
            <a
              href="#"
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Webhook className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Webhooks Guide</p>
                <p className="text-xs text-muted-foreground">Event-driven integration</p>
              </div>
              <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
