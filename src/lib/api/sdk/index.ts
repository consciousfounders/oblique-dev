// SDK Index - Export all SDK generators and utilities

export * from './javascript'
export { generatePythonSDK, generatePythonWebhookHandler } from './python'

// SDK Download utilities

/**
 * Download SDK as a file
 */
export function downloadSDK(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
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

/**
 * Download JavaScript SDK
 */
export async function downloadJavaScriptSDK(): Promise<void> {
  const { generateSDKCode } = await import('./javascript')
  downloadSDK(generateSDKCode(), 'oblique-crm-sdk.ts', 'application/typescript')
}

/**
 * Download Python SDK
 */
export async function downloadPythonSDK(): Promise<void> {
  const { generatePythonSDK: genPython } = await import('./python')
  downloadSDK(genPython(), 'oblique_crm_sdk.py', 'text/x-python')
}

/**
 * Get SDK code snippets for display in documentation
 */
export interface SDKSnippets {
  javascript: {
    setup: string
    list: string
    create: string
    update: string
    delete: string
    search: string
    bulk: string
  }
  python: {
    setup: string
    list: string
    create: string
    update: string
    delete: string
    search: string
    bulk: string
  }
  curl: {
    list: string
    get: string
    create: string
    update: string
    delete: string
    search: string
  }
}

export function getSDKSnippets(baseUrl: string, entity: string = 'accounts'): SDKSnippets {
  return {
    javascript: {
      setup: `import { ObliqueCRM } from 'oblique-crm-sdk';

const crm = new ObliqueCRM({
  apiKey: 'obl_your_api_key_here',
});`,
      list: `// List ${entity} with pagination
const ${entity} = await crm.${entity}.list({
  page: 1,
  limit: 25,
  sortBy: 'created_at',
  sortOrder: 'desc',
});

console.log(\`Found \${${entity}.meta.total} ${entity}\`);`,
      create: `// Create a new record
const new${entity.charAt(0).toUpperCase() + entity.slice(1, -1)} = await crm.${entity}.create({
  name: 'Example Name',
  // ... other fields
});`,
      update: `// Update a record
const updated = await crm.${entity}.update('uuid-here', {
  name: 'Updated Name',
});`,
      delete: `// Delete a record
await crm.${entity}.delete('uuid-here');`,
      search: `// Search ${entity}
const results = await crm.${entity}.search('query');`,
      bulk: `// Bulk create
const result = await crm.${entity}.bulkCreate([
  { name: 'Record 1' },
  { name: 'Record 2' },
]);`,
    },
    python: {
      setup: `from oblique_crm import ObliqueCRM

crm = ObliqueCRM(api_key='obl_your_api_key_here')`,
      list: `# List ${entity} with pagination
${entity} = crm.${entity}.list(page=1, limit=25)
print(f"Found {${entity}.meta.total} ${entity}")`,
      create: `# Create a new record
new_record = crm.${entity}.create({
    'name': 'Example Name',
    # ... other fields
})`,
      update: `# Update a record
updated = crm.${entity}.update('uuid-here', {
    'name': 'Updated Name'
})`,
      delete: `# Delete a record
crm.${entity}.delete('uuid-here')`,
      search: `# Search ${entity}
results = crm.${entity}.search('query')`,
      bulk: `# Bulk create
result = crm.${entity}.bulk_create([
    {'name': 'Record 1'},
    {'name': 'Record 2'},
])`,
    },
    curl: {
      list: `curl -X GET "${baseUrl}/api/v1/${entity}?page=1&limit=25" \\
  -H "Authorization: Bearer obl_your_api_key"`,
      get: `curl -X GET "${baseUrl}/api/v1/${entity}/{id}" \\
  -H "Authorization: Bearer obl_your_api_key"`,
      create: `curl -X POST "${baseUrl}/api/v1/${entity}" \\
  -H "Authorization: Bearer obl_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Example Name"}'`,
      update: `curl -X PATCH "${baseUrl}/api/v1/${entity}/{id}" \\
  -H "Authorization: Bearer obl_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Updated Name"}'`,
      delete: `curl -X DELETE "${baseUrl}/api/v1/${entity}/{id}" \\
  -H "Authorization: Bearer obl_your_api_key"`,
      search: `curl -X GET "${baseUrl}/api/v1/${entity}/search?q=query" \\
  -H "Authorization: Bearer obl_your_api_key"`,
    },
  }
}
