// API Versioning System
// Handles API version negotiation and compatibility

// Supported API versions
export const API_VERSIONS = ['v1'] as const
export type ApiVersion = typeof API_VERSIONS[number]

// Current/latest API version
export const CURRENT_API_VERSION: ApiVersion = 'v1'

// Deprecated versions (still supported but will be removed)
export const DEPRECATED_VERSIONS: ApiVersion[] = []

// Sunset versions (no longer supported)
export const SUNSET_VERSIONS: string[] = []

// Version metadata
export interface VersionInfo {
  version: ApiVersion
  released: string
  status: 'current' | 'supported' | 'deprecated' | 'sunset'
  deprecationDate?: string
  sunsetDate?: string
  changelog?: string[]
}

// Version information registry
export const VERSION_INFO: Record<ApiVersion, VersionInfo> = {
  v1: {
    version: 'v1',
    released: '2025-01-01',
    status: 'current',
    changelog: [
      'Initial API release',
      'Full CRUD operations for all entities',
      'Search and filtering capabilities',
      'Bulk operations support',
      'Pagination and field selection',
      'Relationship expansion',
      'API key authentication',
      'Rate limiting',
      'Webhook support',
      'OAuth 2.0 authorization',
    ],
  },
}

// Parse version from request path or header
export function parseVersion(path: string, headers?: Record<string, string>): ApiVersion | null {
  // Check path for version (e.g., /api/v1/accounts)
  const pathMatch = path.match(/\/api\/(v\d+)\//)
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion
    if (API_VERSIONS.includes(version)) {
      return version
    }
  }

  // Check Accept header for version (e.g., application/vnd.oblique.v1+json)
  const acceptHeader = headers?.['Accept'] || headers?.['accept']
  if (acceptHeader) {
    const headerMatch = acceptHeader.match(/application\/vnd\.oblique\.(v\d+)\+json/)
    if (headerMatch) {
      const version = headerMatch[1] as ApiVersion
      if (API_VERSIONS.includes(version)) {
        return version
      }
    }
  }

  // Check X-API-Version header
  const versionHeader = headers?.['X-API-Version'] || headers?.['x-api-version']
  if (versionHeader && API_VERSIONS.includes(versionHeader as ApiVersion)) {
    return versionHeader as ApiVersion
  }

  // Default to current version
  return CURRENT_API_VERSION
}

// Check if a version is valid
export function isValidVersion(version: string): version is ApiVersion {
  return API_VERSIONS.includes(version as ApiVersion)
}

// Check if a version is deprecated
export function isDeprecatedVersion(version: ApiVersion): boolean {
  return DEPRECATED_VERSIONS.includes(version)
}

// Check if a version is sunset (no longer supported)
export function isSunsetVersion(version: string): boolean {
  return SUNSET_VERSIONS.includes(version)
}

// Get version info
export function getVersionInfo(version: ApiVersion): VersionInfo {
  return VERSION_INFO[version]
}

// Get all version info
export function getAllVersionInfo(): VersionInfo[] {
  return Object.values(VERSION_INFO)
}

// Get deprecation warning headers if applicable
export function getVersionHeaders(version: ApiVersion): Record<string, string> {
  const headers: Record<string, string> = {
    'X-API-Version': version,
  }

  const info = VERSION_INFO[version]

  if (info.status === 'deprecated') {
    headers['Deprecation'] = info.deprecationDate || 'true'
    if (info.sunsetDate) {
      headers['Sunset'] = info.sunsetDate
    }
    headers['X-API-Deprecated'] = 'true'
  }

  return headers
}

// Version compatibility checker
export interface VersionCompatibility {
  compatible: boolean
  message?: string
  suggestedVersion?: ApiVersion
}

export function checkVersionCompatibility(requestedVersion: string): VersionCompatibility {
  // Check if version is sunset
  if (isSunsetVersion(requestedVersion)) {
    return {
      compatible: false,
      message: `API version ${requestedVersion} is no longer supported. Please upgrade to ${CURRENT_API_VERSION}.`,
      suggestedVersion: CURRENT_API_VERSION,
    }
  }

  // Check if version is valid
  if (!isValidVersion(requestedVersion)) {
    return {
      compatible: false,
      message: `Invalid API version: ${requestedVersion}. Supported versions: ${API_VERSIONS.join(', ')}`,
      suggestedVersion: CURRENT_API_VERSION,
    }
  }

  // Check if version is deprecated
  if (isDeprecatedVersion(requestedVersion)) {
    const info = VERSION_INFO[requestedVersion]
    return {
      compatible: true,
      message: `API version ${requestedVersion} is deprecated${info.sunsetDate ? ` and will be removed on ${info.sunsetDate}` : ''}. Please upgrade to ${CURRENT_API_VERSION}.`,
      suggestedVersion: CURRENT_API_VERSION,
    }
  }

  return { compatible: true }
}

// Migration guides between versions
export interface MigrationGuide {
  fromVersion: string
  toVersion: ApiVersion
  changes: {
    type: 'breaking' | 'deprecation' | 'addition' | 'removal'
    description: string
    migrationSteps?: string[]
  }[]
}

export const MIGRATION_GUIDES: MigrationGuide[] = [
  // Future migrations will be added here
  // Example:
  // {
  //   fromVersion: 'v1',
  //   toVersion: 'v2',
  //   changes: [
  //     {
  //       type: 'breaking',
  //       description: 'Changed response format for list endpoints',
  //       migrationSteps: [
  //         'Update client to handle new response structure',
  //         'Response now includes "data" wrapper for all endpoints',
  //       ],
  //     },
  //   ],
  // },
]

// Get migration guide between versions
export function getMigrationGuide(fromVersion: string, toVersion: ApiVersion): MigrationGuide | null {
  return MIGRATION_GUIDES.find(
    guide => guide.fromVersion === fromVersion && guide.toVersion === toVersion
  ) || null
}

// API version response for /api/versions endpoint
export interface VersionsResponse {
  current: ApiVersion
  supported: ApiVersion[]
  deprecated: ApiVersion[]
  versions: VersionInfo[]
}

export function getVersionsResponse(): VersionsResponse {
  return {
    current: CURRENT_API_VERSION,
    supported: [...API_VERSIONS],
    deprecated: [...DEPRECATED_VERSIONS],
    versions: getAllVersionInfo(),
  }
}

// Build versioned API path
export function buildVersionedPath(path: string, version: ApiVersion = CURRENT_API_VERSION): string {
  // Remove any existing version prefix
  const cleanPath = path.replace(/^\/api\/v\d+/, '').replace(/^\//, '')
  return `/api/${version}/${cleanPath}`
}

// Extract path without version prefix
export function extractPathWithoutVersion(path: string): string {
  return path.replace(/^\/api\/v\d+\/?/, '/')
}
