import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// User role type - matches database enum
export type UserRole = 'admin' | 'sales_manager' | 'sdr' | 'ae' | 'am'

interface AuthUser {
  id: string
  email: string
  fullName: string | null
  tenantId: string | null
  role: UserRole | null
  isSuperAdmin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return
        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }
        setSession(session)
        if (session?.user) {
          fetchUserProfile(session.user)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error('Failed to get session:', err)
        if (mounted) setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    // Safety timeout - never spin forever
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout - forcing load complete')
        setLoading(false)
      }
    }, 10000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function fetchUserProfile(authUser: User) {
    try {
      // Check if super admin (use maybeSingle to avoid error on 0 rows)
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('email', authUser.email)
        .maybeSingle()

      if (superAdmin) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          fullName: authUser.user_metadata?.full_name || null,
          tenantId: null,
          role: null,
          isSuperAdmin: true,
        })
        setLoading(false)
        return
      }

      // Get regular user profile (use maybeSingle to handle new users)
      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id, full_name, role')
        .eq('id', authUser.id)
        .maybeSingle()

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        fullName: profile?.full_name || authUser.user_metadata?.full_name || null,
        tenantId: profile?.tenant_id || null,
        role: profile?.role || null,
        isSuperAdmin: false,
      })
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // Set basic user info even if profile fetch fails
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        fullName: authUser.user_metadata?.full_name || null,
        tenantId: null,
        role: null,
        isSuperAdmin: false,
      })
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  async function signUpWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { error: error as Error | null }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    return { error: error as Error | null }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
