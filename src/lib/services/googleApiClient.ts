import { GoogleTokenService } from './googleTokenService'

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

export class GoogleApiClient {
  private static baseUrl = 'https://www.googleapis.com'

  static async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
      console.error('Google API Error:', response.status, errorBody)

      if (response.status === 401) {
        // Token might be expired, clear and retry once
        GoogleTokenService.clearTokens()
        throw new Error('Authentication failed. Please sign in again.')
      }

      throw new Error(`Google API Error: ${response.status} - ${errorBody}`)
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) {
      return {} as T
    }

    return JSON.parse(text)
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
      throw new Error(`Upload failed: ${response.status} - ${errorBody}`)
    }

    return response.json()
  }
}
