import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { CRMPageHeader } from './CRMPageHeader'
import { CRMDataTable } from './CRMDataTable'
import type { CRMColumn, CRMRowAction, CRMBulkAction, SortDirection } from './CRMDataTable'
import { CRMPagination } from './CRMPagination'
import { CRMEmptyState } from './CRMEmptyState'
import { Search, Filter, X, Bookmark } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickFilter {
  id: string
  label: string
  filter: (item: unknown) => boolean
}

interface SavedView {
  id: string
  name: string
  filters: Record<string, unknown>
}

interface CRMListViewProps<T> {
  // Header
  title: string
  subtitle?: string
  actions?: { label: string; onClick?: () => void; href?: string; icon?: LucideIcon; variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' }[]

  // Data
  data: T[]
  columns: CRMColumn<T>[]
  rowKey: keyof T
  loading?: boolean

  // Search
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchFields?: (keyof T)[]

  // Filters
  quickFilters?: QuickFilter[]
  activeQuickFilter?: string
  onQuickFilterChange?: (filterId: string | null) => void

  // Saved Views
  savedViews?: SavedView[]
  activeSavedView?: string
  onSavedViewChange?: (viewId: string | null) => void
  onSaveView?: () => void

  // Sorting
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (column: string, direction: SortDirection) => void

  // Pagination
  currentPage?: number
  totalPages?: number
  totalItems?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void

  // Actions
  rowActions?: CRMRowAction<T>[]
  bulkActions?: CRMBulkAction<T>[]
  onRowClick?: (row: T) => void

  // Customization
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; onClick: () => void }
  className?: string
  children?: React.ReactNode
}

export function CRMListView<T>({
  // Header
  title,
  subtitle,
  actions = [],

  // Data
  data,
  columns,
  rowKey,
  loading = false,

  // Search
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  searchFields,

  // Filters
  quickFilters = [],
  activeQuickFilter,
  onQuickFilterChange,

  // Saved Views
  savedViews = [],
  activeSavedView,
  onSavedViewChange,
  onSaveView,

  // Sorting
  sortColumn,
  sortDirection,
  onSort,

  // Pagination
  currentPage = 1,
  totalPages = 1,
  totalItems,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,

  // Actions
  rowActions = [],
  bulkActions = [],
  onRowClick,

  // Customization
  emptyIcon,
  emptyTitle = 'No records found',
  emptyDescription,
  emptyAction,
  className,
  children,
}: CRMListViewProps<T>) {
  const [localSearch, setLocalSearch] = React.useState(searchValue)

  // Handle local search with debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== searchValue) {
        onSearchChange(localSearch)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearch, onSearchChange, searchValue])

  // Local filtering if no external search handler
  const filteredData = React.useMemo(() => {
    let result = data

    // Apply local search if searchFields provided and no external handler
    if (!onSearchChange && localSearch && searchFields && searchFields.length > 0) {
      const searchLower = localSearch.toLowerCase()
      result = result.filter((item) =>
        searchFields.some((field) => {
          const value = item[field]
          return value && String(value).toLowerCase().includes(searchLower)
        })
      )
    }

    // Apply quick filter
    if (activeQuickFilter) {
      const filter = quickFilters.find((f) => f.id === activeQuickFilter)
      if (filter) {
        result = result.filter((item) => filter.filter(item))
      }
    }

    return result
  }, [data, localSearch, searchFields, onSearchChange, activeQuickFilter, quickFilters])

  const actualTotalItems = totalItems ?? filteredData.length
  const actualTotalPages = totalPages ?? (Math.ceil(actualTotalItems / pageSize) || 1)
  const showPagination = actualTotalItems > pageSize && onPageChange

  const hasActiveFilters = activeQuickFilter || activeSavedView

  return (
    <div className={cn('space-y-6', className)}>
      {/* Page Header */}
      <CRMPageHeader
        title={title}
        subtitle={subtitle ?? `${actualTotalItems} total ${title.toLowerCase()}`}
        actions={actions}
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
          {localSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={() => setLocalSearch('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        {quickFilters.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeQuickFilter ? 'default' : 'outline'} className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {activeQuickFilter && (
                  <span className="bg-primary-foreground text-primary px-1.5 py-0.5 rounded text-xs">
                    1
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => onQuickFilterChange?.(
                    activeQuickFilter === filter.id ? null : filter.id
                  )}
                  className={cn(activeQuickFilter === filter.id && 'bg-accent')}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
              {activeQuickFilter && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onQuickFilterChange?.(null)}>
                    Clear Filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Saved Views */}
        {(savedViews.length > 0 || onSaveView) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant={activeSavedView ? 'default' : 'outline'} className="gap-2">
                <Bookmark className="h-4 w-4" />
                Views
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onClick={() => onSavedViewChange?.(
                    activeSavedView === view.id ? null : view.id
                  )}
                  className={cn(activeSavedView === view.id && 'bg-accent')}
                >
                  {view.name}
                </DropdownMenuItem>
              ))}
              {savedViews.length > 0 && onSaveView && <DropdownMenuSeparator />}
              {onSaveView && (
                <DropdownMenuItem onClick={onSaveView}>
                  Save Current View
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          {activeQuickFilter && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
              <span>{quickFilters.find((f) => f.id === activeQuickFilter)?.label}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-primary/20"
                onClick={() => onQuickFilterChange?.(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {activeSavedView && (
            <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
              <Bookmark className="h-3 w-3" />
              <span>{savedViews.find((v) => v.id === activeSavedView)?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 hover:bg-primary/20"
                onClick={() => onSavedViewChange?.(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Optional extra children (for create forms, etc.) */}
      {children}

      {/* Data Table or Empty State */}
      {!loading && filteredData.length === 0 ? (
        <CRMEmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription || (localSearch ? 'Try adjusting your search or filters' : undefined)}
          action={emptyAction}
        />
      ) : (
        <CRMDataTable
          data={filteredData}
          columns={columns}
          rowKey={rowKey}
          rowActions={rowActions}
          bulkActions={bulkActions}
          onRowClick={onRowClick}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={onSort}
          loading={loading}
        />
      )}

      {/* Pagination */}
      {showPagination && (
        <CRMPagination
          currentPage={currentPage}
          totalPages={actualTotalPages}
          totalItems={actualTotalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  )
}
