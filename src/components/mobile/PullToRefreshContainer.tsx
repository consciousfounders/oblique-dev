import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

interface PullToRefreshContainerProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefreshContainer({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshContainerProps) {
  const { containerRef, isPulling, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh,
    disabled,
  })

  return (
    <div ref={containerRef} className={cn('relative overflow-auto', className)}>
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center transition-opacity',
          isPulling || isRefreshing ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          top: -60 + pullDistance,
          height: 60,
        }}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full bg-background border shadow-sm flex items-center justify-center transition-transform',
            isRefreshing && 'animate-spin'
          )}
          style={{
            transform: isRefreshing ? undefined : `rotate(${pullProgress * 360}deg)`,
          }}
        >
          <Loader2 className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}
