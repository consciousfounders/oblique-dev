// OpenAPI 3.0 Specification Generator for Oblique CRM API
// Automatically generates OpenAPI spec from entity metadata

import { getAllEntityMetadata } from './metadata'
import type { EntityMetadata, FieldMetadata } from './types'
import { API_SCOPES, WEBHOOK_EVENTS } from './types'

interface OpenAPISpec {
  openapi: string
  info: {
    title: string
    description: string
    version: string
    contact: { email: string }
    license: { name: string; url: string }
  }
  servers: { url: string; description: string }[]
  tags: { name: string; description: string }[]
  paths: Record<string, unknown>
  components: {
    schemas: Record<string, unknown>
    securitySchemes: Record<string, unknown>
    parameters: Record<string, unknown>
    responses: Record<string, unknown>
  }
  security: { ApiKeyAuth: string[] }[]
}

// Convert field type to OpenAPI type
function fieldTypeToOpenAPI(field: FieldMetadata): Record<string, unknown> {
  const base: Record<string, unknown> = {}

  switch (field.type) {
    case 'string':
      base.type = 'string'
      if (field.max_length) base.maxLength = field.max_length
      break
    case 'number':
      base.type = 'number'
      break
    case 'boolean':
      base.type = 'boolean'
      break
    case 'uuid':
      base.type = 'string'
      base.format = 'uuid'
      break
    case 'date':
      base.type = 'string'
      base.format = 'date'
      break
    case 'datetime':
      base.type = 'string'
      base.format = 'date-time'
      break
    case 'enum':
      base.type = 'string'
      if (field.enum_values) base.enum = field.enum_values
      break
  }

  if (field.description) base.description = field.description
  if (field.nullable) base.nullable = true

  return base
}

// Generate schema for an entity
function generateEntitySchema(entity: EntityMetadata): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const field of entity.fields) {
    properties[field.name] = fieldTypeToOpenAPI(field)
    if (field.required && !field.read_only) {
      required.push(field.name)
    }
  }

  return {
    type: 'object',
    description: entity.description,
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

// Generate create/update schema (only writable fields)
function generateWriteSchema(entity: EntityMetadata, isUpdate: boolean): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const field of entity.fields) {
    if (field.read_only) continue
    if (field.name === 'tenant_id') continue // Auto-set by system

    properties[field.name] = fieldTypeToOpenAPI(field)
    if (field.required && !isUpdate) {
      required.push(field.name)
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  }
}

// Generate paths for an entity
function generateEntityPaths(entity: EntityMetadata): Record<string, unknown> {
  const basePath = `/api/v1/${entity.name}`
  const tag = entity.label
  const paths: Record<string, unknown> = {}

  // List endpoint
  paths[basePath] = {
    get: {
      tags: [tag],
      summary: `List ${entity.plural_label}`,
      description: `Retrieve a paginated list of ${entity.plural_label.toLowerCase()}`,
      operationId: `list${entity.label.replace(/\s/g, '')}s`,
      parameters: [
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/sort_by' },
        { $ref: '#/components/parameters/sort_order' },
        { $ref: '#/components/parameters/fields' },
        { $ref: '#/components/parameters/expand' },
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}` },
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:read`] }],
    },
    post: {
      tags: [tag],
      summary: `Create ${entity.label}`,
      description: `Create a new ${entity.label.toLowerCase()}`,
      operationId: `create${entity.label.replace(/\s/g, '')}`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}Create` },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}` },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
  }

  // Single item endpoint
  paths[`${basePath}/{id}`] = {
    get: {
      tags: [tag],
      summary: `Get ${entity.label}`,
      description: `Retrieve a single ${entity.label.toLowerCase()} by ID`,
      operationId: `get${entity.label.replace(/\s/g, '')}`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: `${entity.label} ID`,
        },
        { $ref: '#/components/parameters/fields' },
        { $ref: '#/components/parameters/expand' },
      ],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}` },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:read`] }],
    },
    patch: {
      tags: [tag],
      summary: `Update ${entity.label}`,
      description: `Update an existing ${entity.label.toLowerCase()}`,
      operationId: `update${entity.label.replace(/\s/g, '')}`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: `${entity.label} ID`,
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}Update` },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}` },
                },
              },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
    delete: {
      tags: [tag],
      summary: `Delete ${entity.label}`,
      description: `Delete a ${entity.label.toLowerCase()} by ID`,
      operationId: `delete${entity.label.replace(/\s/g, '')}`,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: `${entity.label} ID`,
        },
      ],
      responses: {
        '200': {
          description: 'Deleted successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'object',
                    properties: {
                      deleted: { type: 'boolean', example: true },
                    },
                  },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '404': { $ref: '#/components/responses/NotFound' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
  }

  // Bulk operations endpoint
  paths[`${basePath}/bulk`] = {
    post: {
      tags: [tag],
      summary: `Bulk create ${entity.plural_label}`,
      description: `Create multiple ${entity.plural_label.toLowerCase()} in a single request`,
      operationId: `bulkCreate${entity.label.replace(/\s/g, '')}s`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                records: {
                  type: 'array',
                  items: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}Create` },
                  maxItems: 100,
                },
              },
              required: ['records'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Bulk operation completed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BulkOperationResult' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
    patch: {
      tags: [tag],
      summary: `Bulk update ${entity.plural_label}`,
      description: `Update multiple ${entity.plural_label.toLowerCase()} in a single request`,
      operationId: `bulkUpdate${entity.label.replace(/\s/g, '')}s`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' },
                  maxItems: 100,
                },
                data: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}Update` },
              },
              required: ['ids', 'data'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Bulk operation completed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BulkOperationResult' },
            },
          },
        },
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
    delete: {
      tags: [tag],
      summary: `Bulk delete ${entity.plural_label}`,
      description: `Delete multiple ${entity.plural_label.toLowerCase()} in a single request`,
      operationId: `bulkDelete${entity.label.replace(/\s/g, '')}s`,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                ids: {
                  type: 'array',
                  items: { type: 'string', format: 'uuid' },
                  maxItems: 100,
                },
              },
              required: ['ids'],
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Bulk operation completed',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BulkOperationResult' },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:write`] }],
    },
  }

  // Search endpoint
  paths[`${basePath}/search`] = {
    get: {
      tags: [tag],
      summary: `Search ${entity.plural_label}`,
      description: `Search ${entity.plural_label.toLowerCase()} by keyword`,
      operationId: `search${entity.label.replace(/\s/g, '')}s`,
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string', minLength: 1 },
          description: 'Search query',
        },
        { $ref: '#/components/parameters/page' },
        { $ref: '#/components/parameters/limit' },
        { $ref: '#/components/parameters/fields' },
        { $ref: '#/components/parameters/expand' },
      ],
      responses: {
        '200': {
          description: 'Search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: `#/components/schemas/${entity.label.replace(/\s/g, '')}` },
                  },
                  meta: { $ref: '#/components/schemas/PaginationMeta' },
                },
              },
            },
          },
        },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '403': { $ref: '#/components/responses/Forbidden' },
        '429': { $ref: '#/components/responses/RateLimited' },
      },
      security: [{ ApiKeyAuth: [`${entity.name}:read`] }],
    },
  }

  return paths
}

// Generate the complete OpenAPI specification
export function generateOpenAPISpec(baseUrl: string = ''): OpenAPISpec {
  const entities = getAllEntityMetadata()

  // Generate schemas
  const schemas: Record<string, unknown> = {
    // Common schemas
    PaginationMeta: {
      type: 'object',
      properties: {
        total: { type: 'integer', description: 'Total number of records' },
        page: { type: 'integer', description: 'Current page number' },
        limit: { type: 'integer', description: 'Records per page' },
        has_more: { type: 'boolean', description: 'Whether there are more pages' },
      },
    },
    ApiError: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Error code' },
            message: { type: 'string', description: 'Error message' },
            details: { type: 'object', description: 'Additional error details' },
          },
          required: ['code', 'message'],
        },
      },
    },
    BulkOperationResult: {
      type: 'object',
      properties: {
        success_count: { type: 'integer', description: 'Number of successful operations' },
        failure_count: { type: 'integer', description: 'Number of failed operations' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  }

  // Generate entity schemas
  for (const entity of entities) {
    const schemaName = entity.label.replace(/\s/g, '')
    schemas[schemaName] = generateEntitySchema(entity)
    schemas[`${schemaName}Create`] = generateWriteSchema(entity, false)
    schemas[`${schemaName}Update`] = generateWriteSchema(entity, true)
  }

  // Generate paths
  let paths: Record<string, unknown> = {}
  for (const entity of entities) {
    const entityPaths = generateEntityPaths(entity)
    paths = { ...paths, ...entityPaths }
  }

  // Add metadata endpoints
  paths['/api/v1/metadata'] = {
    get: {
      tags: ['Metadata'],
      summary: 'List all entities',
      description: 'Get metadata about all available entities',
      operationId: 'listEntities',
      responses: {
        '200': {
          description: 'Entity metadata list',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/EntityMetadata' },
                  },
                },
              },
            },
          },
        },
      },
      security: [{ ApiKeyAuth: [] }],
    },
  }

  paths['/api/v1/metadata/{entity}'] = {
    get: {
      tags: ['Metadata'],
      summary: 'Describe entity',
      description: 'Get detailed metadata about a specific entity',
      operationId: 'describeEntity',
      parameters: [
        {
          name: 'entity',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Entity name',
        },
      ],
      responses: {
        '200': {
          description: 'Entity metadata',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { $ref: '#/components/schemas/EntityMetadata' },
                },
              },
            },
          },
        },
        '404': { $ref: '#/components/responses/NotFound' },
      },
      security: [{ ApiKeyAuth: [] }],
    },
  }

  // Add metadata schemas
  schemas['EntityMetadata'] = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      label: { type: 'string' },
      plural_label: { type: 'string' },
      description: { type: 'string' },
      fields: {
        type: 'array',
        items: { $ref: '#/components/schemas/FieldMetadata' },
      },
      relationships: {
        type: 'array',
        items: { $ref: '#/components/schemas/RelationshipMetadata' },
      },
    },
  }

  schemas['FieldMetadata'] = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      label: { type: 'string' },
      type: { type: 'string', enum: ['string', 'number', 'boolean', 'date', 'datetime', 'uuid', 'enum'] },
      required: { type: 'boolean' },
      read_only: { type: 'boolean' },
      nullable: { type: 'boolean' },
      description: { type: 'string' },
      enum_values: { type: 'array', items: { type: 'string' } },
      max_length: { type: 'integer' },
    },
  }

  schemas['RelationshipMetadata'] = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      label: { type: 'string' },
      target_entity: { type: 'string' },
      type: { type: 'string', enum: ['belongs_to', 'has_many', 'has_one'] },
      foreign_key: { type: 'string' },
    },
  }

  // Generate tags
  const tags = entities.map(entity => ({
    name: entity.label,
    description: entity.description,
  }))
  tags.push({ name: 'Metadata', description: 'API metadata and schema information' })

  return {
    openapi: '3.0.3',
    info: {
      title: 'Oblique CRM API',
      description: `
# Introduction

The Oblique CRM API provides programmatic access to your CRM data.
This RESTful API supports full CRUD operations on all CRM entities.

## Authentication

All API requests require authentication using an API key. Include your API key in the \`Authorization\` header:

\`\`\`
Authorization: Bearer obl_your_api_key_here
\`\`\`

## Rate Limiting

API requests are rate limited per API key:
- Default: 60 requests per minute, 10,000 per day
- Rate limit headers are included in all responses

## Pagination

List endpoints support pagination with the following parameters:
- \`page\`: Page number (default: 1)
- \`limit\`: Records per page (default: 50, max: 100)

## Field Selection

Use the \`fields\` parameter to request specific fields:
\`\`\`
GET /api/v1/accounts?fields=id,name,domain
\`\`\`

## Relationship Expansion

Use the \`expand\` parameter to include related records:
\`\`\`
GET /api/v1/contacts?expand=account,owner
\`\`\`

## Scopes

API keys are scoped to specific permissions:
${API_SCOPES.map(s => `- \`${s.scope}\`: ${s.description}`).join('\n')}

## Webhooks

Subscribe to events for real-time notifications:
${WEBHOOK_EVENTS.map(e => `- \`${e.event}\`: ${e.description}`).join('\n')}
      `.trim(),
      version: '1.0.0',
      contact: {
        email: 'api@oblique.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: baseUrl || 'https://api.oblique.dev',
        description: 'Production API',
      },
    ],
    tags,
    paths,
    components: {
      schemas,
      securitySchemes: {
        ApiKeyAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          description: 'API key authentication. Prefix your key with "Bearer "',
        },
      },
      parameters: {
        page: {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number',
        },
        limit: {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          description: 'Records per page',
        },
        sort_by: {
          name: 'sort_by',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Field to sort by',
        },
        sort_order: {
          name: 'sort_order',
          in: 'query',
          required: false,
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
          description: 'Sort direction',
        },
        fields: {
          name: 'fields',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Comma-separated list of fields to return',
        },
        expand: {
          name: 'expand',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          description: 'Comma-separated list of relationships to expand',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request - invalid input',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: {
                error: {
                  code: 'bad_request',
                  message: 'Invalid input data',
                  details: { field: 'email', issue: 'Invalid email format' },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - invalid or missing API key',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: {
                error: {
                  code: 'unauthorized',
                  message: 'Invalid API key',
                },
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: {
                error: {
                  code: 'forbidden',
                  message: 'Insufficient permissions for this operation',
                },
              },
            },
          },
        },
        NotFound: {
          description: 'Not found - resource does not exist',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: {
                error: {
                  code: 'not_found',
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests - rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': {
              schema: { type: 'integer' },
              description: 'Request limit per minute',
            },
            'X-RateLimit-Remaining': {
              schema: { type: 'integer' },
              description: 'Remaining requests in current window',
            },
            'X-RateLimit-Reset': {
              schema: { type: 'integer' },
              description: 'Unix timestamp when the rate limit resets',
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: {
                error: {
                  code: 'rate_limited',
                  message: 'Rate limit exceeded. Try again later.',
                },
              },
            },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  }
}

// Get OpenAPI spec as JSON string
export function getOpenAPISpecJSON(baseUrl?: string): string {
  return JSON.stringify(generateOpenAPISpec(baseUrl), null, 2)
}

// Get OpenAPI spec as YAML string (basic conversion)
export function getOpenAPISpecYAML(baseUrl?: string): string {
  const spec = generateOpenAPISpec(baseUrl)
  return jsonToYaml(spec)
}

// Basic JSON to YAML converter
function jsonToYaml(obj: unknown, indent: number = 0): string {
  const spaces = '  '.repeat(indent)

  if (obj === null) return 'null'
  if (obj === undefined) return ''
  if (typeof obj === 'boolean') return obj ? 'true' : 'false'
  if (typeof obj === 'number') return String(obj)
  if (typeof obj === 'string') {
    if (obj.includes('\n')) {
      return `|\n${obj.split('\n').map(line => spaces + '  ' + line).join('\n')}`
    }
    if (obj.match(/[:#{}[\],&*?|<>=!%@`]/) || obj === '') {
      return `"${obj.replace(/"/g, '\\"')}"`
    }
    return obj
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    return obj.map(item => {
      const yaml = jsonToYaml(item, indent + 1)
      if (typeof item === 'object' && item !== null) {
        return `\n${spaces}- ${yaml.trim().replace(/\n/g, '\n' + spaces + '  ')}`
      }
      return `\n${spaces}- ${yaml}`
    }).join('')
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries.map(([key, value]) => {
      const yaml = jsonToYaml(value, indent + 1)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${spaces}${key}:${yaml.startsWith('\n') ? yaml : '\n' + spaces + '  ' + yaml.trim()}`
      }
      if (Array.isArray(value) && value.length > 0) {
        return `${spaces}${key}:${yaml}`
      }
      return `${spaces}${key}: ${yaml}`
    }).join('\n')
  }

  return String(obj)
}
