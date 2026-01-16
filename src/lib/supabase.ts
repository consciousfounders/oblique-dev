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

// Task types (defined before Database type)
export type TaskType = 'call' | 'email' | 'meeting' | 'todo' | 'follow_up'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'deferred'

export interface MeetingAttendee {
  user_id?: string
  email: string
  name: string
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  end_date?: string
}

// Report and Dashboard types (defined before Database type)
export type ReportType = 'standard' | 'custom'
export type ReportObjectType = 'leads' | 'contacts' | 'accounts' | 'deals' | 'activities' | 'campaigns' | 'users'
export type ChartType = 'bar' | 'line' | 'pie' | 'funnel' | 'gauge' | 'table' | 'kpi'
export type WidgetType = 'chart' | 'kpi' | 'list' | 'activity_feed'

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null'
  value: unknown
  value2?: unknown // For 'between' operator
}

export interface ReportSummarization {
  type?: 'count' | 'sum' | 'avg' | 'min' | 'max'
  field?: string
}

export interface DashboardWidgetLayout {
  widget_id: string
  x: number
  y: number
  w: number
  h: number
}

// Audit Trail types (defined before Database type)
export type AuditOperation = 'create' | 'update' | 'delete'
export type AuditSource = 'web' | 'api' | 'import' | 'workflow' | 'system'

export interface AuditChange {
  field: string
  old_value: unknown
  new_value: unknown
  field_label: string
}

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
          role: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          permission: string
          created_at: string
        }
        Insert: {
          id?: string
          role: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          permission: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'
          permission?: string
          created_at?: string
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
          campaign_id: string | null
          converted_contact_id: string | null
          converted_account_id: string | null
          converted_at: string | null
          // Lead scoring fields
          score: number | null
          score_label: 'cold' | 'warm' | 'hot' | 'qualified' | null
          demographic_score: number | null
          behavioral_score: number | null
          engagement_score: number | null
          fit_score: number | null
          score_breakdown: Record<string, number> | null
          last_score_update: string | null
          last_activity_at: string | null
          activity_count: number
          // Qualification fields
          qualification_status: 'not_started' | 'in_progress' | 'qualified' | 'disqualified' | null
          qualification_checklist: Record<string, boolean> | null
          industry: string | null
          company_size: string | null
          annual_revenue: string | null
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
          campaign_id?: string | null
          converted_contact_id?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          // Lead scoring fields
          score?: number | null
          score_label?: 'cold' | 'warm' | 'hot' | 'qualified' | null
          demographic_score?: number | null
          behavioral_score?: number | null
          engagement_score?: number | null
          fit_score?: number | null
          score_breakdown?: Record<string, number> | null
          last_score_update?: string | null
          last_activity_at?: string | null
          activity_count?: number
          // Qualification fields
          qualification_status?: 'not_started' | 'in_progress' | 'qualified' | 'disqualified' | null
          qualification_checklist?: Record<string, boolean> | null
          industry?: string | null
          company_size?: string | null
          annual_revenue?: string | null
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
          campaign_id?: string | null
          converted_contact_id?: string | null
          converted_account_id?: string | null
          converted_at?: string | null
          // Lead scoring fields
          score?: number | null
          score_label?: 'cold' | 'warm' | 'hot' | 'qualified' | null
          demographic_score?: number | null
          behavioral_score?: number | null
          engagement_score?: number | null
          fit_score?: number | null
          score_breakdown?: Record<string, number> | null
          last_score_update?: string | null
          last_activity_at?: string | null
          activity_count?: number
          // Qualification fields
          qualification_status?: 'not_started' | 'in_progress' | 'qualified' | 'disqualified' | null
          qualification_checklist?: Record<string, boolean> | null
          industry?: string | null
          company_size?: string | null
          annual_revenue?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_scoring_rules: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          category: 'demographic' | 'behavioral' | 'engagement' | 'fit'
          field_name: string
          operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
          field_value: string | null
          field_values: string[] | null
          points: number
          is_active: boolean
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          category: 'demographic' | 'behavioral' | 'engagement' | 'fit'
          field_name: string
          operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
          field_value?: string | null
          field_values?: string[] | null
          points: number
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          category?: 'demographic' | 'behavioral' | 'engagement' | 'fit'
          field_name?: string
          operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
          field_value?: string | null
          field_values?: string[] | null
          points?: number
          is_active?: boolean
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      lead_scoring_settings: {
        Row: {
          id: string
          tenant_id: string
          cold_threshold: number
          warm_threshold: number
          hot_threshold: number
          qualified_threshold: number
          auto_convert_enabled: boolean
          auto_convert_threshold: number
          score_decay_enabled: boolean
          score_decay_days: number
          score_decay_percentage: number
          qualification_framework: 'bant' | 'meddic' | 'custom'
          qualification_criteria: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          cold_threshold?: number
          warm_threshold?: number
          hot_threshold?: number
          qualified_threshold?: number
          auto_convert_enabled?: boolean
          auto_convert_threshold?: number
          score_decay_enabled?: boolean
          score_decay_days?: number
          score_decay_percentage?: number
          qualification_framework?: 'bant' | 'meddic' | 'custom'
          qualification_criteria?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          cold_threshold?: number
          warm_threshold?: number
          hot_threshold?: number
          qualified_threshold?: number
          auto_convert_enabled?: boolean
          auto_convert_threshold?: number
          score_decay_enabled?: boolean
          score_decay_days?: number
          score_decay_percentage?: number
          qualification_framework?: 'bant' | 'meddic' | 'custom'
          qualification_criteria?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      lead_score_history: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          previous_score: number | null
          new_score: number
          change_reason: string | null
          triggered_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          previous_score?: number | null
          new_score: number
          change_reason?: string | null
          triggered_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          previous_score?: number | null
          new_score?: number
          change_reason?: string | null
          triggered_by?: string | null
          created_at?: string
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
          campaign_id: string | null
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
          campaign_id?: string | null
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
          campaign_id?: string | null
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
      pipelines: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          pipeline_type: PipelineType
          is_default: boolean
          is_active: boolean
          color: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          pipeline_type?: PipelineType
          is_default?: boolean
          is_active?: boolean
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          pipeline_type?: PipelineType
          is_default?: boolean
          is_active?: boolean
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      deal_stages: {
        Row: {
          id: string
          tenant_id: string
          pipeline_id: string | null
          name: string
          position: number
          probability: number
          color: string | null
          stage_type: StageType
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          pipeline_id?: string | null
          name: string
          position: number
          probability?: number
          color?: string | null
          stage_type?: StageType
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          pipeline_id?: string | null
          name?: string
          position?: number
          probability?: number
          color?: string | null
          stage_type?: StageType
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deal_stage_history: {
        Row: {
          id: string
          tenant_id: string
          deal_id: string
          from_stage_id: string | null
          to_stage_id: string
          from_pipeline_id: string | null
          to_pipeline_id: string | null
          changed_by: string | null
          changed_at: string
          time_in_previous_stage: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          deal_id: string
          from_stage_id?: string | null
          to_stage_id: string
          from_pipeline_id?: string | null
          to_pipeline_id?: string | null
          changed_by?: string | null
          changed_at?: string
          time_in_previous_stage?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          deal_id?: string
          from_stage_id?: string | null
          to_stage_id?: string
          from_pipeline_id?: string | null
          to_pipeline_id?: string | null
          changed_by?: string | null
          changed_at?: string
          time_in_previous_stage?: string | null
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
      tasks: {
        Row: {
          id: string
          tenant_id: string
          subject: string
          description: string | null
          task_type: 'call' | 'email' | 'meeting' | 'todo' | 'follow_up'
          priority: 'low' | 'medium' | 'high'
          status: 'not_started' | 'in_progress' | 'completed' | 'deferred'
          due_date: string | null
          due_time: string | null
          completed_at: string | null
          entity_type: string | null
          entity_id: string | null
          owner_id: string | null
          assigned_to: string | null
          call_duration: number | null
          call_outcome: string | null
          meeting_location: string | null
          meeting_attendees: MeetingAttendee[] | null
          reminder_enabled: boolean
          reminder_minutes_before: number
          reminder_sent_at: string | null
          is_recurring: boolean
          recurrence_pattern: RecurrencePattern | null
          parent_task_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          subject: string
          description?: string | null
          task_type?: 'call' | 'email' | 'meeting' | 'todo' | 'follow_up'
          priority?: 'low' | 'medium' | 'high'
          status?: 'not_started' | 'in_progress' | 'completed' | 'deferred'
          due_date?: string | null
          due_time?: string | null
          completed_at?: string | null
          entity_type?: string | null
          entity_id?: string | null
          owner_id?: string | null
          assigned_to?: string | null
          call_duration?: number | null
          call_outcome?: string | null
          meeting_location?: string | null
          meeting_attendees?: MeetingAttendee[] | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number
          reminder_sent_at?: string | null
          is_recurring?: boolean
          recurrence_pattern?: RecurrencePattern | null
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          subject?: string
          description?: string | null
          task_type?: 'call' | 'email' | 'meeting' | 'todo' | 'follow_up'
          priority?: 'low' | 'medium' | 'high'
          status?: 'not_started' | 'in_progress' | 'completed' | 'deferred'
          due_date?: string | null
          due_time?: string | null
          completed_at?: string | null
          entity_type?: string | null
          entity_id?: string | null
          owner_id?: string | null
          assigned_to?: string | null
          call_duration?: number | null
          call_outcome?: string | null
          meeting_location?: string | null
          meeting_attendees?: MeetingAttendee[] | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number
          reminder_sent_at?: string | null
          is_recurring?: boolean
          recurrence_pattern?: RecurrencePattern | null
          parent_task_id?: string | null
          created_at?: string
          updated_at?: string
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
      campaigns: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          campaign_type: 'email' | 'event' | 'webinar' | 'ads' | 'content' | 'social' | 'direct_mail' | 'referral' | 'other'
          status: 'planned' | 'active' | 'paused' | 'completed' | 'archived'
          budget: number | null
          actual_cost: number | null
          start_date: string | null
          end_date: string | null
          owner_id: string | null
          parent_campaign_id: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_term: string | null
          utm_content: string | null
          expected_response_rate: number | null
          expected_revenue: number | null
          total_leads: number
          total_contacts: number
          total_responses: number
          total_converted: number
          total_revenue: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          campaign_type: 'email' | 'event' | 'webinar' | 'ads' | 'content' | 'social' | 'direct_mail' | 'referral' | 'other'
          status?: 'planned' | 'active' | 'paused' | 'completed' | 'archived'
          budget?: number | null
          actual_cost?: number | null
          start_date?: string | null
          end_date?: string | null
          owner_id?: string | null
          parent_campaign_id?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          expected_response_rate?: number | null
          expected_revenue?: number | null
          total_leads?: number
          total_contacts?: number
          total_responses?: number
          total_converted?: number
          total_revenue?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          campaign_type?: 'email' | 'event' | 'webinar' | 'ads' | 'content' | 'social' | 'direct_mail' | 'referral' | 'other'
          status?: 'planned' | 'active' | 'paused' | 'completed' | 'archived'
          budget?: number | null
          actual_cost?: number | null
          start_date?: string | null
          end_date?: string | null
          owner_id?: string | null
          parent_campaign_id?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          expected_response_rate?: number | null
          expected_revenue?: number | null
          total_leads?: number
          total_contacts?: number
          total_responses?: number
          total_converted?: number
          total_revenue?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_members: {
        Row: {
          id: string
          campaign_id: string
          tenant_id: string
          lead_id: string | null
          contact_id: string | null
          is_primary_source: boolean
          status: 'added' | 'sent' | 'opened' | 'clicked' | 'responded' | 'converted' | 'unsubscribed' | 'bounced'
          responded_at: string | null
          converted_at: string | null
          first_touch: boolean
          last_touch: boolean
          touch_count: number
          attribution_percentage: number | null
          attributed_revenue: number | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_term: string | null
          utm_content: string | null
          landing_page_url: string | null
          referrer_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          tenant_id: string
          lead_id?: string | null
          contact_id?: string | null
          is_primary_source?: boolean
          status?: 'added' | 'sent' | 'opened' | 'clicked' | 'responded' | 'converted' | 'unsubscribed' | 'bounced'
          responded_at?: string | null
          converted_at?: string | null
          first_touch?: boolean
          last_touch?: boolean
          touch_count?: number
          attribution_percentage?: number | null
          attributed_revenue?: number | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          landing_page_url?: string | null
          referrer_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          tenant_id?: string
          lead_id?: string | null
          contact_id?: string | null
          is_primary_source?: boolean
          status?: 'added' | 'sent' | 'opened' | 'clicked' | 'responded' | 'converted' | 'unsubscribed' | 'bounced'
          responded_at?: string | null
          converted_at?: string | null
          first_touch?: boolean
          last_touch?: boolean
          touch_count?: number
          attribution_percentage?: number | null
          attributed_revenue?: number | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_term?: string | null
          utm_content?: string | null
          landing_page_url?: string | null
          referrer_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      campaign_responses: {
        Row: {
          id: string
          campaign_member_id: string
          tenant_id: string
          response_type: string
          response_date: string
          response_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_member_id: string
          tenant_id: string
          response_type: string
          response_date?: string
          response_data?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_member_id?: string
          tenant_id?: string
          response_type?: string
          response_date?: string
          response_data?: Record<string, unknown> | null
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          name: string
          sku: string
          description: string | null
          category: string | null
          family: string | null
          status: ProductStatus
          list_price: number | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          sku: string
          description?: string | null
          category?: string | null
          family?: string | null
          status?: ProductStatus
          list_price?: number | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          sku?: string
          description?: string | null
          category?: string | null
          family?: string | null
          status?: ProductStatus
          list_price?: number | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      price_books: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: PriceBookType
          description: string | null
          is_active: boolean
          is_default: boolean
          currency: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type?: PriceBookType
          description?: string | null
          is_active?: boolean
          is_default?: boolean
          currency?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          type?: PriceBookType
          description?: string | null
          is_active?: boolean
          is_default?: boolean
          currency?: string
          created_at?: string
          updated_at?: string
        }
      }
      price_book_entries: {
        Row: {
          id: string
          price_book_id: string
          product_id: string
          unit_price: number
          min_quantity: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          price_book_id: string
          product_id: string
          unit_price: number
          min_quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          price_book_id?: string
          product_id?: string
          unit_price?: number
          min_quantity?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      volume_pricing_tiers: {
        Row: {
          id: string
          price_book_entry_id: string
          min_quantity: number
          max_quantity: number | null
          unit_price: number
          discount_percentage: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          price_book_entry_id: string
          min_quantity: number
          max_quantity?: number | null
          unit_price: number
          discount_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          price_book_entry_id?: string
          min_quantity?: number
          max_quantity?: number | null
          unit_price?: number
          discount_percentage?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      deal_products: {
        Row: {
          id: string
          deal_id: string
          product_id: string
          price_book_entry_id: string | null
          quantity: number
          unit_price: number
          discount_percentage: number
          discount_amount: number
          line_total: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          deal_id: string
          product_id: string
          price_book_entry_id?: string | null
          quantity?: number
          unit_price: number
          discount_percentage?: number
          discount_amount?: number
          line_total: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          deal_id?: string
          product_id?: string
          price_book_entry_id?: string | null
          quantity?: number
          unit_price?: number
          discount_percentage?: number
          discount_amount?: number
          line_total?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          tenant_id: string
          deal_id: string | null
          quote_number: string
          name: string
          status: QuoteStatus
          account_id: string | null
          contact_id: string | null
          price_book_id: string | null
          billing_name: string | null
          billing_street: string | null
          billing_city: string | null
          billing_state: string | null
          billing_postal_code: string | null
          billing_country: string | null
          shipping_name: string | null
          shipping_street: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_postal_code: string | null
          shipping_country: string | null
          subtotal: number
          discount_percentage: number
          discount_amount: number
          tax_percentage: number
          tax_amount: number
          total_amount: number
          terms: string | null
          notes: string | null
          expires_at: string | null
          sent_at: string | null
          accepted_at: string | null
          rejected_at: string | null
          owner_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          deal_id?: string | null
          quote_number: string
          name: string
          status?: QuoteStatus
          account_id?: string | null
          contact_id?: string | null
          price_book_id?: string | null
          billing_name?: string | null
          billing_street?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          shipping_name?: string | null
          shipping_street?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          shipping_country?: string | null
          subtotal?: number
          discount_percentage?: number
          discount_amount?: number
          tax_percentage?: number
          tax_amount?: number
          total_amount?: number
          terms?: string | null
          notes?: string | null
          expires_at?: string | null
          sent_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          deal_id?: string | null
          quote_number?: string
          name?: string
          status?: QuoteStatus
          account_id?: string | null
          contact_id?: string | null
          price_book_id?: string | null
          billing_name?: string | null
          billing_street?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_postal_code?: string | null
          billing_country?: string | null
          shipping_name?: string | null
          shipping_street?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_postal_code?: string | null
          shipping_country?: string | null
          subtotal?: number
          discount_percentage?: number
          discount_amount?: number
          tax_percentage?: number
          tax_amount?: number
          total_amount?: number
          terms?: string | null
          notes?: string | null
          expires_at?: string | null
          sent_at?: string | null
          accepted_at?: string | null
          rejected_at?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quote_line_items: {
        Row: {
          id: string
          quote_id: string
          product_id: string | null
          name: string
          description: string | null
          quantity: number
          unit_price: number
          discount_percentage: number
          discount_amount: number
          line_total: number
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          product_id?: string | null
          name: string
          description?: string | null
          quantity?: number
          unit_price: number
          discount_percentage?: number
          discount_amount?: number
          line_total: number
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          product_id?: string | null
          name?: string
          description?: string | null
          quantity?: number
          unit_price?: number
          discount_percentage?: number
          discount_amount?: number
          line_total?: number
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      quotas: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          period_type: 'monthly' | 'quarterly' | 'yearly'
          period_start: string
          period_end: string
          quota_amount: number
          territory_id: string | null
          team_id: string | null
          product_category: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          period_type: 'monthly' | 'quarterly' | 'yearly'
          period_start: string
          period_end: string
          quota_amount: number
          territory_id?: string | null
          team_id?: string | null
          product_category?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          period_type?: 'monthly' | 'quarterly' | 'yearly'
          period_start?: string
          period_end?: string
          quota_amount?: number
          territory_id?: string | null
          team_id?: string | null
          product_category?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      forecast_entries: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          period_type: 'monthly' | 'quarterly' | 'yearly'
          period_start: string
          period_end: string
          forecast_type: 'pipeline' | 'commit' | 'best_case' | 'ai_predicted'
          amount: number
          deal_count: number
          weighted_amount: number | null
          manager_override_amount: number | null
          manager_override_by: string | null
          manager_override_note: string | null
          manager_override_at: string | null
          territory_id: string | null
          team_id: string | null
          product_category: string | null
          snapshot_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          period_type: 'monthly' | 'quarterly' | 'yearly'
          period_start: string
          period_end: string
          forecast_type: 'pipeline' | 'commit' | 'best_case' | 'ai_predicted'
          amount: number
          deal_count?: number
          weighted_amount?: number | null
          manager_override_amount?: number | null
          manager_override_by?: string | null
          manager_override_note?: string | null
          manager_override_at?: string | null
          territory_id?: string | null
          team_id?: string | null
          product_category?: string | null
          snapshot_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          period_type?: 'monthly' | 'quarterly' | 'yearly'
          period_start?: string
          period_end?: string
          forecast_type?: 'pipeline' | 'commit' | 'best_case' | 'ai_predicted'
          amount?: number
          deal_count?: number
          weighted_amount?: number | null
          manager_override_amount?: number | null
          manager_override_by?: string | null
          manager_override_note?: string | null
          manager_override_at?: string | null
          territory_id?: string | null
          team_id?: string | null
          product_category?: string | null
          snapshot_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      forecast_deal_snapshots: {
        Row: {
          id: string
          forecast_entry_id: string
          deal_id: string
          deal_name: string
          deal_value: number
          deal_probability: number
          weighted_value: number
          stage_name: string
          expected_close_date: string | null
          forecast_category: 'pipeline' | 'commit' | 'best_case' | 'omitted'
          created_at: string
        }
        Insert: {
          id?: string
          forecast_entry_id: string
          deal_id: string
          deal_name: string
          deal_value: number
          deal_probability: number
          weighted_value: number
          stage_name: string
          expected_close_date?: string | null
          forecast_category?: 'pipeline' | 'commit' | 'best_case' | 'omitted'
          created_at?: string
        }
        Update: {
          id?: string
          forecast_entry_id?: string
          deal_id?: string
          deal_name?: string
          deal_value?: number
          deal_probability?: number
          weighted_value?: number
          stage_name?: string
          expected_close_date?: string | null
          forecast_category?: 'pipeline' | 'commit' | 'best_case' | 'omitted'
          created_at?: string
        }
      }
      custom_fields: {
        Row: {
          id: string
          tenant_id: string
          module: CustomFieldModule
          name: string
          label: string
          description: string | null
          field_type: CustomFieldType
          is_required: boolean
          is_unique: boolean
          default_value: string | null
          min_value: number | null
          max_value: number | null
          decimal_places: number
          currency_code: string
          min_length: number | null
          max_length: number | null
          pattern: string | null
          pattern_error_message: string | null
          picklist_options: PicklistOption[] | null
          allow_multiple: boolean
          lookup_module: CustomFieldModule | null
          is_active: boolean
          visible_to_roles: string[] | null
          editable_by_roles: string[] | null
          position: number
          field_group: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          module: CustomFieldModule
          name: string
          label: string
          description?: string | null
          field_type: CustomFieldType
          is_required?: boolean
          is_unique?: boolean
          default_value?: string | null
          min_value?: number | null
          max_value?: number | null
          decimal_places?: number
          currency_code?: string
          min_length?: number | null
          max_length?: number | null
          pattern?: string | null
          pattern_error_message?: string | null
          picklist_options?: PicklistOption[] | null
          allow_multiple?: boolean
          lookup_module?: CustomFieldModule | null
          is_active?: boolean
          visible_to_roles?: string[] | null
          editable_by_roles?: string[] | null
          position: number
          field_group?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          module?: CustomFieldModule
          name?: string
          label?: string
          description?: string | null
          field_type?: CustomFieldType
          is_required?: boolean
          is_unique?: boolean
          default_value?: string | null
          min_value?: number | null
          max_value?: number | null
          decimal_places?: number
          currency_code?: string
          min_length?: number | null
          max_length?: number | null
          pattern?: string | null
          pattern_error_message?: string | null
          picklist_options?: PicklistOption[] | null
          allow_multiple?: boolean
          lookup_module?: CustomFieldModule | null
          is_active?: boolean
          visible_to_roles?: string[] | null
          editable_by_roles?: string[] | null
          position?: number
          field_group?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      custom_field_values: {
        Row: {
          id: string
          tenant_id: string
          field_id: string
          entity_id: string
          module: CustomFieldModule
          value: unknown
          lookup_value_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          field_id: string
          entity_id: string
          module: CustomFieldModule
          value?: unknown
          lookup_value_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          field_id?: string
          entity_id?: string
          module?: CustomFieldModule
          value?: unknown
          lookup_value_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          report_type: ReportType
          object_type: ReportObjectType
          fields: string[]
          filters: ReportFilter[]
          grouping: string | null
          summarization: ReportSummarization
          sort_field: string | null
          sort_direction: string
          standard_report_key: string | null
          chart_type: ChartType
          chart_config: Record<string, unknown>
          is_public: boolean
          owner_id: string | null
          shared_with_roles: string[]
          schedule_enabled: boolean
          schedule_cron: string | null
          schedule_recipients: string[]
          last_run_at: string | null
          cache_enabled: boolean
          cache_ttl_minutes: number
          cached_at: string | null
          cached_results: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          report_type?: ReportType
          object_type: ReportObjectType
          fields?: string[]
          filters?: ReportFilter[]
          grouping?: string | null
          summarization?: ReportSummarization
          sort_field?: string | null
          sort_direction?: string
          standard_report_key?: string | null
          chart_type?: ChartType
          chart_config?: Record<string, unknown>
          is_public?: boolean
          owner_id?: string | null
          shared_with_roles?: string[]
          schedule_enabled?: boolean
          schedule_cron?: string | null
          schedule_recipients?: string[]
          last_run_at?: string | null
          cache_enabled?: boolean
          cache_ttl_minutes?: number
          cached_at?: string | null
          cached_results?: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          report_type?: ReportType
          object_type?: ReportObjectType
          fields?: string[]
          filters?: ReportFilter[]
          grouping?: string | null
          summarization?: ReportSummarization
          sort_field?: string | null
          sort_direction?: string
          standard_report_key?: string | null
          chart_type?: ChartType
          chart_config?: Record<string, unknown>
          is_public?: boolean
          owner_id?: string | null
          shared_with_roles?: string[]
          schedule_enabled?: boolean
          schedule_cron?: string | null
          schedule_recipients?: string[]
          last_run_at?: string | null
          cache_enabled?: boolean
          cache_ttl_minutes?: number
          cached_at?: string | null
          cached_results?: unknown
          created_at?: string
          updated_at?: string
        }
      }
      dashboards: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          layout: DashboardWidgetLayout[]
          is_default: boolean
          is_public: boolean
          owner_id: string | null
          shared_with_roles: string[]
          auto_refresh_enabled: boolean
          auto_refresh_interval: number
          date_range_type: string
          date_range_start: string | null
          date_range_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          layout?: DashboardWidgetLayout[]
          is_default?: boolean
          is_public?: boolean
          owner_id?: string | null
          shared_with_roles?: string[]
          auto_refresh_enabled?: boolean
          auto_refresh_interval?: number
          date_range_type?: string
          date_range_start?: string | null
          date_range_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          layout?: DashboardWidgetLayout[]
          is_default?: boolean
          is_public?: boolean
          owner_id?: string | null
          shared_with_roles?: string[]
          auto_refresh_enabled?: boolean
          auto_refresh_interval?: number
          date_range_type?: string
          date_range_start?: string | null
          date_range_end?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dashboard_widgets: {
        Row: {
          id: string
          dashboard_id: string
          report_id: string | null
          widget_type: WidgetType
          title: string
          position_x: number
          position_y: number
          width: number
          height: number
          config: Record<string, unknown>
          kpi_metric: string | null
          kpi_target: number | null
          kpi_comparison_type: string | null
          chart_type: ChartType | null
          chart_config: Record<string, unknown> | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dashboard_id: string
          report_id?: string | null
          widget_type: WidgetType
          title: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          config?: Record<string, unknown>
          kpi_metric?: string | null
          kpi_target?: number | null
          kpi_comparison_type?: string | null
          chart_type?: ChartType | null
          chart_config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dashboard_id?: string
          report_id?: string | null
          widget_type?: WidgetType
          title?: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          config?: Record<string, unknown>
          kpi_metric?: string | null
          kpi_target?: number | null
          kpi_comparison_type?: string | null
          chart_type?: ChartType | null
          chart_config?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
        }
      }
      report_executions: {
        Row: {
          id: string
          report_id: string
          tenant_id: string
          user_id: string | null
          execution_type: string
          started_at: string
          completed_at: string | null
          row_count: number | null
          execution_time_ms: number | null
          filters_applied: unknown
          export_format: string | null
          error_message: string | null
        }
        Insert: {
          id?: string
          report_id: string
          tenant_id: string
          user_id?: string | null
          execution_type?: string
          started_at?: string
          completed_at?: string | null
          row_count?: number | null
          execution_time_ms?: number | null
          filters_applied?: unknown
          export_format?: string | null
          error_message?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          tenant_id?: string
          user_id?: string | null
          execution_type?: string
          started_at?: string
          completed_at?: string | null
          row_count?: number | null
          execution_time_ms?: number | null
          filters_applied?: unknown
          export_format?: string | null
          error_message?: string | null
        }
      }
      saved_report_filters: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          name: string
          object_type: ReportObjectType
          filters: ReportFilter[]
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          name: string
          object_type: ReportObjectType
          filters?: ReportFilter[]
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          name?: string
          object_type?: ReportObjectType
          filters?: ReportFilter[]
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // Workflow Automation tables
      workflows: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          trigger_type: WorkflowTriggerType
          trigger_config: WorkflowTriggerConfig
          entity_type: string
          is_active: boolean
          run_once_per_record: boolean
          position: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          trigger_type: WorkflowTriggerType
          trigger_config?: WorkflowTriggerConfig
          entity_type: string
          is_active?: boolean
          run_once_per_record?: boolean
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          description?: string | null
          trigger_type?: WorkflowTriggerType
          trigger_config?: WorkflowTriggerConfig
          entity_type?: string
          is_active?: boolean
          run_once_per_record?: boolean
          position?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workflow_conditions: {
        Row: {
          id: string
          workflow_id: string
          condition_group: number
          field_name: string
          operator: WorkflowConditionOperator
          field_value: string | null
          field_values: string[] | null
          logical_operator: 'AND' | 'OR'
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          condition_group?: number
          field_name: string
          operator: WorkflowConditionOperator
          field_value?: string | null
          field_values?: string[] | null
          logical_operator?: 'AND' | 'OR'
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          condition_group?: number
          field_name?: string
          operator?: WorkflowConditionOperator
          field_value?: string | null
          field_values?: string[] | null
          logical_operator?: 'AND' | 'OR'
          position?: number
          created_at?: string
        }
      }
      workflow_actions: {
        Row: {
          id: string
          workflow_id: string
          action_type: WorkflowActionType
          action_config: WorkflowActionConfig
          position: number
          delay_minutes: number
          stop_on_error: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          action_type: WorkflowActionType
          action_config?: WorkflowActionConfig
          position?: number
          delay_minutes?: number
          stop_on_error?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          action_type?: WorkflowActionType
          action_config?: WorkflowActionConfig
          position?: number
          delay_minutes?: number
          stop_on_error?: boolean
          created_at?: string
        }
      }
      workflow_executions: {
        Row: {
          id: string
          workflow_id: string
          tenant_id: string
          entity_type: string
          entity_id: string
          trigger_event: string
          trigger_data: Record<string, unknown> | null
          status: WorkflowExecutionStatus
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          tenant_id: string
          entity_type: string
          entity_id: string
          trigger_event: string
          trigger_data?: Record<string, unknown> | null
          status?: WorkflowExecutionStatus
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          tenant_id?: string
          entity_type?: string
          entity_id?: string
          trigger_event?: string
          trigger_data?: Record<string, unknown> | null
          status?: WorkflowExecutionStatus
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      workflow_action_logs: {
        Row: {
          id: string
          execution_id: string
          action_id: string | null
          action_type: WorkflowActionType
          status: WorkflowExecutionStatus
          input_data: Record<string, unknown> | null
          output_data: Record<string, unknown> | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          action_id?: string | null
          action_type: WorkflowActionType
          status?: WorkflowExecutionStatus
          input_data?: Record<string, unknown> | null
          output_data?: Record<string, unknown> | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          action_id?: string | null
          action_type?: WorkflowActionType
          status?: WorkflowExecutionStatus
          input_data?: Record<string, unknown> | null
          output_data?: Record<string, unknown> | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
      }
      workflow_record_runs: {
        Row: {
          id: string
          workflow_id: string
          entity_type: string
          entity_id: string
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          entity_type: string
          entity_id: string
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          entity_type?: string
          entity_id?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          tenant_id: string
          entity_type: string
          entity_id: string
          entity_name: string | null
          operation: AuditOperation
          user_id: string | null
          user_email: string | null
          user_name: string | null
          changed_at: string
          changes: AuditChange[]
          old_values: Record<string, unknown> | null
          new_values: Record<string, unknown> | null
          ip_address: string | null
          user_agent: string | null
          source: AuditSource
          is_immutable: boolean
          retention_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          entity_type: string
          entity_id: string
          entity_name?: string | null
          operation: AuditOperation
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          changed_at?: string
          changes?: AuditChange[]
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          source?: AuditSource
          is_immutable?: boolean
          retention_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          entity_type?: string
          entity_id?: string
          entity_name?: string | null
          operation?: AuditOperation
          user_id?: string | null
          user_email?: string | null
          user_name?: string | null
          changed_at?: string
          changes?: AuditChange[]
          old_values?: Record<string, unknown> | null
          new_values?: Record<string, unknown> | null
          ip_address?: string | null
          user_agent?: string | null
          source?: AuditSource
          is_immutable?: boolean
          retention_until?: string | null
          created_at?: string
        }
      }
      audit_settings: {
        Row: {
          id: string
          tenant_id: string
          track_creates: boolean
          track_updates: boolean
          track_deletes: boolean
          tracked_entities: string[]
          excluded_fields: string[]
          retention_days: number
          enable_data_export: boolean
          gdpr_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          track_creates?: boolean
          track_updates?: boolean
          track_deletes?: boolean
          tracked_entities?: string[]
          excluded_fields?: string[]
          retention_days?: number
          enable_data_export?: boolean
          gdpr_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          track_creates?: boolean
          track_updates?: boolean
          track_deletes?: boolean
          tracked_entities?: string[]
          excluded_fields?: string[]
          retention_days?: number
          enable_data_export?: boolean
          gdpr_mode?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Workflow types (defined early for use in Database type)
export type WorkflowTriggerType =
  | 'record_created'
  | 'record_updated'
  | 'field_changed'
  | 'stage_changed'
  | 'date_based'
  | 'manual'
  | 'webhook'

export type WorkflowActionType =
  | 'create_task'
  | 'send_email'
  | 'update_field'
  | 'assign_owner'
  | 'send_notification'
  | 'webhook_call'
  | 'create_record'

export type WorkflowExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export type WorkflowConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in'

export type WorkflowEntityType = 'lead' | 'contact' | 'deal' | 'account'

export interface WorkflowTriggerConfig {
  entity_type?: string
  field_name?: string
  from_value?: string
  to_value?: string
  pipeline_id?: string
  from_stage?: string
  to_stage?: string
  date_field?: string
  offset_days?: number
  offset_direction?: 'before' | 'after'
  secret_key?: string
}

export interface WorkflowActionConfig {
  // create_task
  subject?: string
  description?: string
  task_type?: string
  priority?: string
  due_days?: number
  assign_to?: string
  // send_email
  template_id?: string
  email_subject?: string
  body?: string
  to_field?: string
  // update_field
  field_name?: string
  field_value?: string
  // assign_owner
  user_id?: string
  team_id?: string
  assignment_rule?: 'round_robin' | 'load_balanced'
  // send_notification
  title?: string
  message?: string
  user_ids?: string[]
  notify_owner?: boolean
  // webhook_call
  url?: string
  method?: 'GET' | 'POST' | 'PUT'
  headers?: Record<string, string>
  body_template?: string
  // create_record
  record_entity_type?: string
  field_mappings?: Record<string, string>
}

// Custom field types
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'picklist'
  | 'multi_picklist'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'lookup'

export type CustomFieldModule = 'accounts' | 'contacts' | 'leads' | 'deals'

export interface PicklistOption {
  label: string
  value: string
  color?: string
  is_default?: boolean
}

export interface CustomField {
  id: string
  tenant_id: string
  module: CustomFieldModule
  name: string
  label: string
  description: string | null
  field_type: CustomFieldType
  is_required: boolean
  is_unique: boolean
  default_value: string | null
  min_value: number | null
  max_value: number | null
  decimal_places: number
  currency_code: string
  min_length: number | null
  max_length: number | null
  pattern: string | null
  pattern_error_message: string | null
  picklist_options: PicklistOption[] | null
  allow_multiple: boolean
  lookup_module: CustomFieldModule | null
  is_active: boolean
  visible_to_roles: string[] | null
  editable_by_roles: string[] | null
  position: number
  field_group: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  tenant_id: string
  field_id: string
  entity_id: string
  module: CustomFieldModule
  value: unknown
  lookup_value_id: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldWithValue extends CustomField {
  fieldValue?: CustomFieldValue
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

// Pipeline types
export type PipelineType = 'sales' | 'renewal' | 'upsell' | 'custom'
export type StageType = 'open' | 'won' | 'lost'

export type Pipeline = Database['public']['Tables']['pipelines']['Row']
export type PipelineInsert = Database['public']['Tables']['pipelines']['Insert']
export type PipelineUpdate = Database['public']['Tables']['pipelines']['Update']

export type DealStage = Database['public']['Tables']['deal_stages']['Row']
export type DealStageInsert = Database['public']['Tables']['deal_stages']['Insert']
export type DealStageUpdate = Database['public']['Tables']['deal_stages']['Update']

export type DealStageHistory = Database['public']['Tables']['deal_stage_history']['Row']
export type DealStageHistoryInsert = Database['public']['Tables']['deal_stage_history']['Insert']
export type DealStageHistoryUpdate = Database['public']['Tables']['deal_stage_history']['Update']

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

// Campaign types
export type CampaignType = 'email' | 'event' | 'webinar' | 'ads' | 'content' | 'social' | 'direct_mail' | 'referral' | 'other'
export type CampaignStatus = 'planned' | 'active' | 'paused' | 'completed' | 'archived'
export type CampaignMemberStatus = 'added' | 'sent' | 'opened' | 'clicked' | 'responded' | 'converted' | 'unsubscribed' | 'bounced'

export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type CampaignInsert = Database['public']['Tables']['campaigns']['Insert']
export type CampaignUpdate = Database['public']['Tables']['campaigns']['Update']

export type CampaignMember = Database['public']['Tables']['campaign_members']['Row']
export type CampaignMemberInsert = Database['public']['Tables']['campaign_members']['Insert']
export type CampaignMemberUpdate = Database['public']['Tables']['campaign_members']['Update']

export type CampaignResponse = Database['public']['Tables']['campaign_responses']['Row']
export type CampaignResponseInsert = Database['public']['Tables']['campaign_responses']['Insert']

// Product types
export type ProductStatus = 'active' | 'inactive' | 'discontinued'
export type PriceBookType = 'standard' | 'partner' | 'enterprise' | 'custom'
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type PriceBook = Database['public']['Tables']['price_books']['Row']
export type PriceBookInsert = Database['public']['Tables']['price_books']['Insert']
export type PriceBookUpdate = Database['public']['Tables']['price_books']['Update']

export type PriceBookEntry = Database['public']['Tables']['price_book_entries']['Row']
export type PriceBookEntryInsert = Database['public']['Tables']['price_book_entries']['Insert']
export type PriceBookEntryUpdate = Database['public']['Tables']['price_book_entries']['Update']

export type VolumePricingTier = Database['public']['Tables']['volume_pricing_tiers']['Row']
export type VolumePricingTierInsert = Database['public']['Tables']['volume_pricing_tiers']['Insert']
export type VolumePricingTierUpdate = Database['public']['Tables']['volume_pricing_tiers']['Update']

export type DealProduct = Database['public']['Tables']['deal_products']['Row']
export type DealProductInsert = Database['public']['Tables']['deal_products']['Insert']
export type DealProductUpdate = Database['public']['Tables']['deal_products']['Update']

export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

export type QuoteLineItem = Database['public']['Tables']['quote_line_items']['Row']
export type QuoteLineItemInsert = Database['public']['Tables']['quote_line_items']['Insert']
export type QuoteLineItemUpdate = Database['public']['Tables']['quote_line_items']['Update']

// Forecasting types
export type QuotaPeriodType = 'monthly' | 'quarterly' | 'yearly'
export type ForecastType = 'pipeline' | 'commit' | 'best_case' | 'ai_predicted'
export type ForecastCategory = 'pipeline' | 'commit' | 'best_case' | 'omitted'

export type Quota = Database['public']['Tables']['quotas']['Row']
export type QuotaInsert = Database['public']['Tables']['quotas']['Insert']
export type QuotaUpdate = Database['public']['Tables']['quotas']['Update']

export type ForecastEntry = Database['public']['Tables']['forecast_entries']['Row']
export type ForecastEntryInsert = Database['public']['Tables']['forecast_entries']['Insert']
export type ForecastEntryUpdate = Database['public']['Tables']['forecast_entries']['Update']

export type ForecastDealSnapshot = Database['public']['Tables']['forecast_deal_snapshots']['Row']
export type ForecastDealSnapshotInsert = Database['public']['Tables']['forecast_deal_snapshots']['Insert']
export type ForecastDealSnapshotUpdate = Database['public']['Tables']['forecast_deal_snapshots']['Update']

// Lead Scoring types
export type LeadScoreLabel = 'cold' | 'warm' | 'hot' | 'qualified'
export type LeadQualificationStatus = 'not_started' | 'in_progress' | 'qualified' | 'disqualified'
export type ScoringRuleCategory = 'demographic' | 'behavioral' | 'engagement' | 'fit'
export type ScoringRuleOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'exists' | 'not_exists'
export type QualificationFramework = 'bant' | 'meddic' | 'custom'

export type Lead = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export type LeadScoringRule = Database['public']['Tables']['lead_scoring_rules']['Row']
export type LeadScoringRuleInsert = Database['public']['Tables']['lead_scoring_rules']['Insert']
export type LeadScoringRuleUpdate = Database['public']['Tables']['lead_scoring_rules']['Update']

export type LeadScoringSettings = Database['public']['Tables']['lead_scoring_settings']['Row']
export type LeadScoringSettingsInsert = Database['public']['Tables']['lead_scoring_settings']['Insert']
export type LeadScoringSettingsUpdate = Database['public']['Tables']['lead_scoring_settings']['Update']

export type LeadScoreHistory = Database['public']['Tables']['lead_score_history']['Row']
export type LeadScoreHistoryInsert = Database['public']['Tables']['lead_score_history']['Insert']
export type LeadScoreHistoryUpdate = Database['public']['Tables']['lead_score_history']['Update']

// Report types
export type Report = Database['public']['Tables']['reports']['Row']
export type ReportInsert = Database['public']['Tables']['reports']['Insert']
export type ReportUpdate = Database['public']['Tables']['reports']['Update']

// Dashboard types
export type Dashboard = Database['public']['Tables']['dashboards']['Row']
export type DashboardInsert = Database['public']['Tables']['dashboards']['Insert']
export type DashboardUpdate = Database['public']['Tables']['dashboards']['Update']

export type DashboardWidget = Database['public']['Tables']['dashboard_widgets']['Row']
export type DashboardWidgetInsert = Database['public']['Tables']['dashboard_widgets']['Insert']
export type DashboardWidgetUpdate = Database['public']['Tables']['dashboard_widgets']['Update']

export type ReportExecution = Database['public']['Tables']['report_executions']['Row']
export type ReportExecutionInsert = Database['public']['Tables']['report_executions']['Insert']
export type ReportExecutionUpdate = Database['public']['Tables']['report_executions']['Update']

export type SavedReportFilter = Database['public']['Tables']['saved_report_filters']['Row']
export type SavedReportFilterInsert = Database['public']['Tables']['saved_report_filters']['Insert']
export type SavedReportFilterUpdate = Database['public']['Tables']['saved_report_filters']['Update']

// Standard report keys
export type StandardReportKey =
  | 'pipeline_by_stage'
  | 'deals_closed_won'
  | 'deals_closed_lost'
  | 'lead_conversion_rate'
  | 'sales_by_rep'
  | 'sales_by_team'
  | 'activity_by_type'
  | 'activity_by_rep'
  | 'forecast_vs_actual'

// Report result types
export interface ReportResult {
  data: Record<string, unknown>[]
  totalCount: number
  summary?: Record<string, number>
  executionTimeMs: number
}

// Task types
export type Task = Database['public']['Tables']['tasks']['Row'] & {
  users?: { full_name: string | null } | null
  assigned_user?: { full_name: string | null } | null
  entity_name?: string | null
}
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

// Task constants
export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'todo', label: 'To-Do' },
  { value: 'follow_up', label: 'Follow-up' },
]

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export const TASK_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
]

export const CALL_OUTCOMES: { value: string; label: string }[] = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
]

// Workflow types
export type Workflow = Database['public']['Tables']['workflows']['Row']
export type WorkflowInsert = Database['public']['Tables']['workflows']['Insert']
export type WorkflowUpdate = Database['public']['Tables']['workflows']['Update']

export type WorkflowCondition = Database['public']['Tables']['workflow_conditions']['Row']
export type WorkflowConditionInsert = Database['public']['Tables']['workflow_conditions']['Insert']
export type WorkflowConditionUpdate = Database['public']['Tables']['workflow_conditions']['Update']

export type WorkflowAction = Database['public']['Tables']['workflow_actions']['Row']
export type WorkflowActionInsert = Database['public']['Tables']['workflow_actions']['Insert']
export type WorkflowActionUpdate = Database['public']['Tables']['workflow_actions']['Update']

export type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row']
export type WorkflowExecutionInsert = Database['public']['Tables']['workflow_executions']['Insert']
export type WorkflowExecutionUpdate = Database['public']['Tables']['workflow_executions']['Update']

export type WorkflowActionLog = Database['public']['Tables']['workflow_action_logs']['Row']
export type WorkflowActionLogInsert = Database['public']['Tables']['workflow_action_logs']['Insert']
export type WorkflowActionLogUpdate = Database['public']['Tables']['workflow_action_logs']['Update']

export type WorkflowRecordRun = Database['public']['Tables']['workflow_record_runs']['Row']
export type WorkflowRecordRunInsert = Database['public']['Tables']['workflow_record_runs']['Insert']
export type WorkflowRecordRunUpdate = Database['public']['Tables']['workflow_record_runs']['Update']

// Workflow with related data
export interface WorkflowWithDetails extends Workflow {
  conditions?: WorkflowCondition[]
  actions?: WorkflowAction[]
  created_by_user?: { full_name: string | null } | null
}

// Workflow constants
export const WORKFLOW_TRIGGER_TYPES: { value: WorkflowTriggerType; label: string; description: string }[] = [
  { value: 'record_created', label: 'Record Created', description: 'When a new record is created' },
  { value: 'record_updated', label: 'Record Updated', description: 'When a record is updated' },
  { value: 'field_changed', label: 'Field Changed', description: 'When a specific field value changes' },
  { value: 'stage_changed', label: 'Stage Changed', description: 'When a deal stage changes' },
  { value: 'date_based', label: 'Date Based', description: 'X days before/after a date field' },
  { value: 'manual', label: 'Manual Trigger', description: 'Manually triggered by user' },
  { value: 'webhook', label: 'Webhook', description: 'Triggered by external webhook' },
]

export const WORKFLOW_ACTION_TYPES: { value: WorkflowActionType; label: string; description: string }[] = [
  { value: 'create_task', label: 'Create Task', description: 'Create a new task' },
  { value: 'send_email', label: 'Send Email', description: 'Send an email' },
  { value: 'update_field', label: 'Update Field', description: 'Update a field value' },
  { value: 'assign_owner', label: 'Assign Owner', description: 'Assign to user or team' },
  { value: 'send_notification', label: 'Send Notification', description: 'Send in-app notification' },
  { value: 'webhook_call', label: 'Webhook Call', description: 'Call external webhook' },
  { value: 'create_record', label: 'Create Record', description: 'Create a related record' },
]

export const WORKFLOW_CONDITION_OPERATORS: { value: WorkflowConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_null', label: 'Is Empty' },
  { value: 'is_not_null', label: 'Is Not Empty' },
  { value: 'in', label: 'Is One Of' },
  { value: 'not_in', label: 'Is Not One Of' },
]

export const WORKFLOW_ENTITY_TYPES: { value: WorkflowEntityType; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'contact', label: 'Contact' },
  { value: 'deal', label: 'Deal' },
  { value: 'account', label: 'Account' },
]

export const WORKFLOW_EXECUTION_STATUS_COLORS: Record<WorkflowExecutionStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  running: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  skipped: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300' },
}

// Booking webhook configuration types
export type IntegrationProvider = 'calcom' | 'calendly' | 'google_calendar'

export interface BookingWebhookConfig {
  id: string
  tenant_id: string
  user_id: string
  provider: IntegrationProvider
  webhook_secret: string | null
  cal_username: string | null
  default_event_type: string | null
  is_active: boolean
  last_webhook_at: string | null
  last_error: string | null
  last_error_at: string | null
  created_at: string
  updated_at: string
}

export interface BookingWebhookConfigInsert {
  id?: string
  tenant_id: string
  user_id: string
  provider?: IntegrationProvider
  webhook_secret?: string | null
  cal_username?: string | null
  default_event_type?: string | null
  is_active?: boolean
}

export interface BookingWebhookConfigUpdate {
  webhook_secret?: string | null
  cal_username?: string | null
  default_event_type?: string | null
  is_active?: boolean
}

export interface BookingWebhookLog {
  id: string
  tenant_id: string
  config_id: string | null
  event_type: string
  cal_booking_uid: string | null
  request_payload: Record<string, unknown> | null
  response_status: number | null
  response_body: string | null
  processing_time_ms: number | null
  success: boolean
  error_message: string | null
  created_at: string
}

// Audit Trail types
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'] & {
  users?: { full_name: string | null } | null
}
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

export type AuditSettings = Database['public']['Tables']['audit_settings']['Row']
export type AuditSettingsInsert = Database['public']['Tables']['audit_settings']['Insert']
export type AuditSettingsUpdate = Database['public']['Tables']['audit_settings']['Update']

// Audit trail entity types that can be audited
export type AuditEntityType = 'account' | 'contact' | 'lead' | 'deal' | 'task' | 'campaign' | 'product'

export const AUDIT_ENTITY_TYPES: { value: AuditEntityType; label: string; plural: string }[] = [
  { value: 'account', label: 'Account', plural: 'accounts' },
  { value: 'contact', label: 'Contact', plural: 'contacts' },
  { value: 'lead', label: 'Lead', plural: 'leads' },
  { value: 'deal', label: 'Deal', plural: 'deals' },
  { value: 'task', label: 'Task', plural: 'tasks' },
  { value: 'campaign', label: 'Campaign', plural: 'campaigns' },
  { value: 'product', label: 'Product', plural: 'products' },
]

export const AUDIT_OPERATION_LABELS: Record<AuditOperation, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
}

export const AUDIT_OPERATION_COLORS: Record<AuditOperation, { bg: string; text: string }> = {
  create: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  update: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  delete: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
}

export const AUDIT_SOURCE_LABELS: Record<AuditSource, string> = {
  web: 'Web UI',
  api: 'API',
  import: 'Import',
  workflow: 'Workflow',
  system: 'System',
}
