// Base Enrichment Provider Interface
// All enrichment providers must implement this interface

import type {
  EnrichmentProvider,
  CompanyEnrichmentData,
  ContactEnrichmentData,
  EnrichCompanyRequest,
  EnrichContactRequest,
  EnrichmentResult,
} from '@/lib/types/enrichment'

// Provider response types (raw API responses)
export interface ProviderCompanyResponse {
  success: boolean
  data?: Partial<CompanyEnrichmentData>
  error?: string
  raw?: Record<string, unknown>
}

export interface ProviderContactResponse {
  success: boolean
  data?: Partial<ContactEnrichmentData>
  error?: string
  raw?: Record<string, unknown>
}

// Rate limit info from provider
export interface ProviderRateLimitInfo {
  remaining: number
  limit: number
  reset_at?: Date
}

// Abstract base provider class
export abstract class BaseEnrichmentProvider {
  protected apiKey: string
  protected baseUrl: string
  public readonly provider: EnrichmentProvider

  constructor(apiKey: string, provider: EnrichmentProvider) {
    this.apiKey = apiKey
    this.provider = provider
    this.baseUrl = ''
  }

  // Abstract methods that each provider must implement
  abstract enrichCompany(request: EnrichCompanyRequest): Promise<EnrichmentResult<CompanyEnrichmentData>>
  abstract enrichContact(request: EnrichContactRequest): Promise<EnrichmentResult<ContactEnrichmentData>>

  // Optional methods with default implementations
  async verifyEmail(_email: string): Promise<{ valid: boolean; reason?: string }> {
    return { valid: true }
  }

  async verifyPhone(_phone: string): Promise<{ valid: boolean; type?: string }> {
    return { valid: true }
  }

  async getRateLimitInfo(): Promise<ProviderRateLimitInfo | null> {
    return null
  }

  // Helper method for making HTTP requests
  protected async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string; status: number }> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        return {
          error: `API error: ${response.status} - ${errorText}`,
          status: response.status,
        }
      }

      const data = await response.json() as T
      return { data, status: response.status }
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 0,
      }
    }
  }

  // Get authorization headers (can be overridden by providers)
  protected getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    }
  }

  // Check if the provider supports a capability
  abstract supportsCompanyEnrichment(): boolean
  abstract supportsContactEnrichment(): boolean
  abstract supportsEmailVerification(): boolean
  abstract supportsTechnographics(): boolean
}

// Provider factory type
export type ProviderFactory = (apiKey: string) => BaseEnrichmentProvider
