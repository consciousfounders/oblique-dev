import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import {
  Search,
  User,
  Building2,
  UserPlus,
  DollarSign,
  Activity,
  FileText,
  Clock,
  X,
  ArrowRight,
  Command,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGlobalSearch } from '@/lib/hooks/useGlobalSearch'
import type { SearchResult, SearchResultGroup, SearchEntityType } from '@/lib/types/globalSearch'
import { ENTITY_CONFIG } from '@/lib/types/globalSearch'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Icon mapping for entity types
const EntityIcon: Record<SearchEntityType, typeof User> = {
  contact: User,
  account: Building2,
  lead: UserPlus,
  deal: DollarSign,
  activity: Activity,
  note: FileText,
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeFilter, setActiveFilter] = useState<SearchEntityType | null>(null)

  const {
    query,
    results,
    isLoading,
    recentSearches,
    search,
    clearSearch,
    clearRecentSearches,
  } = useGlobalSearch()

  // Flatten results for keyboard navigation
  const flattenedResults = results.flatMap((group) => group.results)
  const totalResults = flattenedResults.length

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 0)
      setSelectedIndex(0)
    } else {
      clearSearch()
      setActiveFilter(null)
    }
  }, [open, clearSearch])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && totalResults > 0) {
      const items = listRef.current.querySelectorAll('[data-result-item]')
      const selectedItem = items[selectedIndex]
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, totalResults])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < totalResults - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (flattenedResults[selectedIndex]) {
          handleSelect(flattenedResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        if (query) {
          clearSearch()
        } else {
          onOpenChange(false)
        }
        break
    }
  }, [totalResults, selectedIndex, flattenedResults, query, clearSearch, onOpenChange])

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false)
    navigate(result.url)
  }, [navigate, onOpenChange])

  // Handle recent search click
  const handleRecentSearchClick = useCallback((searchQuery: string) => {
    search(searchQuery)
  }, [search])

  // Handle filter toggle
  const handleFilterToggle = useCallback((filter: SearchEntityType) => {
    setActiveFilter((prev) => (prev === filter ? null : filter))
    // TODO: Implement filtered search
  }, [])

  // Filter results based on active filter
  const filteredResults = activeFilter
    ? results.filter((group) => group.entityType === activeFilter)
    : results

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl top-[20%] translate-y-0">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground shrink-0 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => search(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex h-14 w-full bg-transparent py-3 pl-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search contacts, accounts, deals, leads..."
          />
          {query && (
            <button
              onClick={clearSearch}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <div className="flex items-center gap-1 pl-2 border-l ml-2">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">esc</span>
            </kbd>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          {(Object.keys(ENTITY_CONFIG) as SearchEntityType[]).map((type) => {
            const Icon = EntityIcon[type]
            const config = ENTITY_CONFIG[type]
            const isActive = activeFilter === type
            return (
              <button
                key={type}
                onClick={() => handleFilterToggle(type)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {config.pluralLabel}
              </button>
            )
          })}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto">
          {/* Empty State - No Query */}
          {!query && recentSearches.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Command className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Start typing to search across all modules</p>
              <p className="text-xs mt-2 text-muted-foreground/60">
                Search contacts, accounts, leads, deals, activities, and notes
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
              {recentSearches.slice(0, 5).map((recent) => (
                <button
                  key={recent.id}
                  onClick={() => handleRecentSearchClick(recent.query)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-left"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm truncate">{recent.query}</span>
                  {recent.resultCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {recent.resultCount} results
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {query && isLoading && (
            <div className="py-12 text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Searching...</p>
            </div>
          )}

          {/* No Results */}
          {query && !isLoading && filteredResults.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-2 text-muted-foreground/60">
                Try adjusting your search or filters
              </p>
            </div>
          )}

          {/* Search Results */}
          {query && !isLoading && filteredResults.length > 0 && (
            <div className="py-2">
              {filteredResults.map((group, groupIndex) => (
                <SearchResultGroupComponent
                  key={group.entityType}
                  group={group}
                  groupIndex={groupIndex}
                  selectedIndex={selectedIndex}
                  flattenedResults={flattenedResults}
                  query={query}
                  onSelect={handleSelect}
                  onHover={setSelectedIndex}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
              <span>Open</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
              <span>Close</span>
            </span>
          </div>
          {totalResults > 0 && (
            <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Search result group component
interface SearchResultGroupComponentProps {
  group: SearchResultGroup
  groupIndex: number
  selectedIndex: number
  flattenedResults: SearchResult[]
  query: string
  onSelect: (result: SearchResult) => void
  onHover: (index: number) => void
}

function SearchResultGroupComponent({
  group,
  selectedIndex,
  flattenedResults,
  query,
  onSelect,
  onHover,
}: SearchResultGroupComponentProps) {
  const Icon = EntityIcon[group.entityType]
  const config = ENTITY_CONFIG[group.entityType]

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Icon className={cn('h-4 w-4', config.color)} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {group.label}
        </span>
        <span className="text-xs text-muted-foreground">({group.totalCount})</span>
      </div>
      {group.results.map((result) => {
        const flatIndex = flattenedResults.findIndex((r) => r.id === result.id && r.entityType === result.entityType)
        const isSelected = flatIndex === selectedIndex

        return (
          <button
            key={`${result.entityType}-${result.id}`}
            data-result-item
            onClick={() => onSelect(result)}
            onMouseEnter={() => onHover(flatIndex)}
            className={cn(
              'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
              isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
            )}
          >
            <div className={cn(
              'mt-0.5 p-1.5 rounded-md',
              isSelected ? 'bg-primary/20' : 'bg-muted'
            )}>
              <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium truncate',
                  isSelected && 'text-primary'
                )}>
                  <HighlightedText text={result.title} query={query} />
                </span>
                {result.matchedFields.length > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    in {result.matchedFields.join(', ')}
                  </span>
                )}
              </div>
              {result.subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  <HighlightedText text={result.subtitle} query={query} />
                </p>
              )}
              {result.description && (
                <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                  {result.description}
                </p>
              )}
            </div>
            {isSelected && (
              <ArrowRight className="h-4 w-4 text-primary mt-1 shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Highlight matching text in search results
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'))

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded px-0.5">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  )
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
