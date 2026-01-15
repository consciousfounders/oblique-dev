// OAuth 2.0 Service for Oblique CRM
// Implements OAuth 2.0 Authorization Code flow for third-party applications

import { supabase } from '@/lib/supabase'
import type { ApiScope } from './types'

// OAuth Application response type
export interface OAuthApplication {
  id: string
  name: string
  description: string | null
  client_id: string
  redirect_uris: string[]
  scopes: string[]
  is_active: boolean
  created_at: string
}

// OAuth Application with secret (only returned on creation)
export interface OAuthApplicationWithSecret extends OAuthApplication {
  client_secret: string
}

// Create OAuth Application request
export interface CreateOAuthApplicationRequest {
  name: string
  description?: string
  redirect_uris: string[]
  scopes: ApiScope[]
}

// OAuth Authorization request (for the authorize endpoint)
export interface AuthorizeRequest {
  client_id: string
  redirect_uri: string
  response_type: 'code'
  scope: string
  state?: string
}

// OAuth Token request (for the token endpoint)
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token'
  client_id: string
  client_secret: string
  code?: string
  redirect_uri?: string
  refresh_token?: string
}

// OAuth Token response
export interface TokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token: string
  scope: string
}

// Generate a secure random string
function generateSecureString(length: number, prefix: string = ''): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return prefix + Array.from(array, byte => chars[byte % chars.length]).join('')
}

// Hash a string using SHA-256
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = 3600 // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 3600 // 30 days in seconds
const AUTH_CODE_EXPIRY = 600 // 10 minutes in seconds

export class OAuthService {
  // Create a new OAuth application
  async createApplication(
    request: CreateOAuthApplicationRequest,
    tenantId: string,
    userId: string
  ): Promise<{ data: OAuthApplicationWithSecret | null; error: string | null }> {
    try {
      // Generate client credentials
      const clientId = generateSecureString(24, 'obl_')
      const clientSecret = generateSecureString(48, 'oblsec_')
      const clientSecretHash = await hashString(clientSecret)

      const { data, error } = await supabase
        .from('oauth_applications')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          name: request.name,
          description: request.description || null,
          client_id: clientId,
          client_secret_hash: clientSecretHash,
          redirect_uris: request.redirect_uris,
          scopes: request.scopes,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return {
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          client_id: data.client_id,
          client_secret: clientSecret, // Only returned on creation
          redirect_uris: data.redirect_uris,
          scopes: data.scopes,
          is_active: data.is_active,
          created_at: data.created_at,
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // List all OAuth applications for a tenant
  async listApplications(): Promise<{ data: OAuthApplication[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('oauth_applications')
        .select('id, name, description, client_id, redirect_uris, scopes, is_active, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as OAuthApplication[], error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Get a single OAuth application
  async getApplication(id: string): Promise<{ data: OAuthApplication | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('oauth_applications')
        .select('id, name, description, client_id, redirect_uris, scopes, is_active, created_at')
        .eq('id', id)
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as OAuthApplication, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Update an OAuth application
  async updateApplication(
    id: string,
    updates: Partial<Pick<CreateOAuthApplicationRequest, 'name' | 'description' | 'redirect_uris' | 'scopes'> & { is_active: boolean }>
  ): Promise<{ data: OAuthApplication | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('oauth_applications')
        .update(updates)
        .eq('id', id)
        .select('id, name, description, client_id, redirect_uris, scopes, is_active, created_at')
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as OAuthApplication, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Delete an OAuth application
  async deleteApplication(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // First revoke all tokens for this application
      await supabase
        .from('oauth_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('application_id', id)

      // Delete the application
      const { error } = await supabase
        .from('oauth_applications')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Regenerate client secret
  async regenerateClientSecret(id: string): Promise<{ data: { client_secret: string } | null; error: string | null }> {
    try {
      const newSecret = generateSecureString(48, 'oblsec_')
      const secretHash = await hashString(newSecret)

      const { error } = await supabase
        .from('oauth_applications')
        .update({ client_secret_hash: secretHash })
        .eq('id', id)

      if (error) {
        return { data: null, error: error.message }
      }

      // Revoke all existing tokens since secret changed
      await supabase
        .from('oauth_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('application_id', id)

      return { data: { client_secret: newSecret }, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Validate an authorization request
  async validateAuthorizeRequest(
    request: AuthorizeRequest
  ): Promise<{ valid: boolean; application?: OAuthApplication; error?: string }> {
    try {
      // Find the application by client_id
      const { data: app, error } = await supabase
        .from('oauth_applications')
        .select('id, name, description, client_id, redirect_uris, scopes, is_active, created_at')
        .eq('client_id', request.client_id)
        .single()

      if (error || !app) {
        return { valid: false, error: 'Invalid client_id' }
      }

      if (!app.is_active) {
        return { valid: false, error: 'Application is not active' }
      }

      // Validate redirect_uri
      if (!app.redirect_uris.includes(request.redirect_uri)) {
        return { valid: false, error: 'Invalid redirect_uri' }
      }

      // Validate response_type
      if (request.response_type !== 'code') {
        return { valid: false, error: 'Unsupported response_type. Only "code" is supported.' }
      }

      // Validate requested scopes
      const requestedScopes = request.scope.split(' ').filter(s => s.length > 0)
      const invalidScopes = requestedScopes.filter(s => !app.scopes.includes(s))
      if (invalidScopes.length > 0) {
        return { valid: false, error: `Invalid scopes: ${invalidScopes.join(', ')}` }
      }

      return { valid: true, application: app as OAuthApplication }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Generate an authorization code (called after user approves)
  async generateAuthorizationCode(
    applicationId: string,
    userId: string,
    redirectUri: string,
    scopes: string[]
  ): Promise<{ data: { code: string } | null; error: string | null }> {
    try {
      const code = generateSecureString(32)
      const expiresAt = new Date(Date.now() + AUTH_CODE_EXPIRY * 1000).toISOString()

      const { error } = await supabase.from('oauth_codes').insert({
        application_id: applicationId,
        user_id: userId,
        code: code,
        redirect_uri: redirectUri,
        scopes: scopes,
        expires_at: expiresAt,
      })

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: { code }, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(
    request: TokenRequest
  ): Promise<{ data: TokenResponse | null; error: string | null }> {
    try {
      if (request.grant_type !== 'authorization_code') {
        return { data: null, error: 'Invalid grant_type for code exchange' }
      }

      if (!request.code || !request.redirect_uri) {
        return { data: null, error: 'Missing code or redirect_uri' }
      }

      // Verify client credentials
      const { data: app, error: appError } = await supabase
        .from('oauth_applications')
        .select('id, client_secret_hash, is_active')
        .eq('client_id', request.client_id)
        .single()

      if (appError || !app) {
        return { data: null, error: 'Invalid client_id' }
      }

      if (!app.is_active) {
        return { data: null, error: 'Application is not active' }
      }

      // Verify client secret
      const secretHash = await hashString(request.client_secret)
      if (secretHash !== app.client_secret_hash) {
        return { data: null, error: 'Invalid client_secret' }
      }

      // Find and validate the authorization code
      const { data: codeData, error: codeError } = await supabase
        .from('oauth_codes')
        .select('*')
        .eq('code', request.code)
        .eq('application_id', app.id)
        .single()

      if (codeError || !codeData) {
        return { data: null, error: 'Invalid authorization code' }
      }

      // Check if code is expired
      if (new Date(codeData.expires_at) < new Date()) {
        return { data: null, error: 'Authorization code has expired' }
      }

      // Check if code was already used
      if (codeData.used_at) {
        return { data: null, error: 'Authorization code has already been used' }
      }

      // Verify redirect_uri matches
      if (codeData.redirect_uri !== request.redirect_uri) {
        return { data: null, error: 'redirect_uri mismatch' }
      }

      // Mark code as used
      await supabase
        .from('oauth_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', codeData.id)

      // Get user's tenant_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', codeData.user_id)
        .single()

      if (userError || !userData) {
        return { data: null, error: 'User not found' }
      }

      // Generate tokens
      const accessToken = generateSecureString(48, 'oblat_')
      const refreshToken = generateSecureString(48, 'oblrt_')
      const accessTokenHash = await hashString(accessToken)
      const refreshTokenHash = await hashString(refreshToken)

      const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000).toISOString()
      const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString()

      // Store tokens
      const { error: tokenError } = await supabase.from('oauth_tokens').insert({
        application_id: app.id,
        user_id: codeData.user_id,
        tenant_id: userData.tenant_id,
        access_token_hash: accessTokenHash,
        refresh_token_hash: refreshTokenHash,
        scopes: codeData.scopes,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
      })

      if (tokenError) {
        return { data: null, error: tokenError.message }
      }

      return {
        data: {
          access_token: accessToken,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_EXPIRY,
          refresh_token: refreshToken,
          scope: codeData.scopes.join(' '),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Refresh access token
  async refreshAccessToken(
    request: TokenRequest
  ): Promise<{ data: TokenResponse | null; error: string | null }> {
    try {
      if (request.grant_type !== 'refresh_token') {
        return { data: null, error: 'Invalid grant_type for refresh' }
      }

      if (!request.refresh_token) {
        return { data: null, error: 'Missing refresh_token' }
      }

      // Verify client credentials
      const { data: app, error: appError } = await supabase
        .from('oauth_applications')
        .select('id, client_secret_hash, is_active')
        .eq('client_id', request.client_id)
        .single()

      if (appError || !app) {
        return { data: null, error: 'Invalid client_id' }
      }

      if (!app.is_active) {
        return { data: null, error: 'Application is not active' }
      }

      // Verify client secret
      const secretHash = await hashString(request.client_secret)
      if (secretHash !== app.client_secret_hash) {
        return { data: null, error: 'Invalid client_secret' }
      }

      // Find the token by refresh_token_hash
      const refreshTokenHash = await hashString(request.refresh_token)
      const { data: tokenData, error: tokenError } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('refresh_token_hash', refreshTokenHash)
        .eq('application_id', app.id)
        .single()

      if (tokenError || !tokenData) {
        return { data: null, error: 'Invalid refresh_token' }
      }

      // Check if token is revoked
      if (tokenData.revoked_at) {
        return { data: null, error: 'Token has been revoked' }
      }

      // Check if refresh token is expired
      if (new Date(tokenData.refresh_expires_at) < new Date()) {
        return { data: null, error: 'Refresh token has expired' }
      }

      // Generate new access token (keep same refresh token)
      const newAccessToken = generateSecureString(48, 'oblat_')
      const newAccessTokenHash = await hashString(newAccessToken)
      const newExpiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRY * 1000).toISOString()

      // Update the token record
      const { error: updateError } = await supabase
        .from('oauth_tokens')
        .update({
          access_token_hash: newAccessTokenHash,
          expires_at: newExpiresAt,
        })
        .eq('id', tokenData.id)

      if (updateError) {
        return { data: null, error: updateError.message }
      }

      return {
        data: {
          access_token: newAccessToken,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_EXPIRY,
          refresh_token: request.refresh_token, // Return same refresh token
          scope: tokenData.scopes.join(' '),
        },
        error: null,
      }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Validate an access token
  async validateAccessToken(accessToken: string): Promise<{
    valid: boolean
    tokenData?: {
      userId: string
      tenantId: string
      scopes: string[]
      applicationId: string
    }
    error?: string
  }> {
    try {
      const accessTokenHash = await hashString(accessToken)

      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('user_id, tenant_id, scopes, application_id, expires_at, revoked_at')
        .eq('access_token_hash', accessTokenHash)
        .single()

      if (error || !data) {
        return { valid: false, error: 'Invalid access token' }
      }

      // Check if revoked
      if (data.revoked_at) {
        return { valid: false, error: 'Token has been revoked' }
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        return { valid: false, error: 'Token has expired' }
      }

      return {
        valid: true,
        tokenData: {
          userId: data.user_id,
          tenantId: data.tenant_id,
          scopes: data.scopes,
          applicationId: data.application_id,
        },
      }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Revoke a token
  async revokeToken(accessToken: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const accessTokenHash = await hashString(accessToken)

      const { error } = await supabase
        .from('oauth_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('access_token_hash', accessTokenHash)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // List all active tokens for a user (for user to manage their authorized apps)
  async listUserAuthorizedApps(userId: string): Promise<{
    data: { application: OAuthApplication; scopes: string[]; created_at: string }[] | null
    error: string | null
  }> {
    try {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select(`
          scopes,
          created_at,
          oauth_applications (
            id,
            name,
            description,
            client_id,
            redirect_uris,
            scopes,
            is_active,
            created_at
          )
        `)
        .eq('user_id', userId)
        .is('revoked_at', null)
        .gt('refresh_expires_at', new Date().toISOString())

      if (error) {
        return { data: null, error: error.message }
      }

      const apps = data
        .filter(t => t.oauth_applications)
        .map(t => ({
          application: t.oauth_applications as unknown as OAuthApplication,
          scopes: t.scopes as string[],
          created_at: t.created_at,
        }))

      return { data: apps, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  // Revoke all tokens for a specific application (user revoking access)
  async revokeApplicationAccess(
    userId: string,
    applicationId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('application_id', applicationId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService()
