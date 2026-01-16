import { useState, useEffect, useRef, useCallback } from 'react'

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPull?: number
  disabled?: boolean
}

interface PullToRefreshState {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  pullProgress: number
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { onRefresh, threshold = 80, maxPull = 150, disabled = false } = options

  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
  })

  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || state.isRefreshing) return

      const container = containerRef.current
      if (!container || container.scrollTop > 0) return

      startY.current = e.touches[0].clientY
      setState((prev) => ({ ...prev, isPulling: true }))
    },
    [disabled, state.isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!state.isPulling || disabled || state.isRefreshing) return

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      if (diff > 0) {
        // Apply resistance to pull
        const resistance = Math.min(diff * 0.5, maxPull)
        const progress = Math.min(resistance / threshold, 1)

        setState((prev) => ({
          ...prev,
          pullDistance: resistance,
          pullProgress: progress,
        }))

        // Prevent default scroll if pulling
        if (resistance > 10) {
          e.preventDefault()
        }
      }
    },
    [state.isPulling, state.isRefreshing, disabled, threshold, maxPull]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || disabled) return

    const shouldRefresh = state.pullDistance >= threshold

    if (shouldRefresh) {
      setState((prev) => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
        pullDistance: threshold,
        pullProgress: 1,
      }))

      try {
        await onRefresh()
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
        })
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        pullProgress: 0,
      })
    }
  }, [state.isPulling, state.pullDistance, threshold, disabled, onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    containerRef,
    ...state,
  }
}
