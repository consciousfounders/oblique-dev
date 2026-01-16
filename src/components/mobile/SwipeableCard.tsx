import type { ReactNode } from 'react'
import { Trash2, Phone, Mail, Edit } from 'lucide-react'
import { useSwipeActions, type SwipeDirection } from '@/lib/hooks/useSwipeActions'
import { cn } from '@/lib/utils'

interface SwipeAction {
  icon: ReactNode
  label: string
  color: string
  bgColor: string
}

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: SwipeAction
  rightAction?: SwipeAction
  className?: string
  disabled?: boolean
}

const defaultLeftAction: SwipeAction = {
  icon: <Trash2 className="w-5 h-5" />,
  label: 'Delete',
  color: 'text-white',
  bgColor: 'bg-red-500',
}

const defaultRightAction: SwipeAction = {
  icon: <Edit className="w-5 h-5" />,
  label: 'Edit',
  color: 'text-white',
  bgColor: 'bg-blue-500',
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction = defaultLeftAction,
  rightAction = defaultRightAction,
  className,
  disabled = false,
}: SwipeableCardProps) {
  const { elementRef, swipeDirection, swipeDistance, swipeProgress } = useSwipeActions({
    onSwipeLeft,
    onSwipeRight,
    disabled,
    threshold: 100,
  })

  const getActionStyle = (direction: SwipeDirection) => {
    if (swipeDirection !== direction) return { opacity: 0, transform: 'scale(0.8)' }
    return {
      opacity: Math.min(swipeProgress * 1.5, 1),
      transform: `scale(${0.8 + swipeProgress * 0.2})`,
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Left action (shown when swiping right) */}
      {onSwipeRight && (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-opacity',
            rightAction.bgColor
          )}
          style={{
            width: swipeDirection === 'right' ? swipeDistance : 0,
          }}
        >
          <div className={cn('flex items-center gap-2', rightAction.color)} style={getActionStyle('right')}>
            {rightAction.icon}
            <span className="text-sm font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action (shown when swiping left) */}
      {onSwipeLeft && (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-4 transition-opacity',
            leftAction.bgColor
          )}
          style={{
            width: swipeDirection === 'left' ? swipeDistance : 0,
          }}
        >
          <div className={cn('flex items-center gap-2', leftAction.color)} style={getActionStyle('left')}>
            <span className="text-sm font-medium">{leftAction.label}</span>
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        ref={elementRef}
        className="relative bg-background transition-transform"
        style={{
          transform:
            swipeDirection === 'left'
              ? `translateX(-${swipeDistance}px)`
              : swipeDirection === 'right'
                ? `translateX(${swipeDistance}px)`
                : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Pre-configured swipe actions
export const callAction: SwipeAction = {
  icon: <Phone className="w-5 h-5" />,
  label: 'Call',
  color: 'text-white',
  bgColor: 'bg-green-500',
}

export const emailAction: SwipeAction = {
  icon: <Mail className="w-5 h-5" />,
  label: 'Email',
  color: 'text-white',
  bgColor: 'bg-blue-500',
}

export const deleteAction: SwipeAction = {
  icon: <Trash2 className="w-5 h-5" />,
  label: 'Delete',
  color: 'text-white',
  bgColor: 'bg-red-500',
}

export const editAction: SwipeAction = {
  icon: <Edit className="w-5 h-5" />,
  label: 'Edit',
  color: 'text-white',
  bgColor: 'bg-blue-500',
}
