import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import { GoogleTokenService, type TokenError } from '@/lib/services/googleTokenService'
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
import { AlertCircle, RefreshCw } from 'lucide-react'

type PendingRequest = {
  execute: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

interface GoogleApiContextType {
  showReauthPrompt: boolean
  isReauthenticating: boolean
  triggerReauth: () => void
  dismissReauth: () => void
  executeWithRetry: <T>(fn: () => Promise<T>) => Promise<T>
}

const GoogleApiContext = createContext<GoogleApiContextType | undefined>(undefined)

export function GoogleApiProvider({ children }: { children: ReactNode }) {
  const { signInWithGoogle, session } = useAuth()
  const [showReauthPrompt, setShowReauthPrompt] = useState(false)
  const [isReauthenticating, setIsReauthenticating] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])

  // Track if we've shown a recent refresh notification to avoid spamming
  const [lastRefreshNotification, setLastRefreshNotification] = useState<number>(0)
  const REFRESH_NOTIFICATION_COOLDOWN = 30000 // 30 seconds between notifications

  // Set up token error callback
  useEffect(() => {
    const handleTokenError = (error: TokenError) => {
      if (error.requiresReauth) {
        setShowReauthPrompt(true)
        toast.error(error.message, {
          description: 'Please re-authenticate to continue.',
          duration: 5000,
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

    GoogleTokenService.setTokenErrorCallback(handleTokenError)
    GoogleTokenService.setTokenRefreshCallback(handleTokenRefresh)

    return () => {
      GoogleTokenService.setTokenErrorCallback(null)
      GoogleTokenService.setTokenRefreshCallback(null)
    }
  }, [lastRefreshNotification])

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
    // Reject all pending requests
    pendingRequests.forEach(req => {
      req.reject(new Error('Re-authentication cancelled by user'))
    })
    setPendingRequests([])
  }, [pendingRequests])

  const handleReauthenticate = useCallback(async () => {
    setIsReauthenticating(true)
    try {
      await signInWithGoogle()
      // Note: The page will redirect, so the code below may not execute
      setShowReauthPrompt(false)

      // Retry all pending requests after a short delay to allow token initialization
      setTimeout(async () => {
        const requests = [...pendingRequests]
        setPendingRequests([])

        for (const req of requests) {
          try {
            const result = await req.execute()
            req.resolve(result)
          } catch (err) {
            req.reject(err instanceof Error ? err : new Error('Request failed after re-auth'))
          }
        }
      }, 1000)
    } catch (err) {
      toast.error('Re-authentication failed', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setIsReauthenticating(false)
    }
  }, [signInWithGoogle, pendingRequests])

  const executeWithRetry = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
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
          setPendingRequests(prev => [...prev, {
            execute: fn as () => Promise<unknown>,
            resolve: resolve as (value: unknown) => void,
            reject,
          }])
          setShowReauthPrompt(true)
        })
      }

      // For other errors, show toast and rethrow
      toast.error('API Error', {
        description: errorMessage,
      })
      throw err
    }
  }, [])

  return (
    <GoogleApiContext.Provider
      value={{
        showReauthPrompt,
        isReauthenticating,
        triggerReauth,
        dismissReauth,
        executeWithRetry,
      }}
    >
      {children}

      <Dialog open={showReauthPrompt} onOpenChange={(open) => !open && dismissReauth()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Session Expired
            </DialogTitle>
            <DialogDescription>
              Your Google authentication has expired or is invalid. Please sign in again to continue using Google services like Calendar, Gmail, and Drive.
            </DialogDescription>
          </DialogHeader>
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
                'Sign in with Google'
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
