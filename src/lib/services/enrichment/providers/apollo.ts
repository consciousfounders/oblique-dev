// Apollo.io Enrichment Provider
// Documentation: https://apolloio.github.io/apollo-api-docs/

import { BaseEnrichmentProvider } from './base'
import type {
  CompanyEnrichmentData,
  ContactEnrichmentData,
  EnrichCompanyRequest,
  EnrichContactRequest,
  EnrichmentResult,
  WorkHistoryEntry,
  EducationEntry,
  FundingRound,
} from '@/lib/types/enrichment'

// Apollo API response types
interface ApolloOrganization {
  id: string
  name: string
  website_url?: string
  blog_url?: string
  angellist_url?: string
  linkedin_url?: string
  twitter_url?: string
  facebook_url?: string
  primary_phone?: {
    number?: string
    source?: string
  }
  languages?: string[]
  alexa_ranking?: number
  phone?: string
  linkedin_uid?: string
  publicly_traded_symbol?: string
  publicly_traded_exchange?: string
  logo_url?: string
  crunchbase_url?: string
  primary_domain?: string
  persona_counts?: Record<string, number>
  industry?: string
  keywords?: string[]
  estimated_num_employees?: number
  snippets_loaded?: boolean
  industry_tag_id?: string
  retail_location_count?: number
  raw_address?: string
  street_address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  founded_year?: number
  total_funding?: number
  total_funding_printed?: string
  latest_funding_round_date?: string
  latest_funding_stage?: string
  latest_funding_amount?: number
  annual_revenue?: number
  annual_revenue_printed?: string
  technology_names?: string[]
  current_technologies?: Array<{
    uid: string
    name: string
    category?: string
  }>
  org_chart_root_people_ids?: string[]
  seo_description?: string
  short_description?: string
  suborganizations?: Array<{
    id: string
    name: string
    website_url?: string
  }>
  num_suborganizations?: number
  intent_strength?: string
  show_intent?: boolean
}

interface ApolloPerson {
  id: string
  first_name?: string
  last_name?: string
  name?: string
  linkedin_url?: string
  title?: string
  email_status?: string
  photo_url?: string
  twitter_url?: string
  github_url?: string
  facebook_url?: string
  extrapolated_email_confidence?: number
  headline?: string
  email?: string
  organization_id?: string
  state?: string
  city?: string
  country?: string
  organization?: ApolloOrganization
  departments?: string[]
  subdepartments?: string[]
  seniority?: string
  functions?: string[]
  phone_numbers?: Array<{
    raw_number?: string
    sanitized_number?: string
    type?: string
    position?: number
    status?: string
  }>
  intent_strength?: string
  show_intent?: boolean
  revealed_for_current_team?: boolean
  employment_history?: Array<{
    id?: string
    key?: string
    title?: string
    start_date?: string
    end_date?: string
    current?: boolean
    degree?: string
    description?: string
    emails?: string[]
    kind?: string
    major?: string
    organization_id?: string
    organization_name?: string
    raw_address?: string
    created_at?: string
    updated_at?: string
  }>
}

interface ApolloOrganizationResponse {
  organization: ApolloOrganization
}

interface ApolloPersonMatchResponse {
  person?: ApolloPerson
  matches?: ApolloPerson[]
}

export class ApolloProvider extends BaseEnrichmentProvider {
  constructor(apiKey: string) {
    super(apiKey, 'apollo')
    this.baseUrl = 'https://api.apollo.io/v1'
  }

  protected override getAuthHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
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
      // Use organization enrichment endpoint
      const response = await fetch(`${this.baseUrl}/organizations/enrich`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          domain: request.domain,
          name: request.name,
        }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status}`,
          credits_used: 1,
        }
      }

      const data = await response.json() as ApolloOrganizationResponse

      if (!data.organization) {
        return {
          success: false,
          error: 'No organization data found',
          credits_used: 0,
        }
      }

      const enrichedData = this.mapCompanyResponse(data.organization)

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
    if (!request.email && (!request.first_name || !request.last_name)) {
      return {
        success: false,
        error: 'Either email or first/last name with company is required',
      }
    }

    try {
      // Use person match endpoint
      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          email: request.email,
          first_name: request.first_name,
          last_name: request.last_name,
          organization_name: request.company,
          reveal_personal_emails: true,
          reveal_phone_number: true,
        }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status}`,
          credits_used: 1,
        }
      }

      const data = await response.json() as ApolloPersonMatchResponse

      if (!data.person) {
        return {
          success: false,
          error: 'No person data found',
          credits_used: 0,
        }
      }

      const enrichedData = this.mapContactResponse(data.person)

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

  private mapCompanyResponse(org: ApolloOrganization): CompanyEnrichmentData {
    // Build funding rounds
    const fundingRounds: FundingRound[] = []
    if (org.latest_funding_amount && org.latest_funding_stage) {
      fundingRounds.push({
        type: org.latest_funding_stage,
        amount: org.latest_funding_amount,
        date: org.latest_funding_round_date,
      })
    }

    // Extract technologies
    const technologies = org.technology_names || []
    const techCategories: Record<string, string[]> = {}
    if (org.current_technologies) {
      for (const tech of org.current_technologies) {
        const category = tech.category || 'Other'
        if (!techCategories[category]) {
          techCategories[category] = []
        }
        techCategories[category].push(tech.name)
      }
    }

    return {
      provider: 'apollo',
      status: 'completed',
      triggered_by: 'on_demand',

      legal_name: org.name,
      domain: org.primary_domain || org.website_url?.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      logo_url: org.logo_url,
      description: org.short_description || org.seo_description,
      founded_year: org.founded_year,

      employee_count: org.estimated_num_employees,
      annual_revenue: org.annual_revenue,
      revenue_range: org.annual_revenue_printed,
      funding_total: org.total_funding,
      funding_rounds: fundingRounds,
      last_funding_date: org.latest_funding_round_date,
      last_funding_amount: org.latest_funding_amount,
      last_funding_type: org.latest_funding_stage,

      industry: org.industry,
      industry_tags: org.keywords,

      technologies,
      tech_categories: techCategories,

      linkedin_url: org.linkedin_url,
      twitter_url: org.twitter_url,
      facebook_url: org.facebook_url,
      crunchbase_url: org.crunchbase_url,

      phone: org.phone || org.primary_phone?.number,

      headquarters_address: org.street_address,
      headquarters_city: org.city,
      headquarters_state: org.state,
      headquarters_country: org.country,
      headquarters_postal_code: org.postal_code,

      raw_data: org as unknown as Record<string, unknown>,
      enriched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  private mapContactResponse(person: ApolloPerson): ContactEnrichmentData {
    // Build work history
    const workHistory: WorkHistoryEntry[] = []
    const educationHistory: EducationEntry[] = []

    if (person.employment_history) {
      for (const entry of person.employment_history) {
        if (entry.kind === 'education') {
          educationHistory.push({
            school: entry.organization_name || '',
            degree: entry.degree,
            field_of_study: entry.major,
          })
        } else {
          workHistory.push({
            company: entry.organization_name || '',
            title: entry.title || '',
            start_date: entry.start_date,
            end_date: entry.end_date,
            is_current: entry.current,
            description: entry.description,
          })
        }
      }
    }

    // Get phone numbers
    let mobilePhone: string | undefined
    let workPhone: string | undefined
    let primaryPhone: string | undefined

    if (person.phone_numbers) {
      for (const phone of person.phone_numbers) {
        if (phone.type === 'mobile') {
          mobilePhone = phone.sanitized_number || phone.raw_number
        } else if (phone.type === 'work') {
          workPhone = phone.sanitized_number || phone.raw_number
        }
        if (!primaryPhone) {
          primaryPhone = phone.sanitized_number || phone.raw_number
        }
      }
    }

    // Determine email verification status
    const emailVerified = person.email_status === 'verified'
    let emailConfidence = 50
    if (person.email_status === 'verified') {
      emailConfidence = 95
    } else if (person.extrapolated_email_confidence) {
      emailConfidence = person.extrapolated_email_confidence
    }

    return {
      provider: 'apollo',
      status: 'completed',
      triggered_by: 'on_demand',

      full_name: person.name,
      first_name: person.first_name,
      last_name: person.last_name,
      headline: person.headline,
      avatar_url: person.photo_url,

      job_title: person.title,
      job_title_verified: true,
      department: person.departments?.[0],
      seniority: person.seniority,

      current_company: person.organization?.name,
      current_company_domain: person.organization?.primary_domain,
      current_company_linkedin: person.organization?.linkedin_url,

      email: person.email,
      email_verified: emailVerified,
      email_confidence: emailConfidence,
      phone: primaryPhone,
      mobile_phone: mobilePhone,
      work_phone: workPhone,

      linkedin_url: person.linkedin_url,
      twitter_url: person.twitter_url,
      github_url: person.github_url,

      work_history: workHistory,
      education_history: educationHistory,

      city: person.city,
      state: person.state,
      country: person.country,

      raw_data: person as unknown as Record<string, unknown>,
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
export const createApolloProvider = (apiKey: string): ApolloProvider => {
  return new ApolloProvider(apiKey)
}
