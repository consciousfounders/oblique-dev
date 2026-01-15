import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { GmailService, type EmailThread } from '@/lib/services/gmailService'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Search, RefreshCw, Send, ArrowLeft, Paperclip } from 'lucide-react'

export function EmailPage() {
  const { session, signInWithGoogle } = useAuth()
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [selectedThread, setSelectedThread] = useState<EmailThread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false)

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Check immediately - don't wait
    if (session === undefined) return // Still loading auth state

    if (session?.provider_token) {
      GoogleTokenService.initialize(session)
      setHasGoogleAuth(true)
      fetchEmails()
    } else {
      setHasGoogleAuth(false)
      setLoading(false)
    }
  }, [session])

  async function fetchEmails() {
    setLoading(true)
    setError(null)
    try {
      const { threads: fetchedThreads } = await GmailService.listThreads({
        maxResults: 30,
        q: search || undefined,
      })
      setThreads(fetchedThreads)
    } catch (err) {
      console.error('Failed to fetch emails:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    fetchEmails()
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!composeTo || !composeSubject) return

    setSending(true)
    try {
      await GmailService.sendEmail({
        to: composeTo.split(',').map((s) => s.trim()),
        subject: composeSubject,
        body: composeBody,
      })
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
      fetchEmails()
    } catch (err) {
      console.error('Failed to send email:', err)
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  function formatDate(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  // Not connected to Google
  if (!hasGoogleAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Connect Your Gmail</h2>
            <p className="text-muted-foreground">
              Sign in with Google to access your Gmail inbox and send emails directly from Oblique.
            </p>
            <Button onClick={signInWithGoogle} className="w-full">
              Connect with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Compose modal
  if (showCompose) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold">New Message</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <Input
                  placeholder="To (comma-separated for multiple)"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                />
              </div>
              <div>
                <textarea
                  className="w-full min-h-[300px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Write your message..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? 'Sending...' : 'Send'}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Thread view
  if (selectedThread) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedThread(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold truncate">{selectedThread.subject}</h1>
        </div>

        <div className="space-y-4">
          {selectedThread.messages.map((message) => (
            <Card key={message.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{message.from}</p>
                    <p className="text-sm text-muted-foreground">
                      To: {message.to.join(', ')}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {message.date.toLocaleString()}
                  </p>
                </div>
                <div className="mt-4 prose prose-sm max-w-none dark:prose-invert">
                  {message.bodyHtml ? (
                    <div dangerouslySetInnerHTML={{ __html: message.bodyHtml }} />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans">{message.body}</pre>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="pt-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!composeBody) return
                setSending(true)
                try {
                  const lastMessage = selectedThread.messages[selectedThread.messages.length - 1]
                  await GmailService.sendEmail({
                    to: [lastMessage.fromEmail],
                    subject: `Re: ${selectedThread.subject}`,
                    body: composeBody,
                    threadId: selectedThread.id,
                  })
                  setComposeBody('')
                  // Refresh thread
                  const updated = await GmailService.getThread(selectedThread.id)
                  setSelectedThread(updated)
                } catch (err) {
                  console.error('Failed to reply:', err)
                } finally {
                  setSending(false)
                }
              }}
              className="space-y-3"
            >
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Write a reply..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={sending || !composeBody}>
                  {sending ? 'Sending...' : 'Reply'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Inbox list
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchEmails} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCompose(true)}>
            <Send className="w-4 h-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : threads.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No emails found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setSelectedThread(thread)}
              className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                thread.isUnread ? 'bg-primary/5 border-primary/20' : 'bg-card'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`truncate ${thread.isUnread ? 'font-semibold' : ''}`}>
                      {thread.participants[0] || 'Unknown'}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-xs text-muted-foreground">({thread.messageCount})</span>
                    )}
                  </div>
                  <p className={`truncate ${thread.isUnread ? 'font-medium' : ''}`}>
                    {thread.subject}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{thread.snippet}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(thread.lastMessageDate)}
                  </span>
                  {thread.messages.some((m) => m.hasAttachments) && (
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
