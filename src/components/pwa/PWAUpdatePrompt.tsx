import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePWA } from '@/lib/hooks/usePWA'

export function PWAUpdatePrompt() {
  const { isUpdateAvailable, applyUpdate } = usePWA()

  if (!isUpdateAvailable) {
    return null
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary-foreground/10 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm">Update Available</h3>
          <p className="text-xs opacity-90 mt-1">A new version of Oblique CRM is ready</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
          onClick={applyUpdate}
        >
          Update now
        </Button>
      </div>
    </div>
  )
}
