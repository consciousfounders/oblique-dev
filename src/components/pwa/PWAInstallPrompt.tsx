import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/lib/hooks/usePWA'
import { useMobileDetect } from '@/lib/hooks/useMobileDetect'
import { useState, useEffect } from 'react'

export function PWAInstallPrompt() {
  const { isInstallable, installApp, isOnline } = usePWA()
  const { isMobile, isIOS, isStandalone } = useMobileDetect()
  const [dismissed, setDismissed] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10)
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true)
      }
    }
  }, [])

  if (dismissed || isStandalone || !isOnline) {
    return null
  }

  // On iOS, show manual installation instructions
  if (isIOS && !isInstallable && isMobile) {
    if (!showIOSInstructions) {
      return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm">Install Oblique CRM</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Add to home screen for the best experience
              </p>
            </div>
            <button
              onClick={() => {
                setDismissed(true)
                localStorage.setItem('pwa-install-dismissed', Date.now().toString())
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setDismissed(true)
                localStorage.setItem('pwa-install-dismissed', Date.now().toString())
              }}
            >
              Not now
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setShowIOSInstructions(true)}>
              Show me how
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
        <div className="bg-background border rounded-lg shadow-lg p-4 w-full max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Install Oblique CRM</h3>
            <button
              onClick={() => {
                setShowIOSInstructions(false)
                setDismissed(true)
                localStorage.setItem('pwa-install-dismissed', Date.now().toString())
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                1
              </span>
              <span>
                Tap the <strong>Share</strong> button in Safari's toolbar
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                2
              </span>
              <span>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium">
                3
              </span>
              <span>
                Tap <strong>"Add"</strong> in the top right corner
              </span>
            </li>
          </ol>
          <Button
            className="w-full mt-4"
            onClick={() => {
              setShowIOSInstructions(false)
              setDismissed(true)
              localStorage.setItem('pwa-install-dismissed', Date.now().toString())
            }}
          >
            Got it
          </Button>
        </div>
      </div>
    )
  }

  // Standard install prompt for Android/Chrome
  if (!isInstallable) {
    return null
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background border rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">Install Oblique CRM</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Install for faster access and offline support
          </p>
        </div>
        <button
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('pwa-install-dismissed', Date.now().toString())
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('pwa-install-dismissed', Date.now().toString())
          }}
        >
          Not now
        </Button>
        <Button size="sm" className="flex-1" onClick={installApp}>
          Install
        </Button>
      </div>
    </div>
  )
}
