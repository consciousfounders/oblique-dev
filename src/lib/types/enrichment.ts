// Data Enrichment Types

// Enrichment providers
export type EnrichmentProvider = 'clearbit' | 'apollo' | 'zoominfo' | 'rocketreach' | 'manual'

// Enrichment status
export type EnrichmentStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial' | 'stale'

// Enrichment trigger type
export type EnrichmentTrigger = 'on_create' | 'on_demand' | 'scheduled' | 'bulk'

// Entity type for enrichment
export type EnrichmentEntityType = 'contact' | 'lead' | 'account'

// Company enrichment data structure
export interface CompanyEnrichmentData {
  id?: string
  tenant_id?: string
  account_id?: string
  provider: EnrichmentProvider
  status: EnrichmentStatus
  triggered_by: EnrichmentTrigger

  // Company basic info
  legal_name?: string
  domain?: string
  logo_url?: string
  description?: string
  founded_year?: number

  // Company size and financials
  employee_count?: number
  employee_range?: string
  annual_revenue?: number
  revenue_range?: string
  funding_total?: number
  funding_rounds?: FundingRound[]
  last_funding_date?: string
  last_funding_amount?: number
  last_funding_type?: string

  // Industry classification
  industry?: string
  sub_industry?: string
  industry_tags?: string[]
  sic_codes?: string[]
  naics_codes?: string[]

  // Technologies
  technologies?: string[]
  tech_categories?: Record<string, string[]>

  // Social profiles
  linkedin_url?: string
  twitter_url?: string
  facebook_url?: string
  crunchbase_url?: string

  // Contact info
  phone?: string
  email_formats?: string[]

  // Location
  headquarters_address?: string
  headquarters_city?: string
  headquarters_state?: string
  headquarters_country?: string
  headquarters_postal_code?: string
  location_count?: number

  // News and signals
  recent_news?: NewsItem[]
  hiring_signals?: HiringSignals
  growth_signals?: GrowthSignals

  // Key personnel
  key_personnel?: KeyPerson[]

  // Metadata
  confidence_score?: number
  data_quality_score?: number
  raw_data?: Record<string, unknown>
  enriched_at?: string
  expires_at?: string
  error_message?: string
  credits_used?: number

  created_at?: string
  updated_at?: string
}

// Contact enrichment data structure
export interface ContactEnrichmentData {
  id?: string
  tenant_id?: string
  contact_id?: string
  lead_id?: string
  provider: EnrichmentProvider
  status: EnrichmentStatus
  triggered_by: EnrichmentTrigger

  // Personal info
  full_name?: string
  first_name?: string
  last_name?: string
  headline?: string
  bio?: string
  avatar_url?: string

  // Job info
  job_title?: string
  job_title_role?: string
  job_title_level?: string
  job_title_verified?: boolean
  department?: string
  seniority?: string

  // Current employment
  current_company?: string
  current_company_domain?: string
  current_company_linkedin?: string
  employment_start_date?: string

  // Contact info
  email?: string
  email_verified?: boolean
  email_type?: string
  email_confidence?: number
  phone?: string
  phone_type?: string
  mobile_phone?: string
  work_phone?: string

  // Social profiles
  linkedin_url?: string
  linkedin_id?: string
  twitter_url?: string
  github_url?: string
  personal_website?: string

  // Professional history
  work_history?: WorkHistoryEntry[]
  education_history?: EducationEntry[]
  skills?: string[]
  certifications?: string[]

  // Location
  location?: string
  city?: string
  state?: string
  country?: string
  timezone?: string

  // Metadata
  confidence_score?: number
  data_quality_score?: number
  raw_data?: Record<string, unknown>
  enriched_at?: string
  expires_at?: string
  error_message?: string
  credits_used?: number

  created_at?: string
  updated_at?: string
}

// Supporting types
export interface FundingRound {
  type: string
  amount?: number
  date?: string
  investors?: string[]
  series?: string
}

export interface NewsItem {
  title: string
  url?: string
  source?: string
  date?: string
  snippet?: string
}

export interface HiringSignals {
  is_hiring?: boolean
  open_positions?: number
  recent_hires?: number
  departments_hiring?: string[]
}

export interface GrowthSignals {
  employee_growth_rate?: number
  revenue_growth_rate?: number
  funding_momentum?: string
  market_expansion?: string[]
}

export interface KeyPerson {
  name: string
  title?: string
  linkedin_url?: string
  email?: string
  phone?: string
}

export interface WorkHistoryEntry {
  company: string
  title: string
  start_date?: string
  end_date?: string
  is_current?: boolean
  description?: string
}

export interface EducationEntry {
  school: string
  degree?: string
  field_of_study?: string
  start_year?: number
  end_year?: number
}

// Enrichment settings
export interface EnrichmentSettings {
  id?: string
  tenant_id?: string

  // Default providers
  default_company_provider: EnrichmentProvider
  default_contact_provider: EnrichmentProvider

  // Provider credentials
  clearbit_api_key_encrypted?: string
  clearbit_enabled: boolean
  apollo_api_key_encrypted?: string
  apollo_enabled: boolean
  zoominfo_api_key_encrypted?: string
  zoominfo_enabled: boolean

  // Auto-enrichment
  auto_enrich_on_create: boolean
  auto_enrich_companies: boolean
  auto_enrich_contacts: boolean
  auto_enrich_leads: boolean

  // Scheduled enrichment
  scheduled_enrichment_enabled: boolean
  enrichment_schedule_cron?: string
  max_stale_days: number

  // Rate limiting
  daily_enrichment_limit: number
  monthly_enrichment_limit: number

  // Credit budget
  monthly_credit_budget: number
  credit_alert_threshold: number

  created_at?: string
  updated_at?: string
}

// Enrichment usage tracking
export interface EnrichmentUsage {
  id?: string
  tenant_id?: string
  provider: EnrichmentProvider
  period_start: string
  period_end: string

  company_enrichments: number
  contact_enrichments: number
  total_enrichments: number
  successful_enrichments: number
  failed_enrichments: number

  credits_used: number
  credits_remaining?: number
  estimated_cost?: number

  created_at?: string
  updated_at?: string
}

// Enrichment job
export interface EnrichmentJob {
  id?: string
  tenant_id?: string
  job_type: 'company' | 'contact' | 'bulk_company' | 'bulk_contact'
  provider: EnrichmentProvider
  trigger_type: EnrichmentTrigger

  entity_ids: string[]
  total_count: number
  processed_count: number
  success_count: number
  error_count: number

  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  started_at?: string
  completed_at?: string
  error_message?: string
  progress?: Record<string, unknown>

  created_by?: string
  created_at?: string
  updated_at?: string
}

// Enrichment request/response types
export interface EnrichCompanyRequest {
  account_id: string
  domain?: string
  name?: string
  provider?: EnrichmentProvider
  force_refresh?: boolean
}

export interface EnrichContactRequest {
  contact_id?: string
  lead_id?: string
  email?: string
  first_name?: string
  last_name?: string
  company?: string
  provider?: EnrichmentProvider
  force_refresh?: boolean
}

export interface EnrichmentResult<T> {
  success: boolean
  data?: T
  error?: string
  credits_used?: number
  cached?: boolean
}

// Provider-specific configurations
export interface ProviderConfig {
  provider: EnrichmentProvider
  name: string
  description: string
  logo?: string
  capabilities: {
    company_enrichment: boolean
    contact_enrichment: boolean
    email_verification: boolean
    phone_verification: boolean
    technographics: boolean
    news_monitoring: boolean
  }
  pricing?: {
    type: 'per_request' | 'subscription' | 'credits'
    cost_per_company?: number
    cost_per_contact?: number
  }
}

// Provider configurations
export const ENRICHMENT_PROVIDERS: Record<EnrichmentProvider, ProviderConfig> = {
  clearbit: {
    provider: 'clearbit',
    name: 'Clearbit',
    description: 'B2B data enrichment for companies and contacts',
    capabilities: {
      company_enrichment: true,
      contact_enrichment: true,
      email_verification: true,
      phone_verification: false,
      technographics: true,
      news_monitoring: false,
    },
    pricing: {
      type: 'per_request',
      cost_per_company: 0.25,
      cost_per_contact: 0.50,
    },
  },
  apollo: {
    provider: 'apollo',
    name: 'Apollo.io',
    description: 'Sales intelligence and enrichment platform',
    capabilities: {
      company_enrichment: true,
      contact_enrichment: true,
      email_verification: true,
      phone_verification: true,
      technographics: true,
      news_monitoring: true,
    },
    pricing: {
      type: 'credits',
      cost_per_company: 1,
      cost_per_contact: 1,
    },
  },
  zoominfo: {
    provider: 'zoominfo',
    name: 'ZoomInfo',
    description: 'Enterprise-grade B2B data platform',
    capabilities: {
      company_enrichment: true,
      contact_enrichment: true,
      email_verification: true,
      phone_verification: true,
      technographics: true,
      news_monitoring: true,
    },
    pricing: {
      type: 'subscription',
    },
  },
  rocketreach: {
    provider: 'rocketreach',
    name: 'RocketReach',
    description: 'Contact lookup and email finding service',
    capabilities: {
      company_enrichment: false,
      contact_enrichment: true,
      email_verification: true,
      phone_verification: true,
      technographics: false,
      news_monitoring: false,
    },
    pricing: {
      type: 'credits',
      cost_per_contact: 1,
    },
  },
  manual: {
    provider: 'manual',
    name: 'Manual Entry',
    description: 'Manually entered enrichment data',
    capabilities: {
      company_enrichment: true,
      contact_enrichment: true,
      email_verification: false,
      phone_verification: false,
      technographics: false,
      news_monitoring: false,
    },
  },
}

// UI display helpers
export const ENRICHMENT_STATUS_CONFIG: Record<EnrichmentStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Enriched', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  partial: { label: 'Partial', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  stale: { label: 'Stale', color: 'text-orange-600', bgColor: 'bg-orange-100' },
}

// Default values
export const DEFAULT_ENRICHMENT_SETTINGS: Partial<EnrichmentSettings> = {
  default_company_provider: 'clearbit',
  default_contact_provider: 'clearbit',
  clearbit_enabled: false,
  apollo_enabled: false,
  zoominfo_enabled: false,
  auto_enrich_on_create: false,
  auto_enrich_companies: true,
  auto_enrich_contacts: true,
  auto_enrich_leads: true,
  scheduled_enrichment_enabled: false,
  max_stale_days: 90,
  daily_enrichment_limit: 100,
  monthly_enrichment_limit: 2000,
  monthly_credit_budget: 1000,
  credit_alert_threshold: 100,
}
