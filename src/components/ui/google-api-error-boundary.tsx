import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onRetry?: () => void
  onReauth?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorType: 'auth' | 'network' | 'api' | 'unknown'
}

function classifyError(error: Error): State['errorType'] {
  const message = error.message.toLowerCase()
  if (
    message.includes('authentication') ||
    message.includes('sign in') ||
    message.includes('session') ||
    message.includes('token') ||
    message.includes('unauthorized')
  ) {
    return 'auth'
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }
  if (message.includes('api') || message.includes('google')) {
    return 'api'
  }
  return 'unknown'
}

export class GoogleApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorType: 'unknown' }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorType: classifyError(error),
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GoogleApiErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' })
    this.props.onRetry?.()
  }

  handleReauth = () => {
    this.setState({ hasError: false, error: null, errorType: 'unknown' })
    this.props.onReauth?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const { error, errorType } = this.state

      return (
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {errorType === 'auth' && 'Authentication Error'}
              {errorType === 'network' && 'Connection Error'}
              {errorType === 'api' && 'Google API Error'}
              {errorType === 'unknown' && 'Something went wrong'}
            </CardTitle>
            <CardDescription>
              {errorType === 'auth' &&
                'Your session has expired or is invalid. Please sign in again to continue.'}
              {errorType === 'network' &&
                'Unable to connect to Google services. Please check your internet connection.'}
              {errorType === 'api' &&
                'There was a problem communicating with Google services. Please try again.'}
              {errorType === 'unknown' &&
                'An unexpected error occurred. Please try again or contact support.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-muted-foreground">Error details:</p>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {error?.message || 'Unknown error'}
              </p>
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            {errorType === 'auth' ? (
              <Button onClick={this.handleReauth} className="w-full">
                <LogIn className="h-4 w-4" />
                Sign in again
              </Button>
            ) : (
              <Button onClick={this.handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            )}
          </CardFooter>
        </Card>
      )
    }

    return this.props.children
  }
}
