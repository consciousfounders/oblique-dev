// LinkedIn Sales Navigator Integration Service
// Handles profile lookup, InMail sending, and activity tracking

import { supabase, type LinkedInActivityType } from '@/lib/supabase'

// Profile lookup result from external API (RocketReach or similar)
export interface ProfileLookupResult {
  linkedin_id?: string
  linkedin_url?: string
  public_identifier?: string
  headline?: string
  summary?: string
  location?: string
  industry?: string
  profile_picture_url?: string
  current_company?: string
  current_title?: string
  email?: string
  phone?: string
  raw_data?: Record<string, unknown>
}

// InMail data structure
export interface InMailData {
  to_profile_id: string
  subject: string
  body: string
  template_id?: string
}

// Activity log entry
export interface ActivityLogEntry {
  activity_type: LinkedInActivityType
  subject?: string
  description?: string
  inmail_id?: string
  inmail_subject?: string
  inmail_body?: string
  metadata?: Record<string, unknown>
}

// Profile search parameters
export interface ProfileSearchParams {
  firstName?: string
  lastName?: string
  email?: string
  company?: string
  title?: string
}

// Activity label config for UI display
export const ACTIVITY_LABELS: Record<LinkedInActivityType, { label: string; color: string }> = {
  connection_request_sent: { label: 'Connection Request Sent', color: 'blue' },
  connection_request_accepted: { label: 'Connection Accepted', color: 'green' },
  connection_request_declined: { label: 'Connection Declined', color: 'red' },
  inmail_sent: { label: 'InMail Sent', color: 'purple' },
  inmail_opened: { label: 'InMail Opened', color: 'indigo' },
  inmail_replied: { label: 'InMail Reply', color: 'green' },
  profile_viewed: { label: 'Profile Viewed', color: 'gray' },
  post_liked: { label: 'Post Liked', color: 'pink' },
  post_commented: { label: 'Post Comment', color: 'orange' },
  post_shared: { label: 'Post Shared', color: 'cyan' },
  message_sent: { label: 'Message Sent', color: 'blue' },
  message_received: { label: 'Message Received', color: 'green' },
}

export class LinkedInService {
  /**
   * Look up a LinkedIn profile using search parameters
   * Uses RocketReach or similar service for lookup
   */
  async lookupProfile(
    params: ProfileSearchParams,
    rocketReachApiKey?: string
  ): Promise<ProfileLookupResult | null> {
    // If RocketReach API key is provided, use their API
    if (rocketReachApiKey) {
      return this.lookupViaRocketReach(params, rocketReachApiKey)
    }

    // Fallback: Try to construct profile URL from parameters
    return this.constructProfileFromParams(params)
  }

  /**
   * Look up profile using RocketReach API
   */
  private async lookupViaRocketReach(
    params: ProfileSearchParams,
    apiKey: string
  ): Promise<ProfileLookupResult | null> {
    try {
      const searchParams = new URLSearchParams()
      if (params.firstName) searchParams.set('name', `${params.firstName} ${params.lastName || ''}`.trim())
      if (params.email) searchParams.set('email', params.email)
      if (params.company) searchParams.set('current_employer', params.company)
      if (params.title) searchParams.set('current_title', params.title)

      const response = await fetch(
        `https://api.rocketreach.co/api/v2/person/lookup?${searchParams.toString()}`,
        {
          headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`RocketReach API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        linkedin_url: data.linkedin_url,
        public_identifier: this.extractPublicIdentifier(data.linkedin_url),
        headline: data.current_title,
        location: data.city ? `${data.city}, ${data.region || ''} ${data.country || ''}`.trim() : undefined,
        industry: data.industry,
        profile_picture_url: data.profile_pic,
        current_company: data.current_employer,
        current_title: data.current_title,
        email: data.email,
        phone: data.phone,
        raw_data: data,
      }
    } catch (error) {
      console.error('RocketReach lookup error:', error)
      return null
    }
  }

  /**
   * Construct profile URL from params (manual approach)
   */
  private constructProfileFromParams(params: ProfileSearchParams): ProfileLookupResult | null {
    // Generate a probable LinkedIn search URL
    const searchParts: string[] = []
    if (params.firstName) searchParts.push(params.firstName)
    if (params.lastName) searchParts.push(params.lastName)
    if (params.company) searchParts.push(params.company)

    if (searchParts.length === 0) return null

    return {
      headline: params.title,
      current_company: params.company,
      current_title: params.title,
      // No direct profile URL - user will need to search manually
    }
  }

  /**
   * Extract public identifier from LinkedIn URL
   */
  private extractPublicIdentifier(url?: string): string | undefined {
    if (!url) return undefined
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/)
    return match ? match[1] : undefined
  }

  /**
   * Generate LinkedIn profile URL from identifier
   */
  generateProfileUrl(publicIdentifier: string): string {
    return `https://www.linkedin.com/in/${publicIdentifier}`
  }

  /**
   * Generate LinkedIn search URL for a person
   */
  generateSearchUrl(params: ProfileSearchParams): string {
    const searchParts: string[] = []
    if (params.firstName) searchParts.push(params.firstName)
    if (params.lastName) searchParts.push(params.lastName)
    if (params.company) searchParts.push(params.company)
    if (params.title) searchParts.push(params.title)

    const query = encodeURIComponent(searchParts.join(' '))
    return `https://www.linkedin.com/search/results/people/?keywords=${query}`
  }

  /**
   * Generate Sales Navigator search URL
   */
  generateSalesNavSearchUrl(params: ProfileSearchParams): string {
    const query = encodeURIComponent(
      [params.firstName, params.lastName, params.company, params.title]
        .filter(Boolean)
        .join(' ')
    )
    return `https://www.linkedin.com/sales/search/people?query=${query}`
  }

  /**
   * Generate InMail URL (opens LinkedIn with compose)
   */
  generateInMailUrl(publicIdentifier: string): string {
    return `https://www.linkedin.com/messaging/compose/?recipient=${publicIdentifier}`
  }

  /**
   * Save a LinkedIn profile to the database
   */
  async saveProfile(
    tenantId: string,
    entityType: 'contact' | 'lead',
    entityId: string,
    profileData: ProfileLookupResult
  ): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('linkedin_profiles')
        .upsert({
          tenant_id: tenantId,
          contact_id: entityType === 'contact' ? entityId : null,
          lead_id: entityType === 'lead' ? entityId : null,
          linkedin_id: profileData.linkedin_id,
          linkedin_url: profileData.linkedin_url,
          public_identifier: profileData.public_identifier,
          headline: profileData.headline,
          summary: profileData.summary,
          location: profileData.location,
          industry: profileData.industry,
          profile_picture_url: profileData.profile_picture_url,
          current_company: profileData.current_company,
          current_title: profileData.current_title,
          last_synced_at: new Date().toISOString(),
          raw_data: profileData.raw_data || {},
        }, {
          onConflict: 'tenant_id,linkedin_id',
        })
        .select('id')
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error saving LinkedIn profile:', error)
      return null
    }
  }

  /**
   * Log a LinkedIn activity
   */
  async logActivity(
    tenantId: string,
    userId: string,
    linkedinProfileId: string,
    activity: ActivityLogEntry
  ): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('linkedin_activities')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          linkedin_profile_id: linkedinProfileId,
          activity_type: activity.activity_type,
          subject: activity.subject,
          description: activity.description,
          inmail_id: activity.inmail_id,
          inmail_subject: activity.inmail_subject,
          inmail_body: activity.inmail_body,
          metadata: activity.metadata || {},
        })
        .select('id')
        .single()

      if (error) throw error

      // Also log to CRM activities for timeline visibility
      await this.logToCrmActivity(tenantId, userId, linkedinProfileId, activity)

      return data
    } catch (error) {
      console.error('Error logging LinkedIn activity:', error)
      return null
    }
  }

  /**
   * Log LinkedIn activity to CRM activities table for unified timeline
   */
  private async logToCrmActivity(
    tenantId: string,
    userId: string,
    linkedinProfileId: string,
    activity: ActivityLogEntry
  ): Promise<void> {
    try {
      // Get the profile to find the linked entity
      const { data: profile } = await supabase
        .from('linkedin_profiles')
        .select('contact_id, lead_id')
        .eq('id', linkedinProfileId)
        .single()

      if (!profile) return

      const entityType = profile.contact_id ? 'contact' : 'lead'
      const entityId = profile.contact_id || profile.lead_id

      if (!entityId) return

      const activityLabel = ACTIVITY_LABELS[activity.activity_type]

      await supabase.from('activities').insert({
        tenant_id: tenantId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'linkedin',
        subject: activity.subject || activityLabel.label,
        description: activity.description || activity.inmail_body,
      })
    } catch (error) {
      console.error('Error logging to CRM activity:', error)
    }
  }

  /**
   * Send InMail (logs the activity - actual sending is done via LinkedIn)
   */
  async sendInMail(
    tenantId: string,
    userId: string,
    linkedinProfileId: string,
    inmail: InMailData
  ): Promise<{ success: boolean; inmailUrl: string }> {
    try {
      // Get profile public identifier
      const { data: profile } = await supabase
        .from('linkedin_profiles')
        .select('public_identifier')
        .eq('id', linkedinProfileId)
        .single()

      if (!profile?.public_identifier) {
        throw new Error('Profile not found or missing public identifier')
      }

      // Log the InMail activity
      await this.logActivity(tenantId, userId, linkedinProfileId, {
        activity_type: 'inmail_sent',
        subject: inmail.subject,
        inmail_subject: inmail.subject,
        inmail_body: inmail.body,
      })

      // If using a template, update its usage
      if (inmail.template_id) {
        await this.incrementTemplateUsage(inmail.template_id)
      }

      // Generate the InMail URL
      const inmailUrl = this.generateInMailUrl(profile.public_identifier)

      return { success: true, inmailUrl }
    } catch (error) {
      console.error('Error preparing InMail:', error)
      return { success: false, inmailUrl: '' }
    }
  }

  /**
   * Increment template usage count
   */
  private async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      const { data: template } = await supabase
        .from('linkedin_inmail_templates')
        .select('use_count')
        .eq('id', templateId)
        .single()

      if (template) {
        await supabase
          .from('linkedin_inmail_templates')
          .update({
            use_count: (template.use_count || 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', templateId)
      }
    } catch (error) {
      console.error('Error updating template usage:', error)
    }
  }

  /**
   * Import a saved lead as a CRM lead
   */
  async importSavedLeadToCRM(
    tenantId: string,
    userId: string,
    savedLeadId: string
  ): Promise<{ leadId: string } | null> {
    try {
      // Get the saved lead
      const { data: savedLead, error: fetchError } = await supabase
        .from('linkedin_saved_leads')
        .select('*')
        .eq('id', savedLeadId)
        .eq('tenant_id', tenantId)
        .single()

      if (fetchError || !savedLead) {
        throw fetchError || new Error('Saved lead not found')
      }

      // Check if already imported
      if (savedLead.imported_to_lead_id) {
        return { leadId: savedLead.imported_to_lead_id }
      }

      // Create a new CRM lead
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          tenant_id: tenantId,
          owner_id: userId,
          first_name: savedLead.first_name,
          last_name: savedLead.last_name,
          company: savedLead.company_name,
          title: savedLead.headline,
          source: 'LinkedIn Sales Navigator',
          status: 'new',
        })
        .select('id')
        .single()

      if (insertError || !newLead) {
        throw insertError || new Error('Failed to create lead')
      }

      // Update saved lead with import reference
      await supabase
        .from('linkedin_saved_leads')
        .update({
          imported_to_lead_id: newLead.id,
          imported_at: new Date().toISOString(),
        })
        .eq('id', savedLeadId)

      // Create LinkedIn profile for the new lead
      if (savedLead.linkedin_url) {
        await this.saveProfile(tenantId, 'lead', newLead.id, {
          linkedin_url: savedLead.linkedin_url,
          public_identifier: this.extractPublicIdentifier(savedLead.linkedin_url),
          headline: savedLead.headline,
          location: savedLead.location,
          profile_picture_url: savedLead.profile_picture_url,
          current_company: savedLead.company_name,
        })
      }

      return { leadId: newLead.id }
    } catch (error) {
      console.error('Error importing saved lead:', error)
      return null
    }
  }

  /**
   * Parse template variables (e.g., {{first_name}}, {{company}})
   */
  parseTemplateVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value)
    }
    return result
  }

  /**
   * Get template variables from a template string
   */
  getTemplateVariables(template: string): string[] {
    const matches = template.match(/{{(\w+)}}/g) || []
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))]
  }
}

// Export singleton instance
export const linkedinService = new LinkedInService()
