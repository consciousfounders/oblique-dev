import { useRef, useEffect, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { RefreshCw } from 'lucide-react'

interface VirtualListProps<T> {
  /** Array of items to render */
  items: T[]
  /** Height of each item in pixels */
  estimatedItemHeight: number
  /** Function to get a unique key for each item */
  getItemKey: (item: T, index: number) => string | number
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode
  /** Whether there are more items to load */
  hasNextPage?: boolean
  /** Whether more items are being fetched */
  isFetchingNextPage?: boolean
  /** Function to fetch next page */
  fetchNextPage?: () => void
  /** Overscan count - how many items to render outside visible area */
  overscan?: number
  /** Maximum height of the container (defaults to 100vh - 200px) */
  maxHeight?: string
  /** Empty state component */
  emptyState?: ReactNode
  /** Loading state component */
  loadingState?: ReactNode
  /** Whether initial data is loading */
  isLoading?: boolean
  /** CSS class for the container */
  className?: string
}

/**
 * A virtualized list component that efficiently renders large lists
 * by only rendering items that are visible in the viewport.
 * Supports infinite scroll with automatic next page fetching.
 */
export function VirtualList<T>({
  items,
  estimatedItemHeight,
  getItemKey,
  renderItem,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  overscan = 5,
  maxHeight = 'calc(100vh - 200px)',
  emptyState,
  loadingState,
  isLoading = false,
  className = '',
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
    getItemKey: (index) => getItemKey(items[index], index),
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Infinite scroll: fetch next page when approaching the end
  useEffect(() => {
    if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return

    const lastItem = virtualItems[virtualItems.length - 1]
    if (!lastItem) return

    // Start fetching when we're 5 items from the end
    if (lastItem.index >= items.length - 5) {
      fetchNextPage()
    }
  }, [virtualItems, hasNextPage, isFetchingNextPage, fetchNextPage, items.length])

  if (isLoading) {
    return (
      loadingState || (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    )
  }

  if (items.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index]
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

interface VirtualGridProps<T> {
  /** Array of items to render */
  items: T[]
  /** Number of columns in the grid */
  columns: number
  /** Height of each row in pixels */
  estimatedRowHeight: number
  /** Function to get a unique key for each item */
  getItemKey: (item: T, index: number) => string | number
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode
  /** Whether there are more items to load */
  hasNextPage?: boolean
  /** Whether more items are being fetched */
  isFetchingNextPage?: boolean
  /** Function to fetch next page */
  fetchNextPage?: () => void
  /** Overscan count - how many rows to render outside visible area */
  overscan?: number
  /** Maximum height of the container */
  maxHeight?: string
  /** Empty state component */
  emptyState?: ReactNode
  /** Loading state component */
  loadingState?: ReactNode
  /** Whether initial data is loading */
  isLoading?: boolean
  /** CSS class for the container */
  className?: string
  /** Gap between items in pixels */
  gap?: number
}

/**
 * A virtualized grid component that efficiently renders large grids
 * by only rendering rows that are visible in the viewport.
 */
export function VirtualGrid<T>({
  items,
  columns,
  estimatedRowHeight,
  getItemKey,
  renderItem,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  overscan = 3,
  maxHeight = 'calc(100vh - 200px)',
  emptyState,
  loadingState,
  isLoading = false,
  className = '',
  gap = 16,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Calculate number of rows
  const rowCount = Math.ceil(items.length / columns)

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight + gap,
    overscan,
  })

  const virtualRows = virtualizer.getVirtualItems()

  // Infinite scroll: fetch next page when approaching the end
  useEffect(() => {
    if (!fetchNextPage || !hasNextPage || isFetchingNextPage) return

    const lastRow = virtualRows[virtualRows.length - 1]
    if (!lastRow) return

    // Start fetching when we're 2 rows from the end
    if (lastRow.index >= rowCount - 2) {
      fetchNextPage()
    }
  }, [virtualRows, hasNextPage, isFetchingNextPage, fetchNextPage, rowCount])

  if (isLoading) {
    return (
      loadingState || (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    )
  }

  if (items.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns
          const rowItems = items.slice(startIndex, startIndex + columns)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                paddingBottom: `${gap}px`,
              }}
            >
              {rowItems.map((item, colIndex) => {
                const itemIndex = startIndex + colIndex
                return (
                  <div key={getItemKey(item, itemIndex)}>
                    {renderItem(item, itemIndex)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
