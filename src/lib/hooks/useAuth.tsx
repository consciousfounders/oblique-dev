import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email: string
  fullName: string | null
  tenantId: string | null
  role: 'admin' | 'sdr' | 'ae' | 'am' | null
  isSuperAdmin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchUserProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchUserProfile(session.user)
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserProfile(authUser: User) {
    try {
      // Check if super admin
      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('id')
        .eq('email', authUser.email)
        .single()

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

      // Get regular user profile
      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id, full_name, role')
        .eq('id', authUser.id)
        .single()

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
      },
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
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
