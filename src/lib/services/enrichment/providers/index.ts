// Enrichment Providers Index
// Export all provider implementations

export { BaseEnrichmentProvider, type ProviderFactory, type ProviderRateLimitInfo } from './base'
export { ClearbitProvider, createClearbitProvider } from './clearbit'
export { ApolloProvider, createApolloProvider } from './apollo'

import type { EnrichmentProvider } from '@/lib/types/enrichment'
import { BaseEnrichmentProvider } from './base'
import { ClearbitProvider } from './clearbit'
import { ApolloProvider } from './apollo'

// Provider factory map
export const providerFactories: Record<string, (apiKey: string) => BaseEnrichmentProvider> = {
  clearbit: (apiKey: string) => new ClearbitProvider(apiKey),
  apollo: (apiKey: string) => new ApolloProvider(apiKey),
}

// Create provider instance by type
export function createProvider(
  provider: EnrichmentProvider,
  apiKey: string
): BaseEnrichmentProvider | null {
  const factory = providerFactories[provider]
  if (!factory) {
    console.warn(`Unknown enrichment provider: ${provider}`)
    return null
  }
  return factory(apiKey)
}
