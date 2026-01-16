// Clearbit Enrichment Provider
// Documentation: https://clearbit.com/docs

import { BaseEnrichmentProvider } from './base'
import type {
  CompanyEnrichmentData,
  ContactEnrichmentData,
  EnrichCompanyRequest,
  EnrichContactRequest,
  EnrichmentResult,
  FundingRound,
} from '@/lib/types/enrichment'

// Clearbit API response types
interface ClearbitCompanyResponse {
  id: string
  name: string
  legalName?: string
  domain: string
  domainAliases?: string[]
  site?: {
    phoneNumbers?: string[]
    emailAddresses?: string[]
  }
  category?: {
    sector?: string
    industryGroup?: string
    industry?: string
    subIndustry?: string
    sicCode?: string
    naicsCode?: string
  }
  tags?: string[]
  description?: string
  foundedYear?: number
  location?: string
  geo?: {
    streetNumber?: string
    streetName?: string
    subPremise?: string
    city?: string
    state?: string
    stateCode?: string
    postalCode?: string
    country?: string
    countryCode?: string
    lat?: number
    lng?: number
  }
  logo?: string
  facebook?: {
    handle?: string
    likes?: number
  }
  linkedin?: {
    handle?: string
  }
  twitter?: {
    handle?: string
    id?: string
    bio?: string
    followers?: number
    following?: number
    location?: string
    site?: string
    avatar?: string
  }
  crunchbase?: {
    handle?: string
  }
  emailProvider?: boolean
  type?: string
  phone?: string
  metrics?: {
    alexaUsRank?: number
    alexaGlobalRank?: number
    employees?: number
    employeesRange?: string
    marketCap?: number
    raised?: number
    annualRevenue?: number
    estimatedAnnualRevenue?: string
    fiscalYearEnd?: number
  }
  tech?: string[]
  techCategories?: Record<string, string[]>
  parent?: {
    domain?: string
  }
  ultimateParent?: {
    domain?: string
  }
  indexedAt?: string
}

interface ClearbitPersonResponse {
  id: string
  name?: {
    fullName?: string
    givenName?: string
    familyName?: string
  }
  email?: string
  gender?: string
  location?: string
  geo?: {
    city?: string
    state?: string
    stateCode?: string
    country?: string
    countryCode?: string
    lat?: number
    lng?: number
  }
  bio?: string
  site?: string
  avatar?: string
  employment?: {
    domain?: string
    name?: string
    title?: string
    role?: string
    subRole?: string
    seniority?: string
  }
  facebook?: {
    handle?: string
  }
  github?: {
    handle?: string
    id?: number
    avatar?: string
    company?: string
    blog?: string
    followers?: number
    following?: number
  }
  twitter?: {
    handle?: string
    id?: string
    bio?: string
    followers?: number
    following?: number
    statuses?: number
    favorites?: number
    location?: string
    site?: string
    avatar?: string
  }
  linkedin?: {
    handle?: string
  }
  googleplus?: {
    handle?: string
  }
  gravatar?: {
    handle?: string
    urls?: Array<{ value: string; title: string }>
    avatar?: string
    avatars?: Array<{ url: string; type: string }>
  }
  fuzzy?: boolean
  emailProvider?: boolean
  indexedAt?: string
}

interface ClearbitCombinedResponse {
  person?: ClearbitPersonResponse
  company?: ClearbitCompanyResponse
}

export class ClearbitProvider extends BaseEnrichmentProvider {
  constructor(apiKey: string) {
    super(apiKey, 'clearbit')
    this.baseUrl = 'https://company.clearbit.com/v2'
  }

  protected override getAuthHeaders(): Record<string, string> {
    // Clearbit uses Basic auth with API key as username
    const encoded = btoa(`${this.apiKey}:`)
    return {
      Authorization: `Basic ${encoded}`,
    }
  }

  async enrichCompany(request: EnrichCompanyRequest): Promise<EnrichmentResult<CompanyEnrichmentData>> {
    if (!request.domain && !request.name) {
      return {
        success: false,
        error: 'Either domain or company name is required',
      }
    }

    try {
      const endpoint = request.domain
        ? `/companies/find?domain=${encodeURIComponent(request.domain)}`
        : `/companies/find?name=${encodeURIComponent(request.name!)}`

      const { data, error, status } = await this.makeRequest<ClearbitCompanyResponse>(endpoint)

      if (error) {
        return {
          success: false,
          error,
          credits_used: status === 404 ? 0 : 1,
        }
      }

      if (!data) {
        return {
          success: false,
          error: 'No data returned from Clearbit',
          credits_used: 0,
        }
      }

      const enrichedData = this.mapCompanyResponse(data)

      return {
        success: true,
        data: enrichedData,
        credits_used: 1,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async enrichContact(request: EnrichContactRequest): Promise<EnrichmentResult<ContactEnrichmentData>> {
    if (!request.email) {
      return {
        success: false,
        error: 'Email is required for contact enrichment',
      }
    }

    try {
      // Use the combined endpoint for person + company data
      const endpoint = `https://person.clearbit.com/v2/combined/find?email=${encodeURIComponent(request.email)}`

      const response = await fetch(endpoint, {
        headers: this.getAuthHeaders(),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status}`,
          credits_used: response.status === 404 ? 0 : 1,
        }
      }

      const data = await response.json() as ClearbitCombinedResponse

      if (!data.person) {
        return {
          success: false,
          error: 'No person data found',
          credits_used: 0,
        }
      }

      const enrichedData = this.mapContactResponse(data.person, data.company)

      return {
        success: true,
        data: enrichedData,
        credits_used: 1,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  private mapCompanyResponse(data: ClearbitCompanyResponse): CompanyEnrichmentData {
    const geo = data.geo || {}
    const metrics = data.metrics || {}

    // Build headquarters address
    const addressParts = [
      geo.streetNumber,
      geo.streetName,
      geo.subPremise,
    ].filter(Boolean)
    const headquartersAddress = addressParts.length > 0 ? addressParts.join(' ') : undefined

    // Map funding rounds if available
    const fundingRounds: FundingRound[] = []
    if (metrics.raised) {
      fundingRounds.push({
        type: 'total',
        amount: metrics.raised,
      })
    }

    return {
      provider: 'clearbit',
      status: 'completed',
      triggered_by: 'on_demand',

      legal_name: data.legalName || data.name,
      domain: data.domain,
      logo_url: data.logo,
      description: data.description,
      founded_year: data.foundedYear,

      employee_count: metrics.employees,
      employee_range: metrics.employeesRange,
      annual_revenue: metrics.annualRevenue,
      revenue_range: metrics.estimatedAnnualRevenue,
      funding_total: metrics.raised,
      funding_rounds: fundingRounds,

      industry: data.category?.industry,
      sub_industry: data.category?.subIndustry,
      industry_tags: data.tags,
      sic_codes: data.category?.sicCode ? [data.category.sicCode] : [],
      naics_codes: data.category?.naicsCode ? [data.category.naicsCode] : [],

      technologies: data.tech,
      tech_categories: data.techCategories,

      linkedin_url: data.linkedin?.handle
        ? `https://linkedin.com/company/${data.linkedin.handle}`
        : undefined,
      twitter_url: data.twitter?.handle
        ? `https://twitter.com/${data.twitter.handle}`
        : undefined,
      facebook_url: data.facebook?.handle
        ? `https://facebook.com/${data.facebook.handle}`
        : undefined,
      crunchbase_url: data.crunchbase?.handle
        ? `https://crunchbase.com/organization/${data.crunchbase.handle}`
        : undefined,

      phone: data.phone || data.site?.phoneNumbers?.[0],
      email_formats: data.site?.emailAddresses,

      headquarters_address: headquartersAddress,
      headquarters_city: geo.city,
      headquarters_state: geo.state,
      headquarters_country: geo.country,
      headquarters_postal_code: geo.postalCode,

      raw_data: data as unknown as Record<string, unknown>,
      enriched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    }
  }

  private mapContactResponse(
    person: ClearbitPersonResponse,
    company?: ClearbitCompanyResponse
  ): ContactEnrichmentData {
    const employment = person.employment || {}
    const geo = person.geo || {}

    // Parse seniority level
    let seniorityLevel = employment.seniority
    if (employment.role) {
      if (employment.role.toLowerCase().includes('executive')) {
        seniorityLevel = 'executive'
      } else if (employment.role.toLowerCase().includes('director')) {
        seniorityLevel = 'director'
      } else if (employment.role.toLowerCase().includes('manager')) {
        seniorityLevel = 'manager'
      }
    }

    return {
      provider: 'clearbit',
      status: 'completed',
      triggered_by: 'on_demand',

      full_name: person.name?.fullName,
      first_name: person.name?.givenName,
      last_name: person.name?.familyName,
      bio: person.bio,
      avatar_url: person.avatar,

      job_title: employment.title,
      job_title_role: employment.role,
      job_title_level: employment.subRole,
      job_title_verified: true,
      seniority: seniorityLevel,

      current_company: employment.name,
      current_company_domain: employment.domain,

      email: person.email,
      email_verified: !person.fuzzy,
      email_confidence: person.fuzzy ? 70 : 95,

      linkedin_url: person.linkedin?.handle
        ? `https://linkedin.com/in/${person.linkedin.handle}`
        : undefined,
      twitter_url: person.twitter?.handle
        ? `https://twitter.com/${person.twitter.handle}`
        : undefined,
      github_url: person.github?.handle
        ? `https://github.com/${person.github.handle}`
        : undefined,
      personal_website: person.site,

      location: person.location,
      city: geo.city,
      state: geo.state,
      country: geo.country,

      raw_data: { person, company } as unknown as Record<string, unknown>,
      enriched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  supportsCompanyEnrichment(): boolean {
    return true
  }

  supportsContactEnrichment(): boolean {
    return true
  }

  supportsEmailVerification(): boolean {
    return true
  }

  supportsTechnographics(): boolean {
    return true
  }
}

// Factory function
export const createClearbitProvider = (apiKey: string): ClearbitProvider => {
  return new ClearbitProvider(apiKey)
}
