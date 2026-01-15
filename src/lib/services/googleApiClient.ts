import { GoogleTokenService } from './googleTokenService'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export type GoogleApiErrorType =
  | 'auth_error'
  | 'rate_limit'
  | 'not_found'
  | 'permission_denied'
  | 'bad_request'
  | 'server_error'
  | 'network_error'
  | 'unknown'

export interface GoogleApiError {
  type: GoogleApiErrorType
  status: number
  message: string
  retryable: boolean
}

function parseGoogleApiError(status: number, errorBody: string): GoogleApiError {
  let message = `Google API Error: ${status}`
  let type: GoogleApiErrorType = 'unknown'
  let retryable = false

  try {
    const parsed = JSON.parse(errorBody)
    message = parsed?.error?.message || message
  } catch {
    // Use raw error body if not JSON
    if (errorBody) {
      message = errorBody.slice(0, 200)
    }
  }

  switch (status) {
    case 401:
      type = 'auth_error'
      message = 'Authentication failed. Please sign in again.'
      retryable = true // Retryable after re-auth
      break
    case 403:
      type = 'permission_denied'
      message = 'Access denied. You may need additional permissions.'
      break
    case 404:
      type = 'not_found'
      message = 'The requested resource was not found.'
      break
    case 429:
      type = 'rate_limit'
      message = 'Too many requests. Please wait a moment and try again.'
      retryable = true
      break
    case 400:
      type = 'bad_request'
      break
    default:
      if (status >= 500) {
        type = 'server_error'
        message = 'Google servers are temporarily unavailable. Please try again.'
        retryable = true
      }
  }

  return { type, status, message, retryable }
}

export class GoogleApiClient {
  private static baseUrl = 'https://www.googleapis.com'
  private static readonly MAX_RETRIES = 2
  private static readonly RETRY_DELAY = 1000

  private static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    let lastError: GoogleApiError | null = null
    let retryCount = 0

    while (retryCount <= this.MAX_RETRIES) {
      try {
        const accessToken = await GoogleTokenService.getAccessToken()

        const { params, headers: customHeaders, ...fetchOptions } = options

        // Build URL with query params
        let url = `${this.baseUrl}${endpoint}`
        if (params) {
          const searchParams = new URLSearchParams()
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined) {
              searchParams.append(key, String(value))
            }
          })
          const queryString = searchParams.toString()
          if (queryString) {
            url += `?${queryString}`
          }
        }

        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...customHeaders,
          },
        })

        if (!response.ok) {
          const errorBody = await response.text()
          const apiError = parseGoogleApiError(response.status, errorBody)

          console.error('Google API Error:', apiError)

          if (apiError.type === 'auth_error') {
            // Clear tokens and let the token service handle re-auth
            GoogleTokenService.clearTokens()
            throw new Error(apiError.message)
          }

          // Retry for retryable errors (rate limits, server errors)
          if (apiError.retryable && retryCount < this.MAX_RETRIES) {
            lastError = apiError
            retryCount++
            // Exponential backoff for rate limits
            const backoff = apiError.type === 'rate_limit'
              ? this.RETRY_DELAY * Math.pow(2, retryCount)
              : this.RETRY_DELAY
            await this.delay(backoff)
            continue
          }

          throw new Error(apiError.message)
        }

        // Handle empty responses
        const text = await response.text()
        if (!text) {
          return {} as T
        }

        return JSON.parse(text)
      } catch (err) {
        // Network errors
        if (err instanceof TypeError && err.message.includes('fetch')) {
          const networkError: GoogleApiError = {
            type: 'network_error',
            status: 0,
            message: 'Network error. Please check your connection.',
            retryable: true,
          }

          if (retryCount < this.MAX_RETRIES) {
            lastError = networkError
            retryCount++
            await this.delay(this.RETRY_DELAY * retryCount)
            continue
          }

          throw new Error(networkError.message)
        }

        // Re-throw other errors (including auth errors from token service)
        throw err
      }
    }

    // If we've exhausted retries, throw the last error
    throw new Error(lastError?.message || 'Request failed after multiple retries')
  }

  static async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  static async post<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      params,
    })
  }

  static async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Special method for multipart uploads (Drive)
  static async uploadMultipart<T>(
    endpoint: string,
    metadata: Record<string, unknown>,
    file: File | Blob
  ): Promise<T> {
    const accessToken = await GoogleTokenService.getAccessToken()

    const boundary = '-------' + Date.now().toString(16)

    const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' })

    const body = new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ])

    const response = await fetch(`${this.baseUrl}${endpoint}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      const apiError = parseGoogleApiError(response.status, errorBody)

      if (apiError.type === 'auth_error') {
        GoogleTokenService.clearTokens()
      }

      throw new Error(apiError.message)
    }

    return response.json()
  }
}
