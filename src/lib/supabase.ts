import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string | null
          role: 'admin' | 'sdr' | 'ae' | 'am'
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'sdr' | 'ae' | 'am'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'sdr' | 'ae' | 'am'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          tenant_id: string
          name: string
          domain: string | null
          website: string | null
          industry: string | null
          employee_count: string | null
          annual_revenue: string | null
          owner_id: string | null
          territory_id: string | null
          phone: string | null
          fax: string | null
          account_type: AccountType
          description: string | null
          parent_account_id: string | null
          billing_street: string | null
          billing_city: string | null
          billing_state: string | null
          billing_postal_code: string | null
          billing_country: string | null
          shipping_street: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_postal_code: string | null
          shipping_country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          domain?: string | null
          website?: string | null
          industry?: string | null
          employee_count?: string | null
          annual_revenue?: string | null
          owner_id?: string | null
          territory_id?: string | null
          phone?: string | null
          fax?: string | null
          account_type?: AccountType
          description?: string | null
          parent_account_id?: string | null
          billing_street?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          shipping_street?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          shipping_country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          domain?: string | null
          website?: string | null
          industry?: string | null
          employee_count?: string | null
          annual_revenue?: string | null
          owner_id?: string | null
          territory_id?: string | null
          phone?: string | null
          fax?: string | null
          account_type?: AccountType
          description?: string | null
          parent_account_id?: string | null
          billing_street?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          shipping_street?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          shipping_country?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          tenant_id: string
          account_id: string | null
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          title: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          account_id?: string | null
          first_name: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          title?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          account_id?: string | null
          first_name?: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          title?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          tenant_id: string
          first_name: string
          last_name: string | null
          email: string | null
          phone: string | null
          company: string | null
          title: string | null
          source: string | null
          status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          owner_id: string | null
          territory_id: string | null
          converted_contact_id: string | null
          converted_account_id: string | null
          converted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          first_name: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          title?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          owner_id?: string | null
          territory_id?: string | null
          converted_contact_id?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          first_name?: string
          last_name?: string | null
          email?: string | null
          phone?: string | null
          company?: string | null
          title?: string | null
          source?: string | null
          status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted'
          owner_id?: string | null
          territory_id?: string | null
          converted_contact_id?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deals: {
        Row: {
          id: string
          tenant_id: string
          name: string
          value: number | null
          stage_id: string
          account_id: string | null
          contact_id: string | null
          owner_id: string | null
          expected_close_date: string | null
          closed_at: string | null
          won: boolean | null
          description: string | null
          lead_source: string | null
          deal_type: DealType
          next_step: string | null
          competitors: string[] | null
          probability: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          value?: number | null
          stage_id: string
          account_id?: string | null
          contact_id?: string | null
          owner_id?: string | null
          expected_close_date?: string | null
          closed_at?: string | null
          won?: boolean | null
          description?: string | null
          lead_source?: string | null
          deal_type?: DealType
          next_step?: string | null
          competitors?: string[] | null
          probability?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          value?: number | null
          stage_id?: string
          account_id?: string | null
          contact_id?: string | null
          owner_id?: string | null
          expected_close_date?: string | null
          closed_at?: string | null
          won?: boolean | null
          description?: string | null
          lead_source?: string | null
          deal_type?: DealType
          next_step?: string | null
          competitors?: string[] | null
          probability?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      deal_stages: {
        Row: {
          id: string
          tenant_id: string
          name: string
          position: number
          probability: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          position: number
          probability?: number
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          position?: number
          probability?: number
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          entity_type: string
          entity_id: string
          activity_type: string
          subject: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          entity_type: string
          entity_id: string
          activity_type: string
          subject?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          entity_type?: string
          entity_id?: string
          activity_type?: string
          subject?: string | null
          description?: string | null
          created_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          scopes: string[]
          rate_limit_per_minute: number
          rate_limit_per_day: number
          last_used_at: string | null
          expires_at: string | null
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          scopes?: string[]
          rate_limit_per_minute?: number
          rate_limit_per_day?: number
          last_used_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          scopes?: string[]
          rate_limit_per_minute?: number
          rate_limit_per_day?: number
          last_used_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      api_usage: {
        Row: {
          id: string
          api_key_id: string | null
          tenant_id: string
          endpoint: string
          method: string
          status_code: number
          response_time_ms: number | null
          request_size_bytes: number | null
          response_size_bytes: number | null
          ip_address: string | null
          user_agent: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          api_key_id?: string | null
          tenant_id: string
          endpoint: string
          method: string
          status_code: number
          response_time_ms?: number | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          ip_address?: string | null
          user_agent?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          api_key_id?: string | null
          tenant_id?: string
          endpoint?: string
          method?: string
          status_code?: number
          response_time_ms?: number | null
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          ip_address?: string | null
          user_agent?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          cal_booking_id: string | null
          cal_booking_uid: string | null
          title: string
          description: string | null
          start_time: string
          end_time: string
          timezone: string | null
          attendee_name: string | null
          attendee_email: string | null
          attendee_phone: string | null
          event_type: string | null
          event_type_slug: string | null
          location_type: string | null
          location_value: string | null
          meeting_url: string | null
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          contact_id: string | null
          lead_id: string | null
          deal_id: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          rescheduled_from_id: string | null
          rescheduled_to_id: string | null
          metadata: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          cal_booking_id?: string | null
          cal_booking_uid?: string | null
          title: string
          description?: string | null
          start_time: string
          end_time: string
          timezone?: string | null
          attendee_name?: string | null
          attendee_email?: string | null
          attendee_phone?: string | null
          event_type?: string | null
          event_type_slug?: string | null
          location_type?: string | null
          location_value?: string | null
          meeting_url?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          contact_id?: string | null
          lead_id?: string | null
          deal_id?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_from_id?: string | null
          rescheduled_to_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          cal_booking_id?: string | null
          cal_booking_uid?: string | null
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          timezone?: string | null
          attendee_name?: string | null
          attendee_email?: string | null
          attendee_phone?: string | null
          event_type?: string | null
          event_type_slug?: string | null
          location_type?: string | null
          location_value?: string | null
          meeting_url?: string | null
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          contact_id?: string | null
          lead_id?: string | null
          deal_id?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          rescheduled_from_id?: string | null
          rescheduled_to_id?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      availability_rules: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          day_of_week: number | null
          start_time: string
          end_time: string
          timezone: string | null
          is_active: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          day_of_week?: number | null
          start_time: string
          end_time: string
          timezone?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          day_of_week?: number | null
          start_time?: string
          end_time?: string
          timezone?: string | null
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      booking_links: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          slug: string
          name: string
          description: string | null
          cal_event_type: string
          default_name: string | null
          default_email: string | null
          linked_entity_type: string | null
          linked_entity_id: string | null
          is_active: boolean
          view_count: number
          booking_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          slug: string
          name: string
          description?: string | null
          cal_event_type: string
          default_name?: string | null
          default_email?: string | null
          linked_entity_type?: string | null
          linked_entity_id?: string | null
          is_active?: boolean
          view_count?: number
          booking_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          slug?: string
          name?: string
          description?: string | null
          cal_event_type?: string
          default_name?: string | null
          default_email?: string | null
          linked_entity_type?: string | null
          linked_entity_id?: string | null
          is_active?: boolean
          view_count?: number
          booking_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      webhooks: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          url: string
          secret: string
          events: string[]
          is_active: boolean
          last_triggered_at: string | null
          failure_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          url: string
          secret: string
          events?: string[]
          is_active?: boolean
          last_triggered_at?: string | null
          failure_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          url?: string
          secret?: string
          events?: string[]
          is_active?: boolean
          last_triggered_at?: string | null
          failure_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          entity_type: string
          entity_id: string
          content: string
          content_plain: string | null
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          entity_type: string
          entity_id: string
          content: string
          content_plain?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          entity_type?: string
          entity_id?: string
          content?: string
          content_plain?: string | null
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      note_mentions: {
        Row: {
          id: string
          note_id: string
          mentioned_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          note_id: string
          mentioned_user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          note_id?: string
          mentioned_user_id?: string
          created_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          entity_type: string
          entity_id: string
          file_name: string
          file_size: number | null
          file_mime_type: string | null
          storage_type: 'supabase' | 'google_drive' | 'external'
          storage_path: string | null
          external_url: string | null
          drive_file_id: string | null
          version: number
          parent_attachment_id: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          entity_type: string
          entity_id: string
          file_name: string
          file_size?: number | null
          file_mime_type?: string | null
          storage_type?: 'supabase' | 'google_drive' | 'external'
          storage_path?: string | null
          external_url?: string | null
          drive_file_id?: string | null
          version?: number
          parent_attachment_id?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          entity_type?: string
          entity_id?: string
          file_name?: string
          file_size?: number | null
          file_mime_type?: string | null
          storage_type?: 'supabase' | 'google_drive' | 'external'
          storage_path?: string | null
          external_url?: string | null
          drive_file_id?: string | null
          version?: number
          parent_attachment_id?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      storage_quotas: {
        Row: {
          id: string
          tenant_id: string
          max_storage_bytes: number
          used_storage_bytes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          max_storage_bytes?: number
          used_storage_bytes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          max_storage_bytes?: number
          used_storage_bytes?: number
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_profiles: {
        Row: {
          id: string
          tenant_id: string
          contact_id: string | null
          lead_id: string | null
          linkedin_id: string | null
          linkedin_url: string | null
          public_identifier: string | null
          headline: string | null
          summary: string | null
          location: string | null
          industry: string | null
          profile_picture_url: string | null
          current_company: string | null
          current_title: string | null
          connection_status: 'not_connected' | 'pending' | 'connected' | 'following'
          connection_degree: number | null
          mutual_connections: number
          last_synced_at: string | null
          raw_data: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          contact_id?: string | null
          lead_id?: string | null
          linkedin_id?: string | null
          linkedin_url?: string | null
          public_identifier?: string | null
          headline?: string | null
          summary?: string | null
          location?: string | null
          industry?: string | null
          profile_picture_url?: string | null
          current_company?: string | null
          current_title?: string | null
          connection_status?: 'not_connected' | 'pending' | 'connected' | 'following'
          connection_degree?: number | null
          mutual_connections?: number
          last_synced_at?: string | null
          raw_data?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          contact_id?: string | null
          lead_id?: string | null
          linkedin_id?: string | null
          linkedin_url?: string | null
          public_identifier?: string | null
          headline?: string | null
          summary?: string | null
          location?: string | null
          industry?: string | null
          profile_picture_url?: string | null
          current_company?: string | null
          current_title?: string | null
          connection_status?: 'not_connected' | 'pending' | 'connected' | 'following'
          connection_degree?: number | null
          mutual_connections?: number
          last_synced_at?: string | null
          raw_data?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_activities: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          linkedin_profile_id: string
          activity_type: LinkedInActivityType
          subject: string | null
          description: string | null
          inmail_id: string | null
          inmail_subject: string | null
          inmail_body: string | null
          responded_at: string | null
          response_content: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          linkedin_profile_id: string
          activity_type: LinkedInActivityType
          subject?: string | null
          description?: string | null
          inmail_id?: string | null
          inmail_subject?: string | null
          inmail_body?: string | null
          responded_at?: string | null
          response_content?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          linkedin_profile_id?: string
          activity_type?: LinkedInActivityType
          subject?: string | null
          description?: string | null
          inmail_id?: string | null
          inmail_subject?: string | null
          inmail_body?: string | null
          responded_at?: string | null
          response_content?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
      }
      linkedin_inmail_templates: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          subject: string
          body: string
          use_count: number
          last_used_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          subject: string
          body: string
          use_count?: number
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          subject?: string
          body?: string
          use_count?: number
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_saved_leads: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          sales_nav_lead_id: string | null
          linkedin_url: string | null
          first_name: string
          last_name: string | null
          headline: string | null
          location: string | null
          profile_picture_url: string | null
          company_name: string | null
          company_linkedin_url: string | null
          company_industry: string | null
          company_size: string | null
          lead_score: number | null
          recommendation_reason: string | null
          imported_to_lead_id: string | null
          imported_to_contact_id: string | null
          imported_at: string | null
          list_name: string | null
          list_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          sales_nav_lead_id?: string | null
          linkedin_url?: string | null
          first_name: string
          last_name?: string | null
          headline?: string | null
          location?: string | null
          profile_picture_url?: string | null
          company_name?: string | null
          company_linkedin_url?: string | null
          company_industry?: string | null
          company_size?: string | null
          lead_score?: number | null
          recommendation_reason?: string | null
          imported_to_lead_id?: string | null
          imported_to_contact_id?: string | null
          imported_at?: string | null
          list_name?: string | null
          list_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          sales_nav_lead_id?: string | null
          linkedin_url?: string | null
          first_name?: string
          last_name?: string | null
          headline?: string | null
          location?: string | null
          profile_picture_url?: string | null
          company_name?: string | null
          company_linkedin_url?: string | null
          company_industry?: string | null
          company_size?: string | null
          lead_score?: number | null
          recommendation_reason?: string | null
          imported_to_lead_id?: string | null
          imported_to_contact_id?: string | null
          imported_at?: string | null
          list_name?: string | null
          list_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_integration_settings: {
        Row: {
          id: string
          tenant_id: string
          integration_method: 'api' | 'extension' | 'manual'
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          access_token_encrypted: string | null
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          rocketreach_api_key_encrypted: string | null
          auto_sync_enabled: boolean
          sync_interval_hours: number
          auto_log_activities: boolean
          last_sync_at: string | null
          last_sync_status: string | null
          last_sync_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          integration_method?: 'api' | 'extension' | 'manual'
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          rocketreach_api_key_encrypted?: string | null
          auto_sync_enabled?: boolean
          sync_interval_hours?: number
          auto_log_activities?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          integration_method?: 'api' | 'extension' | 'manual'
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          access_token_encrypted?: string | null
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          rocketreach_api_key_encrypted?: string | null
          auto_sync_enabled?: boolean
          sync_interval_hours?: number
          auto_log_activities?: boolean
          last_sync_at?: string | null
          last_sync_status?: string | null
          last_sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          title: string
          message: string
          notification_type: NotificationType
          category: NotificationCategory
          entity_type: string | null
          entity_id: string | null
          action_url: string | null
          metadata: Record<string, unknown> | null
          read_at: string | null
          actioned_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          title: string
          message: string
          notification_type: NotificationType
          category: NotificationCategory
          entity_type?: string | null
          entity_id?: string | null
          action_url?: string | null
          metadata?: Record<string, unknown> | null
          read_at?: string | null
          actioned_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          title?: string
          message?: string
          notification_type?: NotificationType
          category?: NotificationCategory
          entity_type?: string | null
          entity_id?: string | null
          action_url?: string | null
          metadata?: Record<string, unknown> | null
          read_at?: string | null
          actioned_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          level: TeamLevel
          parent_team_id: string | null
          manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          level?: TeamLevel
          parent_team_id?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          level?: TeamLevel
          parent_team_id?: string | null
          manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          is_lead: boolean
          joined_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          is_lead?: boolean
          joined_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          is_lead?: boolean
          joined_at?: string
          created_at?: string
        }
      }
      territories: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          team_id: string | null
          owner_id: string | null
          is_active: boolean
          auto_assign: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          team_id?: string | null
          owner_id?: string | null
          is_active?: boolean
          auto_assign?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          team_id?: string | null
          owner_id?: string | null
          is_active?: boolean
          auto_assign?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      territory_criteria: {
        Row: {
          id: string
          territory_id: string
          criteria_type: TerritoryCriteriaType
          field_name: string
          operator: string
          field_value: string
          created_at: string
        }
        Insert: {
          id?: string
          territory_id: string
          criteria_type: TerritoryCriteriaType
          field_name: string
          operator: string
          field_value: string
          created_at?: string
        }
        Update: {
          id?: string
          territory_id?: string
          criteria_type?: TerritoryCriteriaType
          field_name?: string
          operator?: string
          field_value?: string
          created_at?: string
        }
      }
      territory_accounts: {
        Row: {
          id: string
          territory_id: string
          account_id: string
          created_at: string
        }
        Insert: {
          id?: string
          territory_id: string
          account_id: string
          created_at?: string
        }
        Update: {
          id?: string
          territory_id?: string
          account_id?: string
          created_at?: string
        }
      }
      assignment_rules: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          rule_type: AssignmentRuleType
          entity_type: string
          team_id: string | null
          territory_id: string | null
          is_active: boolean
          priority: number
          config: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          rule_type: AssignmentRuleType
          entity_type: string
          team_id?: string | null
          territory_id?: string | null
          is_active?: boolean
          priority?: number
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          rule_type?: AssignmentRuleType
          entity_type?: string
          team_id?: string | null
          territory_id?: string | null
          is_active?: boolean
          priority?: number
          config?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      assignment_rule_members: {
        Row: {
          id: string
          rule_id: string
          user_id: string
          weight: number
          max_assignments: number | null
          current_assignments: number
          skills: string[]
          last_assigned_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          rule_id: string
          user_id: string
          weight?: number
          max_assignments?: number | null
          current_assignments?: number
          skills?: string[]
          last_assigned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          rule_id?: string
          user_id?: string
          weight?: number
          max_assignments?: number | null
          current_assignments?: number
          skills?: string[]
          last_assigned_at?: string | null
          created_at?: string
        }
      }
      assignment_history: {
        Row: {
          id: string
          tenant_id: string
          rule_id: string | null
          entity_type: string
          entity_id: string
          assigned_to: string
          assigned_by: string | null
          assignment_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          rule_id?: string | null
          entity_type: string
          entity_id: string
          assigned_to: string
          assigned_by?: string | null
          assignment_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          rule_id?: string | null
          entity_type?: string
          entity_id?: string
          assigned_to?: string
          assigned_by?: string | null
          assignment_reason?: string | null
          created_at?: string
        }
      }
      notification_preferences: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          email_enabled: boolean
          in_app_enabled: boolean
          browser_push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_start: string | null
          quiet_hours_end: string | null
          digest_mode: 'immediate' | 'hourly' | 'daily'
          category_preferences: Record<string, boolean> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          browser_push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          digest_mode?: 'immediate' | 'hourly' | 'daily'
          category_preferences?: Record<string, boolean> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          email_enabled?: boolean
          in_app_enabled?: boolean
          browser_push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_start?: string | null
          quiet_hours_end?: string | null
          digest_mode?: 'immediate' | 'hourly' | 'daily'
          category_preferences?: Record<string, boolean> | null
          created_at?: string
          updated_at?: string
        }
      }
      web_forms: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          slug: string
          status: 'draft' | 'active' | 'paused' | 'archived'
          submit_button_text: string
          success_message: string
          redirect_url: string | null
          primary_color: string | null
          background_color: string | null
          text_color: string | null
          font_family: string | null
          border_radius: string | null
          custom_css: string | null
          display_type: 'embedded' | 'popup' | 'slide_in' | 'full_page'
          show_branding: boolean
          popup_trigger: string | null
          popup_delay_seconds: number | null
          popup_scroll_percentage: number | null
          enable_captcha: boolean
          captcha_type: string | null
          captcha_site_key: string | null
          honeypot_enabled: boolean
          assignment_rule_id: string | null
          default_owner_id: string | null
          default_lead_source: string | null
          notify_on_submission: boolean
          notification_emails: string[] | null
          send_auto_response: boolean
          auto_response_subject: string | null
          auto_response_body: string | null
          capture_utm_params: boolean
          duplicate_check_enabled: boolean
          duplicate_field: string | null
          duplicate_action: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          slug: string
          status?: 'draft' | 'active' | 'paused' | 'archived'
          submit_button_text?: string
          success_message?: string
          redirect_url?: string | null
          primary_color?: string | null
          background_color?: string | null
          text_color?: string | null
          font_family?: string | null
          border_radius?: string | null
          custom_css?: string | null
          display_type?: 'embedded' | 'popup' | 'slide_in' | 'full_page'
          show_branding?: boolean
          popup_trigger?: string | null
          popup_delay_seconds?: number | null
          popup_scroll_percentage?: number | null
          enable_captcha?: boolean
          captcha_type?: string | null
          captcha_site_key?: string | null
          honeypot_enabled?: boolean
          assignment_rule_id?: string | null
          default_owner_id?: string | null
          default_lead_source?: string | null
          notify_on_submission?: boolean
          notification_emails?: string[] | null
          send_auto_response?: boolean
          auto_response_subject?: string | null
          auto_response_body?: string | null
          capture_utm_params?: boolean
          duplicate_check_enabled?: boolean
          duplicate_field?: string | null
          duplicate_action?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          slug?: string
          status?: 'draft' | 'active' | 'paused' | 'archived'
          submit_button_text?: string
          success_message?: string
          redirect_url?: string | null
          primary_color?: string | null
          background_color?: string | null
          text_color?: string | null
          font_family?: string | null
          border_radius?: string | null
          custom_css?: string | null
          display_type?: 'embedded' | 'popup' | 'slide_in' | 'full_page'
          show_branding?: boolean
          popup_trigger?: string | null
          popup_delay_seconds?: number | null
          popup_scroll_percentage?: number | null
          enable_captcha?: boolean
          captcha_type?: string | null
          captcha_site_key?: string | null
          honeypot_enabled?: boolean
          assignment_rule_id?: string | null
          default_owner_id?: string | null
          default_lead_source?: string | null
          notify_on_submission?: boolean
          notification_emails?: string[] | null
          send_auto_response?: boolean
          auto_response_subject?: string | null
          auto_response_body?: string | null
          capture_utm_params?: boolean
          duplicate_check_enabled?: boolean
          duplicate_field?: string | null
          duplicate_action?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      web_form_fields: {
        Row: {
          id: string
          form_id: string
          field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'url' | 'hidden'
          label: string
          name: string
          placeholder: string | null
          help_text: string | null
          default_value: string | null
          is_required: boolean
          min_length: number | null
          max_length: number | null
          pattern: string | null
          pattern_error_message: string | null
          options: Record<string, unknown>[] | null
          lead_field_mapping: string | null
          width: string | null
          position: number
          conditional_logic: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          field_type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'url' | 'hidden'
          label: string
          name: string
          placeholder?: string | null
          help_text?: string | null
          default_value?: string | null
          is_required?: boolean
          min_length?: number | null
          max_length?: number | null
          pattern?: string | null
          pattern_error_message?: string | null
          options?: Record<string, unknown>[] | null
          lead_field_mapping?: string | null
          width?: string | null
          position: number
          conditional_logic?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          field_type?: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'url' | 'hidden'
          label?: string
          name?: string
          placeholder?: string | null
          help_text?: string | null
          default_value?: string | null
          is_required?: boolean
          min_length?: number | null
          max_length?: number | null
          pattern?: string | null
          pattern_error_message?: string | null
          options?: Record<string, unknown>[] | null
          lead_field_mapping?: string | null
          width?: string | null
          position?: number
          conditional_logic?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      web_form_submissions: {
        Row: {
          id: string
          form_id: string
          tenant_id: string
          submission_data: Record<string, unknown>
          lead_id: string | null
          converted_to_lead: boolean
          conversion_error: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_term: string | null
          utm_content: string | null
          ip_address: string | null
          user_agent: string | null
          referrer_url: string | null
          page_url: string | null
          spam_score: number
          is_spam: boolean
          honeypot_triggered: boolean
          captcha_passed: boolean | null
          processed_at: string | null
          notification_sent: boolean
          auto_response_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          form_id: string
          tenant_id: string
          submission_data: Record<string, unknown>
          lead_id?: string | null
          converted_to_lead?: boolean
          conversion_error?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          page_url?: string | null
          spam_score?: number
          is_spam?: boolean
          honeypot_triggered?: boolean
          captcha_passed?: boolean | null
          processed_at?: string | null
          notification_sent?: boolean
          auto_response_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          tenant_id?: string
          submission_data?: Record<string, unknown>
          lead_id?: string | null
          converted_to_lead?: boolean
          conversion_error?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          page_url?: string | null
          spam_score?: number
          is_spam?: boolean
          honeypot_triggered?: boolean
          captcha_passed?: boolean | null
          processed_at?: string | null
          notification_sent?: boolean
          auto_response_sent?: boolean
          created_at?: string
        }
      }
      web_form_views: {
        Row: {
          id: string
          form_id: string
          session_id: string | null
          ip_address: string | null
          user_agent: string | null
          referrer_url: string | null
          page_url: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          view_type: string | null
          time_on_form_seconds: number | null
          fields_filled: number | null
          last_field_filled: string | null
          created_at: string
        }
        Insert: {
          id?: string
          form_id: string
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          page_url?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          view_type?: string | null
          time_on_form_seconds?: number | null
          fields_filled?: number | null
          last_field_filled?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          referrer_url?: string | null
          page_url?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          view_type?: string | null
          time_on_form_seconds?: number | null
          fields_filled?: number | null
          last_field_filled?: string | null
          created_at?: string
        }
      }
      web_form_variants: {
        Row: {
          id: string
          form_id: string
          name: string
          description: string | null
          variant_config: Record<string, unknown>
          traffic_percentage: number
          is_control: boolean
          is_active: boolean
          views_count: number
          submissions_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          form_id: string
          name: string
          description?: string | null
          variant_config: Record<string, unknown>
          traffic_percentage?: number
          is_control?: boolean
          is_active?: boolean
          views_count?: number
          submissions_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          name?: string
          description?: string | null
          variant_config?: Record<string, unknown>
          traffic_percentage?: number
          is_control?: boolean
          is_active?: boolean
          views_count?: number
          submissions_count?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// LinkedIn activity types
export type LinkedInActivityType =
  | 'connection_request_sent'
  | 'connection_request_accepted'
  | 'connection_request_declined'
  | 'inmail_sent'
  | 'inmail_opened'
  | 'inmail_replied'
  | 'profile_viewed'
  | 'post_liked'
  | 'post_commented'
  | 'post_shared'
  | 'message_sent'
  | 'message_received'

// LinkedIn profile status types
export type LinkedInProfileStatus = 'not_connected' | 'pending' | 'connected' | 'following'

// Helper types for Notes and Attachments
export type EntityType = 'contact' | 'account' | 'deal' | 'lead'

export type Note = Database['public']['Tables']['notes']['Row'] & {
  users?: { full_name: string | null } | null
}

export type NoteInsert = Database['public']['Tables']['notes']['Insert']
export type NoteUpdate = Database['public']['Tables']['notes']['Update']

export type Attachment = Database['public']['Tables']['attachments']['Row'] & {
  users?: { full_name: string | null } | null
}

export type AttachmentInsert = Database['public']['Tables']['attachments']['Insert']
export type AttachmentUpdate = Database['public']['Tables']['attachments']['Update']

export type StorageQuota = Database['public']['Tables']['storage_quotas']['Row']

// LinkedIn types
export type LinkedInProfile = Database['public']['Tables']['linkedin_profiles']['Row']
export type LinkedInProfileInsert = Database['public']['Tables']['linkedin_profiles']['Insert']
export type LinkedInProfileUpdate = Database['public']['Tables']['linkedin_profiles']['Update']

export type LinkedInActivity = Database['public']['Tables']['linkedin_activities']['Row']
export type LinkedInActivityInsert = Database['public']['Tables']['linkedin_activities']['Insert']

export type LinkedInInMailTemplate = Database['public']['Tables']['linkedin_inmail_templates']['Row']
export type LinkedInInMailTemplateInsert = Database['public']['Tables']['linkedin_inmail_templates']['Insert']
export type LinkedInInMailTemplateUpdate = Database['public']['Tables']['linkedin_inmail_templates']['Update']

export type LinkedInSavedLead = Database['public']['Tables']['linkedin_saved_leads']['Row']
export type LinkedInSavedLeadInsert = Database['public']['Tables']['linkedin_saved_leads']['Insert']
export type LinkedInSavedLeadUpdate = Database['public']['Tables']['linkedin_saved_leads']['Update']

export type LinkedInIntegrationSettings = Database['public']['Tables']['linkedin_integration_settings']['Row']
export type LinkedInIntegrationSettingsInsert = Database['public']['Tables']['linkedin_integration_settings']['Insert']
export type LinkedInIntegrationSettingsUpdate = Database['public']['Tables']['linkedin_integration_settings']['Update']

// Notification types
export type NotificationType = 'system' | 'mention' | 'activity' | 'reminder' | 'alert'

export type NotificationCategory =
  | 'task_due'
  | 'task_overdue'
  | 'deal_stage_change'
  | 'lead_assigned'
  | 'mention_in_note'
  | 'email_reply'
  | 'meeting_reminder'
  | 'quota_alert'
  | 'system'

export type Notification = Database['public']['Tables']['notifications']['Row']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row']
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert']
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update']

// Team types
export type TeamLevel = 'organization' | 'region' | 'team'

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type TeamMemberInsert = Database['public']['Tables']['team_members']['Insert']
export type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update']

// Territory types
export type TerritoryCriteriaType = 'geographic' | 'industry' | 'company_size' | 'named_accounts'

export type Territory = Database['public']['Tables']['territories']['Row']
export type TerritoryInsert = Database['public']['Tables']['territories']['Insert']
export type TerritoryUpdate = Database['public']['Tables']['territories']['Update']

export type TerritoryCriteria = Database['public']['Tables']['territory_criteria']['Row']
export type TerritoryCriteriaInsert = Database['public']['Tables']['territory_criteria']['Insert']
export type TerritoryCriteriaUpdate = Database['public']['Tables']['territory_criteria']['Update']

export type TerritoryAccount = Database['public']['Tables']['territory_accounts']['Row']
export type TerritoryAccountInsert = Database['public']['Tables']['territory_accounts']['Insert']
export type TerritoryAccountUpdate = Database['public']['Tables']['territory_accounts']['Update']

// Deal types
export type DealType = 'new_business' | 'renewal' | 'upsell' | 'cross_sell'

// Account types
export type AccountType = 'prospect' | 'customer' | 'partner' | 'vendor' | 'other'

// Account helper type
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

// Assignment rule types
export type AssignmentRuleType = 'round_robin' | 'load_balanced' | 'skill_based'

export type AssignmentRule = Database['public']['Tables']['assignment_rules']['Row']
export type AssignmentRuleInsert = Database['public']['Tables']['assignment_rules']['Insert']
export type AssignmentRuleUpdate = Database['public']['Tables']['assignment_rules']['Update']

export type AssignmentRuleMember = Database['public']['Tables']['assignment_rule_members']['Row']
export type AssignmentRuleMemberInsert = Database['public']['Tables']['assignment_rule_members']['Insert']
export type AssignmentRuleMemberUpdate = Database['public']['Tables']['assignment_rule_members']['Update']

export type AssignmentHistory = Database['public']['Tables']['assignment_history']['Row']
export type AssignmentHistoryInsert = Database['public']['Tables']['assignment_history']['Insert']
export type AssignmentHistoryUpdate = Database['public']['Tables']['assignment_history']['Update']

// Web Form types
export type WebFormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'date' | 'url' | 'hidden'
export type WebFormStatus = 'draft' | 'active' | 'paused' | 'archived'
export type WebFormDisplayType = 'embedded' | 'popup' | 'slide_in' | 'full_page'

export type WebForm = Database['public']['Tables']['web_forms']['Row']
export type WebFormInsert = Database['public']['Tables']['web_forms']['Insert']
export type WebFormUpdate = Database['public']['Tables']['web_forms']['Update']

export type WebFormField = Database['public']['Tables']['web_form_fields']['Row']
export type WebFormFieldInsert = Database['public']['Tables']['web_form_fields']['Insert']
export type WebFormFieldUpdate = Database['public']['Tables']['web_form_fields']['Update']

export type WebFormSubmission = Database['public']['Tables']['web_form_submissions']['Row']
export type WebFormSubmissionInsert = Database['public']['Tables']['web_form_submissions']['Insert']
export type WebFormSubmissionUpdate = Database['public']['Tables']['web_form_submissions']['Update']

export type WebFormView = Database['public']['Tables']['web_form_views']['Row']
export type WebFormViewInsert = Database['public']['Tables']['web_form_views']['Insert']

export type WebFormVariant = Database['public']['Tables']['web_form_variants']['Row']
export type WebFormVariantInsert = Database['public']['Tables']['web_form_variants']['Insert']
export type WebFormVariantUpdate = Database['public']['Tables']['web_form_variants']['Update']
