import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import { GoogleTokenService, type TokenError, type TokenStatus } from '@/lib/services/googleTokenService'
import { useAuth } from './useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type PendingRequest = {
  id: string
  name: string
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  status: 'pending' | 'retrying' | 'completed' | 'failed'
}

interface GoogleApiContextType {
  showReauthPrompt: boolean
  isReauthenticating: boolean
  tokenStatus: TokenStatus | null
  pendingRequestsCount: number
  triggerReauth: () => void
  dismissReauth: () => void
  executeWithRetry: <T>(fn: () => Promise<T>, requestName?: string) => Promise<T>
  retryFailedRequest: (requestId: string) => void
}

const GoogleApiContext = createContext<GoogleApiContextType | undefined>(undefined)

// Generate unique request IDs
let requestIdCounter = 0
const generateRequestId = () => `req_${++requestIdCounter}_${Date.now()}`

// Format time remaining for display
function formatTimeRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return 'expired'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export function GoogleApiProvider({ children }: { children: ReactNode }) {
  const { signInWithGoogle, session } = useAuth()
  const [showReauthPrompt, setShowReauthPrompt] = useState(false)
  const [isReauthenticating, setIsReauthenticating] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [retryProgress, setRetryProgress] = useState<{ current: number; total: number } | null>(null)
  const failedRequestsRef = useRef<Map<string, PendingRequest>>(new Map())

  // Track if we've shown a recent refresh notification to avoid spamming
  const [lastRefreshNotification, setLastRefreshNotification] = useState<number>(0)
  const REFRESH_NOTIFICATION_COOLDOWN = 30000 // 30 seconds between notifications

  // Set up token callbacks
  useEffect(() => {
    const handleTokenError = (error: TokenError) => {
      if (error.requiresReauth) {
        setShowReauthPrompt(true)
        toast.error(error.message, {
          description: 'Please re-authenticate to continue.',
          duration: 5000,
          action: {
            label: 'Sign In',
            onClick: () => signInWithGoogle(),
          },
        })
      } else {
        toast.error(error.message)
      }
    }

    const handleTokenRefresh = () => {
      const now = Date.now()
      // Only show notification if enough time has passed since last one
      // This prevents spam during proactive background refreshes
      if (now - lastRefreshNotification > REFRESH_NOTIFICATION_COOLDOWN) {
        setLastRefreshNotification(now)
        toast.success('Session refreshed', {
          description: 'Your authentication has been automatically refreshed.',
          duration: 3000,
        })
      }
    }

    const handleTokenStatus = (status: TokenStatus) => {
      setTokenStatus(status)
    }

    GoogleTokenService.setTokenErrorCallback(handleTokenError)
    GoogleTokenService.setTokenRefreshCallback(handleTokenRefresh)
    GoogleTokenService.setTokenStatusCallback(handleTokenStatus)

    // Initialize token status
    setTokenStatus(GoogleTokenService.getTokenStatus())

    return () => {
      GoogleTokenService.setTokenErrorCallback(null)
      GoogleTokenService.setTokenRefreshCallback(null)
      GoogleTokenService.setTokenStatusCallback(null)
    }
  }, [lastRefreshNotification, signInWithGoogle])

  // Initialize token service when session changes
  useEffect(() => {
    if (session?.provider_token) {
      GoogleTokenService.initialize(session)
    }
  }, [session])

  // Proactively refresh tokens before they expire
  useEffect(() => {
    if (!session?.provider_token) return

    // Check every minute if token needs refresh
    const interval = setInterval(() => {
      if (GoogleTokenService.isTokenExpiringSoon()) {
        GoogleTokenService.proactiveRefresh().catch(() => {
          // Error will be handled by the callback
        })
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [session?.provider_token])

  const triggerReauth = useCallback(() => {
    setShowReauthPrompt(true)
  }, [])

  const dismissReauth = useCallback(() => {
    setShowReauthPrompt(false)
    // Store failed requests for potential retry later
    pendingRequests.forEach(req => {
      req.status = 'failed'
      failedRequestsRef.current.set(req.id, req)
    })
    // Reject all pending requests
    pendingRequests.forEach(req => {
      req.reject(new Error('Re-authentication cancelled by user'))
    })
    setPendingRequests([])

    if (pendingRequests.length > 0) {
      toast.info(`${pendingRequests.length} request(s) cancelled`, {
        description: 'You can retry these operations manually.',
        duration: 4000,
      })
    }
  }, [pendingRequests])

  const retryPendingRequests = useCallback(async (requests: PendingRequest[]) => {
    if (requests.length === 0) return

    setRetryProgress({ current: 0, total: requests.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]
      setRetryProgress({ current: i + 1, total: requests.length })

      try {
        req.status = 'retrying'
        setPendingRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'retrying' } : r))

        const result = await req.execute()
        req.status = 'completed'
        req.resolve(result)
        successCount++
        failedRequestsRef.current.delete(req.id)
      } catch (err) {
        req.status = 'failed'
        failedRequestsRef.current.set(req.id, req)
        req.reject(err instanceof Error ? err : new Error('Request failed after re-auth'))
        failCount++
      }
    }

    setRetryProgress(null)
    setPendingRequests([])

    if (successCount > 0 && failCount === 0) {
      toast.success(`${successCount} request(s) completed`, {
        description: 'All pending operations were successful.',
        duration: 3000,
      })
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(`${successCount} succeeded, ${failCount} failed`, {
        description: 'Some operations could not be completed.',
        duration: 4000,
      })
    } else if (failCount > 0) {
      toast.error(`${failCount} request(s) failed`, {
        description: 'Please try again later.',
        duration: 4000,
      })
    }
  }, [])

  const handleReauthenticate = useCallback(async () => {
    setIsReauthenticating(true)
    const requestsToRetry = [...pendingRequests]

    try {
      await signInWithGoogle()
      // Note: The page will redirect, so the code below may not execute
      setShowReauthPrompt(false)

      // Retry all pending requests after a short delay to allow token initialization
      setTimeout(() => {
        retryPendingRequests(requestsToRetry)
      }, 1000)
    } catch (err) {
      toast.error('Re-authentication failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
        action: {
          label: 'Retry',
          onClick: handleReauthenticate,
        },
      })
    } finally {
      setIsReauthenticating(false)
    }
  }, [signInWithGoogle, pendingRequests, retryPendingRequests])

  const retryFailedRequest = useCallback((requestId: string) => {
    const request = failedRequestsRef.current.get(requestId)
    if (!request) {
      toast.error('Request not found', {
        description: 'The request may have already been retried.',
      })
      return
    }

    // Re-queue the request for retry
    setPendingRequests(prev => [...prev, { ...request, status: 'pending' }])
    failedRequestsRef.current.delete(requestId)

    // If we have valid tokens, retry immediately
    const status = GoogleTokenService.getTokenStatus()
    if (status.isValid && !status.isExpiringSoon) {
      retryPendingRequests([request])
    } else {
      setShowReauthPrompt(true)
    }
  }, [retryPendingRequests])

  const executeWithRetry = useCallback(async <T,>(fn: () => Promise<T>, requestName = 'API request'): Promise<T> => {
    try {
      return await fn()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Check if this is an auth error that might be recoverable
      if (
        errorMessage.includes('Authentication failed') ||
        errorMessage.includes('sign in again') ||
        errorMessage.includes('No active session') ||
        errorMessage.includes('refresh token')
      ) {
        // Store the request for retry after re-auth
        return new Promise<T>((resolve, reject) => {
          const requestId = generateRequestId()
          setPendingRequests(prev => [...prev, {
            id: requestId,
            name: requestName,
            execute: fn as () => Promise<unknown>,
            resolve: resolve as (value: unknown) => void,
            reject,
            status: 'pending',
          }])
          setShowReauthPrompt(true)
        })
      }

      // For other errors, show toast with retry option
      const requestId = generateRequestId()
      const request: PendingRequest = {
        id: requestId,
        name: requestName,
        execute: fn as () => Promise<unknown>,
        resolve: () => {},
        reject: () => {},
        status: 'failed',
      }
      failedRequestsRef.current.set(requestId, request)

      toast.error('API Error', {
        description: errorMessage,
        action: {
          label: 'Retry',
          onClick: () => retryFailedRequest(requestId),
        },
        duration: 6000,
      })
      throw err
    }
  }, [retryFailedRequest])

  return (
    <GoogleApiContext.Provider
      value={{
        showReauthPrompt,
        isReauthenticating,
        tokenStatus,
        pendingRequestsCount: pendingRequests.length,
        triggerReauth,
        dismissReauth,
        executeWithRetry,
        retryFailedRequest,
      }}
    >
      {children}

      <Dialog open={showReauthPrompt} onOpenChange={(open) => !open && dismissReauth()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Session Expired
            </DialogTitle>
            <DialogDescription>
              Your Google authentication has expired or is invalid. Please sign in again to continue using Google services.
            </DialogDescription>
          </DialogHeader>

          {/* Token Status Info */}
          {tokenStatus && (
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Token status:{' '}
                  {tokenStatus.isValid
                    ? `Valid (expires in ${formatTimeRemaining(tokenStatus.expiresIn)})`
                    : 'Expired'}
                </span>
              </div>
            </div>
          )}

          {/* Pending Requests List */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''} will retry after sign-in:
              </p>
              <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 py-1 text-sm"
                  >
                    {req.status === 'retrying' ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : req.status === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : req.status === 'failed' ? (
                      <XCircle className="h-3 w-3 text-destructive" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span className="truncate">{req.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retry Progress */}
          {retryProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Retrying requests...</span>
                <span className="font-medium">
                  {retryProgress.current}/{retryProgress.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${(retryProgress.current / retryProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={dismissReauth} disabled={isReauthenticating}>
              Cancel
            </Button>
            <Button onClick={handleReauthenticate} disabled={isReauthenticating}>
              {isReauthenticating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GoogleApiContext.Provider>
  )
}

export function useGoogleApi() {
  const context = useContext(GoogleApiContext)
  if (context === undefined) {
    throw new Error('useGoogleApi must be used within a GoogleApiProvider')
  }
  return context
}

// Helper hook to get token status for display in UI
export function useTokenStatus() {
  const { tokenStatus } = useGoogleApi()
  return {
    tokenStatus,
    formatTimeRemaining,
    isExpiringSoon: tokenStatus?.isExpiringSoon ?? false,
    isValid: tokenStatus?.isValid ?? false,
    isRefreshing: tokenStatus?.isRefreshing ?? false,
  }
}
