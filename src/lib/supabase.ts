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
    }
  }
}
