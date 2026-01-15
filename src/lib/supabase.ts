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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'sdr' | 'ae' | 'am'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'sdr' | 'ae' | 'am'
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
          industry: string | null
          employee_count: string | null
          annual_revenue: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          domain?: string | null
          industry?: string | null
          employee_count?: string | null
          annual_revenue?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          domain?: string | null
          industry?: string | null
          employee_count?: string | null
          annual_revenue?: string | null
          owner_id?: string | null
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
    }
  }
}
