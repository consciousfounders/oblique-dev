import { useState, useRef, useCallback, useEffect } from 'react'

export type SwipeDirection = 'left' | 'right' | null

interface SwipeActionsOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  disabled?: boolean
}

interface SwipeActionsState {
  isSwiping: boolean
  swipeDirection: SwipeDirection
  swipeDistance: number
  swipeProgress: number
}

export function useSwipeActions(options: SwipeActionsOptions = {}) {
  const { threshold = 100, onSwipeLeft, onSwipeRight, disabled = false } = options

  const [state, setState] = useState<SwipeActionsState>({
    isSwiping: false,
    swipeDirection: null,
    swipeDistance: 0,
    swipeProgress: 0,
  })

  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef<boolean | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled) return

      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      isHorizontalSwipe.current = null

      setState((prev) => ({ ...prev, isSwiping: true }))
    },
    [disabled]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!state.isSwiping || disabled) return

      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const diffX = currentX - startX.current
      const diffY = currentY - startY.current

      // Determine if this is a horizontal swipe (only once)
      if (isHorizontalSwipe.current === null) {
        isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
      }

      // Only handle horizontal swipes
      if (!isHorizontalSwipe.current) {
        setState((prev) => ({ ...prev, isSwiping: false }))
        return
      }

      const direction: SwipeDirection = diffX > 0 ? 'right' : 'left'
      const distance = Math.abs(diffX)
      const progress = Math.min(distance / threshold, 1)

      // Apply resistance
      const resistedDistance = Math.min(distance * 0.8, threshold * 1.5)

      setState({
        isSwiping: true,
        swipeDirection: direction,
        swipeDistance: resistedDistance,
        swipeProgress: progress,
      })

      // Prevent vertical scroll during horizontal swipe
      if (distance > 10) {
        e.preventDefault()
      }
    },
    [state.isSwiping, disabled, threshold]
  )

  const handleTouchEnd = useCallback(() => {
    if (!state.isSwiping || disabled) return

    const shouldTrigger = state.swipeProgress >= 1

    if (shouldTrigger) {
      if (state.swipeDirection === 'left' && onSwipeLeft) {
        onSwipeLeft()
      } else if (state.swipeDirection === 'right' && onSwipeRight) {
        onSwipeRight()
      }
    }

    // Reset state
    setState({
      isSwiping: false,
      swipeDirection: null,
      swipeDistance: 0,
      swipeProgress: 0,
    })

    isHorizontalSwipe.current = null
  }, [state.isSwiping, state.swipeDirection, state.swipeProgress, disabled, onSwipeLeft, onSwipeRight])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const reset = useCallback(() => {
    setState({
      isSwiping: false,
      swipeDirection: null,
      swipeDistance: 0,
      swipeProgress: 0,
    })
  }, [])

  return {
    elementRef,
    ...state,
    reset,
  }
}
