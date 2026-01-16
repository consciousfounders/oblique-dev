// Global Search Types

export type SearchEntityType =
  | 'contact'
  | 'account'
  | 'lead'
  | 'deal'
  | 'activity'
  | 'note'

export interface SearchResult {
  id: string
  entityType: SearchEntityType
  title: string
  subtitle?: string
  description?: string
  url: string
  matchedFields: string[]
  createdAt: string
}

export interface SearchResultGroup {
  entityType: SearchEntityType
  label: string
  icon: string
  results: SearchResult[]
  totalCount: number
}

export interface RecentSearch {
  id: string
  query: string
  timestamp: number
  resultCount?: number
}

export interface SavedSearch {
  id: string
  name: string
  query: string
  filters?: SearchFilters
  createdAt: string
}

export interface SearchFilters {
  entityTypes?: SearchEntityType[]
  dateRange?: {
    start: string
    end: string
  }
  owner?: string
}

export interface GlobalSearchState {
  query: string
  results: SearchResultGroup[]
  isLoading: boolean
  error: string | null
  recentSearches: RecentSearch[]
  savedSearches: SavedSearch[]
  filters: SearchFilters
  selectedIndex: number
}

// Entity type configuration for UI
export const ENTITY_CONFIG: Record<SearchEntityType, { label: string; pluralLabel: string; icon: string; color: string }> = {
  contact: {
    label: 'Contact',
    pluralLabel: 'Contacts',
    icon: 'User',
    color: 'text-blue-500',
  },
  account: {
    label: 'Account',
    pluralLabel: 'Accounts',
    icon: 'Building2',
    color: 'text-purple-500',
  },
  lead: {
    label: 'Lead',
    pluralLabel: 'Leads',
    icon: 'UserPlus',
    color: 'text-green-500',
  },
  deal: {
    label: 'Deal',
    pluralLabel: 'Deals',
    icon: 'DollarSign',
    color: 'text-orange-500',
  },
  activity: {
    label: 'Activity',
    pluralLabel: 'Activities',
    icon: 'Activity',
    color: 'text-cyan-500',
  },
  note: {
    label: 'Note',
    pluralLabel: 'Notes',
    icon: 'FileText',
    color: 'text-yellow-500',
  },
}

// Maximum results per entity type
export const MAX_RESULTS_PER_TYPE = 5
export const MAX_RECENT_SEARCHES = 10
export const SEARCH_DEBOUNCE_MS = 150
