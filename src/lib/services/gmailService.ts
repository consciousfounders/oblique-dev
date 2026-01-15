import { GoogleApiClient } from './googleApiClient'

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  historyId: string
  internalDate: string
  payload?: GmailMessagePayload
}

interface GmailMessagePayload {
  partId?: string
  mimeType: string
  filename?: string
  headers: Array<{ name: string; value: string }>
  body: { size: number; data?: string; attachmentId?: string }
  parts?: GmailMessagePayload[]
}

interface GmailThread {
  id: string
  historyId: string
  messages: GmailMessage[]
}

// GmailListResponse - reserved for direct message list API
// interface GmailListResponse {
//   messages: Array<{ id: string; threadId: string }>
//   nextPageToken?: string
//   resultSizeEstimate: number
// }

interface GmailThreadListResponse {
  threads: Array<{ id: string; historyId: string; snippet: string }>
  nextPageToken?: string
  resultSizeEstimate: number
}

export interface ParsedEmail {
  id: string
  threadId: string
  from: string
  fromEmail: string
  to: string[]
  cc: string[]
  subject: string
  snippet: string
  body: string
  bodyHtml: string
  date: Date
  isUnread: boolean
  hasAttachments: boolean
  labels: string[]
}

export interface EmailThread {
  id: string
  messages: ParsedEmail[]
  snippet: string
  subject: string
  participants: string[]
  lastMessageDate: Date
  isUnread: boolean
  messageCount: number
}

export class GmailService {
  private static parseHeaders(headers: Array<{ name: string; value: string }>) {
    const result: Record<string, string> = {}
    headers.forEach(({ name, value }) => {
      result[name.toLowerCase()] = value
    })
    return result
  }

  private static extractEmail(fromString: string): string {
    const match = fromString.match(/<([^>]+)>/)
    return match ? match[1] : fromString
  }

  private static decodeBase64(data: string): string {
    try {
      // Gmail uses URL-safe base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
      return decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    } catch {
      return ''
    }
  }

  private static extractBody(payload: GmailMessagePayload): { text: string; html: string } {
    let text = ''
    let html = ''

    const extractFromParts = (parts: GmailMessagePayload[]) => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          text = this.decodeBase64(part.body.data)
        } else if (part.mimeType === 'text/html' && part.body.data) {
          html = this.decodeBase64(part.body.data)
        } else if (part.parts) {
          extractFromParts(part.parts)
        }
      }
    }

    if (payload.parts) {
      extractFromParts(payload.parts)
    } else if (payload.body.data) {
      if (payload.mimeType === 'text/html') {
        html = this.decodeBase64(payload.body.data)
      } else {
        text = this.decodeBase64(payload.body.data)
      }
    }

    return { text, html }
  }

  private static hasAttachments(payload: GmailMessagePayload): boolean {
    const checkParts = (parts: GmailMessagePayload[]): boolean => {
      for (const part of parts) {
        if (part.filename && part.filename.length > 0) {
          return true
        }
        if (part.parts && checkParts(part.parts)) {
          return true
        }
      }
      return false
    }

    return payload.parts ? checkParts(payload.parts) : false
  }

  private static parseMessage(message: GmailMessage): ParsedEmail {
    const headers = this.parseHeaders(message.payload?.headers || [])
    const body = message.payload ? this.extractBody(message.payload) : { text: '', html: '' }

    return {
      id: message.id,
      threadId: message.threadId,
      from: headers.from || '',
      fromEmail: this.extractEmail(headers.from || ''),
      to: (headers.to || '').split(',').map((s) => s.trim()).filter(Boolean),
      cc: (headers.cc || '').split(',').map((s) => s.trim()).filter(Boolean),
      subject: headers.subject || '(No subject)',
      snippet: message.snippet,
      body: body.text,
      bodyHtml: body.html,
      date: new Date(parseInt(message.internalDate)),
      isUnread: message.labelIds?.includes('UNREAD') || false,
      hasAttachments: message.payload ? this.hasAttachments(message.payload) : false,
      labels: message.labelIds || [],
    }
  }

  // List email threads (conversations)
  static async listThreads(options: {
    maxResults?: number
    pageToken?: string
    q?: string
    labelIds?: string[]
  } = {}): Promise<{ threads: EmailThread[]; nextPageToken?: string }> {
    const { maxResults = 20, pageToken, q, labelIds } = options

    const response = await GoogleApiClient.get<GmailThreadListResponse>(
      '/gmail/v1/users/me/threads',
      {
        maxResults,
        pageToken,
        q,
        labelIds: labelIds?.join(','),
      }
    )

    if (!response.threads) {
      return { threads: [] }
    }

    // Fetch full thread details in parallel (batch of 10 at a time)
    const threads: EmailThread[] = []
    const batchSize = 10

    for (let i = 0; i < response.threads.length; i += batchSize) {
      const batch = response.threads.slice(i, i + batchSize)
      const threadDetails = await Promise.all(
        batch.map((t) => this.getThread(t.id))
      )
      threads.push(...threadDetails)
    }

    return {
      threads,
      nextPageToken: response.nextPageToken,
    }
  }

  // Get a single thread with all messages
  static async getThread(threadId: string): Promise<EmailThread> {
    const response = await GoogleApiClient.get<GmailThread>(
      `/gmail/v1/users/me/threads/${threadId}`,
      { format: 'full' }
    )

    const messages = response.messages.map((m) => this.parseMessage(m))
    const participants = new Set<string>()
    messages.forEach((m) => {
      participants.add(m.fromEmail)
      m.to.forEach((t) => participants.add(this.extractEmail(t)))
    })

    return {
      id: response.id,
      messages,
      snippet: messages[0]?.snippet || '',
      subject: messages[0]?.subject || '(No subject)',
      participants: Array.from(participants),
      lastMessageDate: messages[messages.length - 1]?.date || new Date(),
      isUnread: messages.some((m) => m.isUnread),
      messageCount: messages.length,
    }
  }

  // Get a single message
  static async getMessage(messageId: string): Promise<ParsedEmail> {
    const response = await GoogleApiClient.get<GmailMessage>(
      `/gmail/v1/users/me/messages/${messageId}`,
      { format: 'full' }
    )

    return this.parseMessage(response)
  }

  // Send an email
  static async sendEmail(options: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    bodyHtml?: string
    threadId?: string
    inReplyTo?: string
  }): Promise<{ id: string; threadId: string }> {
    const { to, cc, bcc, subject, body, bodyHtml, threadId, inReplyTo } = options

    // Build RFC 2822 formatted email
    const boundary = '----=_Part_' + Date.now().toString(16)
    const lines: string[] = []

    lines.push(`To: ${to.join(', ')}`)
    if (cc?.length) lines.push(`Cc: ${cc.join(', ')}`)
    if (bcc?.length) lines.push(`Bcc: ${bcc.join(', ')}`)
    lines.push(`Subject: ${subject}`)
    if (inReplyTo) {
      lines.push(`In-Reply-To: ${inReplyTo}`)
      lines.push(`References: ${inReplyTo}`)
    }
    lines.push('MIME-Version: 1.0')

    if (bodyHtml) {
      lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
      lines.push('')
      lines.push(`--${boundary}`)
      lines.push('Content-Type: text/plain; charset=UTF-8')
      lines.push('')
      lines.push(body)
      lines.push(`--${boundary}`)
      lines.push('Content-Type: text/html; charset=UTF-8')
      lines.push('')
      lines.push(bodyHtml)
      lines.push(`--${boundary}--`)
    } else {
      lines.push('Content-Type: text/plain; charset=UTF-8')
      lines.push('')
      lines.push(body)
    }

    const rawMessage = lines.join('\r\n')
    const encodedMessage = btoa(unescape(encodeURIComponent(rawMessage)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await GoogleApiClient.post<{ id: string; threadId: string }>(
      '/gmail/v1/users/me/messages/send',
      {
        raw: encodedMessage,
        threadId,
      }
    )

    return response
  }

  // Mark message as read
  static async markAsRead(messageId: string): Promise<void> {
    await GoogleApiClient.post(`/gmail/v1/users/me/messages/${messageId}/modify`, {
      removeLabelIds: ['UNREAD'],
    })
  }

  // Mark message as unread
  static async markAsUnread(messageId: string): Promise<void> {
    await GoogleApiClient.post(`/gmail/v1/users/me/messages/${messageId}/modify`, {
      addLabelIds: ['UNREAD'],
    })
  }

  // Archive message (remove from inbox)
  static async archive(messageId: string): Promise<void> {
    await GoogleApiClient.post(`/gmail/v1/users/me/messages/${messageId}/modify`, {
      removeLabelIds: ['INBOX'],
    })
  }

  // Search emails
  static async search(query: string, maxResults = 20): Promise<{ threads: EmailThread[]; nextPageToken?: string }> {
    return this.listThreads({ q: query, maxResults })
  }

  // Get emails related to a contact (by email address)
  static async getEmailsForContact(email: string, maxResults = 10): Promise<EmailThread[]> {
    const { threads } = await this.listThreads({
      q: `from:${email} OR to:${email}`,
      maxResults,
    })
    return threads
  }
}
