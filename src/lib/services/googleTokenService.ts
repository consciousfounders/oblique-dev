import { supabase } from '@/lib/supabase'

interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

export type TokenErrorType = 'expired' | 'refresh_failed' | 'no_session' | 'no_refresh_token' | 'unknown'

export interface TokenError {
  type: TokenErrorType
  message: string
  requiresReauth: boolean
}

type TokenErrorCallback = (error: TokenError) => void
type TokenRefreshCallback = () => void

export class GoogleTokenService {
  private static tokens: GoogleTokens | null = null
  private static refreshPromise: Promise<string> | null = null
  private static onTokenError: TokenErrorCallback | null = null
  private static onTokenRefresh: TokenRefreshCallback | null = null
  private static refreshAttempts = 0
  private static readonly MAX_REFRESH_ATTEMPTS = 3
  private static readonly REFRESH_RETRY_DELAY = 1000

  static setTokenErrorCallback(callback: TokenErrorCallback | null) {
    this.onTokenError = callback
  }

  static setTokenRefreshCallback(callback: TokenRefreshCallback | null) {
    this.onTokenRefresh = callback
  }

  private static notifyError(error: TokenError) {
    if (this.onTokenError) {
      this.onTokenError(error)
    }
  }

  private static notifyRefresh() {
    if (this.onTokenRefresh) {
      this.onTokenRefresh()
    }
  }

  static isTokenExpiringSoon(): boolean {
    if (!this.tokens) return true
    // Token expires in less than 5 minutes
    return Date.now() > this.tokens.expiresAt - 300000
  }

  static isTokenExpired(): boolean {
    if (!this.tokens) return true
    return Date.now() >= this.tokens.expiresAt
  }

  static getTokenExpiryTime(): number | null {
    return this.tokens?.expiresAt || null
  }

  static async getAccessToken(): Promise<string> {
    // If we have a valid token (with 60 second buffer), return it
    if (this.tokens && Date.now() < this.tokens.expiresAt - 60000) {
      return this.tokens.accessToken
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // Try to get tokens from session first
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      const error: TokenError = {
        type: 'no_session',
        message: 'Failed to get session. Please sign in again.',
        requiresReauth: true,
      }
      this.notifyError(error)
      throw new Error(error.message)
    }

    if (!session) {
      const error: TokenError = {
        type: 'no_session',
        message: 'No active session. Please sign in.',
        requiresReauth: true,
      }
      this.notifyError(error)
      throw new Error(error.message)
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
      this.refreshAttempts = 0
      return providerToken
    }

    // Need to refresh
    if (!this.tokens?.refreshToken && !providerRefreshToken) {
      const error: TokenError = {
        type: 'no_refresh_token',
        message: 'No refresh token available. Please sign in again with Google.',
        requiresReauth: true,
      }
      this.notifyError(error)
      throw new Error(error.message)
    }

    return this.refreshAccessToken()
  }

  private static async refreshAccessToken(): Promise<string> {
    this.refreshPromise = (async () => {
      try {
        // Implement retry with exponential backoff
        while (this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
          try {
            const { data, error } = await supabase.auth.refreshSession()

            if (error) {
              throw error
            }

            if (!data.session?.provider_token) {
              throw new Error('No provider token in refreshed session')
            }

            this.tokens = {
              accessToken: data.session.provider_token,
              refreshToken: data.session.provider_refresh_token || this.tokens?.refreshToken || null,
              expiresAt: Date.now() + 3600000,
            }

            this.refreshAttempts = 0
            this.notifyRefresh()
            return data.session.provider_token
          } catch (err) {
            this.refreshAttempts++

            if (this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
              // Wait before retry with exponential backoff
              await new Promise(resolve =>
                setTimeout(resolve, this.REFRESH_RETRY_DELAY * Math.pow(2, this.refreshAttempts - 1))
              )
            } else {
              throw err
            }
          }
        }

        throw new Error('Max refresh attempts reached')
      } catch (err) {
        const error: TokenError = {
          type: 'refresh_failed',
          message: 'Failed to refresh authentication. Please sign in again.',
          requiresReauth: true,
        }
        this.notifyError(error)
        this.clearTokens()
        throw new Error(error.message)
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  static async proactiveRefresh(): Promise<boolean> {
    if (!this.isTokenExpiringSoon()) {
      return true
    }

    try {
      await this.getAccessToken()
      return true
    } catch {
      return false
    }
  }

  static async initialize(session: { provider_token?: string | null; provider_refresh_token?: string | null } | null) {
    if (session?.provider_token) {
      this.tokens = {
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token || null,
        expiresAt: Date.now() + 3600000,
      }
      this.refreshAttempts = 0
    }
  }

  static clearTokens() {
    this.tokens = null
    this.refreshPromise = null
    this.refreshAttempts = 0
  }

  static hasTokens(): boolean {
    return this.tokens !== null
  }
}
