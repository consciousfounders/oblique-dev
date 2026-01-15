import { supabase } from '@/lib/supabase'

interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

// Token URL and Client ID reserved for future server-side refresh implementation
// const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
// const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export class GoogleTokenService {
  private static tokens: GoogleTokens | null = null
  private static refreshPromise: Promise<string> | null = null

  static async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.tokens && Date.now() < this.tokens.expiresAt - 60000) {
      return this.tokens.accessToken
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Try to get tokens from session first
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('No active session')
    }

    const providerToken = session.provider_token
    const providerRefreshToken = session.provider_refresh_token

    if (providerToken) {
      // Session has a fresh token
      this.tokens = {
        accessToken: providerToken,
        refreshToken: providerRefreshToken || null,
        expiresAt: Date.now() + 3600000, // Assume 1 hour validity
      }
      return providerToken
    }

    // Need to refresh
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available. Please sign in again with Google.')
    }

    return this.refreshAccessToken()
  }

  private static async refreshAccessToken(): Promise<string> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = (async () => {
      try {
        // Note: This requires a backend endpoint for security
        // The client secret should never be exposed to the browser
        // For now, we'll use Supabase's built-in refresh mechanism
        const { data, error } = await supabase.auth.refreshSession()

        if (error || !data.session?.provider_token) {
          throw new Error('Failed to refresh Google token')
        }

        this.tokens = {
          accessToken: data.session.provider_token,
          refreshToken: data.session.provider_refresh_token || this.tokens?.refreshToken || null,
          expiresAt: Date.now() + 3600000,
        }

        return data.session.provider_token
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  static async initialize(session: { provider_token?: string | null; provider_refresh_token?: string | null } | null) {
    if (session?.provider_token) {
      this.tokens = {
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token || null,
        expiresAt: Date.now() + 3600000,
      }
    }
  }

  static clearTokens() {
    this.tokens = null
    this.refreshPromise = null
  }

  static hasTokens(): boolean {
    return this.tokens !== null
  }
}
