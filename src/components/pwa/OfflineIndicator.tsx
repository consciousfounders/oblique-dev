import { WifiOff, Cloud } from 'lucide-react'
import { usePWA } from '@/lib/hooks/usePWA'
import { cn } from '@/lib/utils'

interface OfflineIndicatorProps {
  className?: string
  showOnline?: boolean
}

export function OfflineIndicator({ className, showOnline = false }: OfflineIndicatorProps) {
  const { isOnline, isOfflineReady } = usePWA()

  if (isOnline && !showOnline) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        isOnline
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        className
      )}
    >
      {isOnline ? (
        <>
          <Cloud className="w-3.5 h-3.5" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>{isOfflineReady ? 'Offline - Using cached data' : 'Offline'}</span>
        </>
      )}
    </div>
  )
}
