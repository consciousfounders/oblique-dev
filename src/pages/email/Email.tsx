import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useGmailThreads, useGmailThread, useSendEmail, usePrefetchThread } from '@/lib/hooks/useGmail'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VirtualList } from '@/components/ui/virtual-list'
import { Mail, Search, RefreshCw, Send, ArrowLeft, Paperclip, RotateCcw } from 'lucide-react'
import type { EmailThread } from '@/lib/services/gmailService'

export function EmailPage() {
  const { session, signInWithGoogle } = useAuth()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showCompose, setShowCompose] = useState(false)

  // Initialize Google Token Service
  const hasGoogleAuth = !!session?.provider_token
  if (hasGoogleAuth && session) {
    GoogleTokenService.initialize(session)
  }

  // Use React Query hooks for data fetching with pagination
  const {
    threads,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    error: threadsError,
  } = useGmailThreads({
    search: search || undefined,
    pageSize: 20,
    enabled: hasGoogleAuth,
  })

  // Fetch selected thread details
  const {
    data: selectedThread,
    isLoading: loadingThread,
    error: threadError,
  } = useGmailThread(selectedThreadId)

  // Prefetch thread on hover for faster UX
  const prefetchThread = usePrefetchThread()

  const error = threadsError?.message || threadError?.message || null

  // Compose state
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')

  // Send email mutation
  const sendEmail = useSendEmail()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!composeTo || !composeSubject) return

    try {
      await sendEmail.mutateAsync({
        to: composeTo.split(',').map((s) => s.trim()),
        subject: composeSubject,
        body: composeBody,
      })
      setShowCompose(false)
      setComposeTo('')
      setComposeSubject('')
      setComposeBody('')
    } catch (err) {
      console.error('Failed to send email:', err)
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!composeBody || !selectedThread) return

    try {
      const lastMessage = selectedThread.messages[selectedThread.messages.length - 1]
      await sendEmail.mutateAsync({
        to: [lastMessage.fromEmail],
        subject: `Re: ${selectedThread.subject}`,
        body: composeBody,
        threadId: selectedThread.id,
      })
      setComposeBody('')
    } catch (err) {
      console.error('Failed to reply:', err)
    }
  }

  const formatDate = useCallback((date: Date): string => {
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
  }, [])

  // Render thread item for virtual list
  const renderThreadItem = useCallback(
    (thread: EmailThread) => (
      <button
        onMouseEnter={() => prefetchThread(thread.id)}
        onClick={() => setSelectedThreadId(thread.id)}
        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 mb-1 ${
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
    ),
    [formatDate, prefetchThread]
  )

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
              {sendEmail.error && (
                <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                  {sendEmail.error.message}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={sendEmail.isPending}>
                  {sendEmail.isPending ? 'Sending...' : 'Send'}
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
  if (selectedThreadId) {
    if (loadingThread) {
      return (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (!selectedThread) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedThreadId(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold">Thread not found</h1>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedThreadId(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-xl font-semibold truncate">{selectedThread.subject}</h1>
        </div>

        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
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
            <form onSubmit={handleReply} className="space-y-3">
              <textarea
                className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Write a reply..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
              {sendEmail.error && (
                <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                  {sendEmail.error.message}
                </div>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={sendEmail.isPending || !composeBody}>
                  {sendEmail.isPending ? 'Sending...' : 'Reply'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Inbox list with virtual scrolling
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Email</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error && (
        <div className="p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-2 text-destructive hover:text-destructive">
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      )}

      <VirtualList
        items={threads}
        estimatedItemHeight={88}
        getItemKey={(thread) => thread.id}
        renderItem={renderThreadItem}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
        maxHeight="calc(100vh - 280px)"
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No emails found</p>
          </div>
        }
      />
    </div>
  )
}
