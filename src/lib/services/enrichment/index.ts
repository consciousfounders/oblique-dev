// Enrichment Module Index
// Export all enrichment-related functionality

export { EnrichmentService, createEnrichmentService } from './enrichmentService'
export {
  BaseEnrichmentProvider,
  ClearbitProvider,
  ApolloProvider,
  createProvider,
  createClearbitProvider,
  createApolloProvider,
} from './providers'

// Re-export types for convenience
export type {
  EnrichmentProvider,
  EnrichmentStatus,
  EnrichmentTrigger,
  EnrichmentEntityType,
  CompanyEnrichmentData,
  ContactEnrichmentData,
  EnrichmentSettings,
  EnrichmentUsage,
  EnrichmentJob,
  EnrichCompanyRequest,
  EnrichContactRequest,
  EnrichmentResult,
  FundingRound,
  NewsItem,
  HiringSignals,
  GrowthSignals,
  KeyPerson,
  WorkHistoryEntry,
  EducationEntry,
  ProviderConfig,
} from '@/lib/types/enrichment'

export {
  ENRICHMENT_PROVIDERS,
  ENRICHMENT_STATUS_CONFIG,
  DEFAULT_ENRICHMENT_SETTINGS,
} from '@/lib/types/enrichment'
