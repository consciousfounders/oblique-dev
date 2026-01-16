import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type {
  SearchResult,
  SearchResultGroup,
  SearchFilters,
  RecentSearch,
  SavedSearch,
  SearchEntityType,
} from '@/lib/types/globalSearch'
import {
  ENTITY_CONFIG,
  MAX_RESULTS_PER_TYPE,
  MAX_RECENT_SEARCHES,
  SEARCH_DEBOUNCE_MS,
} from '@/lib/types/globalSearch'

const RECENT_SEARCHES_KEY = 'crm_recent_searches'
const SAVED_SEARCHES_KEY = 'crm_saved_searches'

export function useGlobalSearch() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load recent and saved searches from localStorage
  useEffect(() => {
    try {
      const storedRecent = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (storedRecent) {
        setRecentSearches(JSON.parse(storedRecent))
      }
      const storedSaved = localStorage.getItem(SAVED_SEARCHES_KEY)
      if (storedSaved) {
        setSavedSearches(JSON.parse(storedSaved))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string, resultCount: number) => {
    if (!searchQuery.trim()) return

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.query !== searchQuery)
      const newSearch: RecentSearch = {
        id: crypto.randomUUID(),
        query: searchQuery,
        timestamp: Date.now(),
        resultCount,
      }
      const updated = [newSearch, ...filtered].slice(0, MAX_RECENT_SEARCHES)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Save a search
  const saveSearch = useCallback((name: string, searchQuery: string, searchFilters?: SearchFilters) => {
    const newSaved: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      query: searchQuery,
      filters: searchFilters,
      createdAt: new Date().toISOString(),
    }
    setSavedSearches((prev) => {
      const updated = [newSaved, ...prev]
      try {
        localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  // Delete a saved search
  const deleteSavedSearch = useCallback((id: string) => {
    setSavedSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      try {
        localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }, [])

  // Main search function
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters = {}) => {
    if (!user?.tenantId) return

    const trimmedQuery = searchQuery.trim().toLowerCase()
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([])
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const entityTypes = searchFilters.entityTypes || ['contact', 'account', 'lead', 'deal', 'activity', 'note']
      const searchPattern = `%${trimmedQuery}%`

      // Build parallel queries based on entity types
      const searchPromises: Promise<{ type: SearchEntityType; results: SearchResult[] }>[] = []

      if (entityTypes.includes('contact')) {
        searchPromises.push(
          searchContacts(user.tenantId, searchPattern).then((results) => ({ type: 'contact' as const, results }))
        )
      }

      if (entityTypes.includes('account')) {
        searchPromises.push(
          searchAccounts(user.tenantId, searchPattern).then((results) => ({ type: 'account' as const, results }))
        )
      }

      if (entityTypes.includes('lead')) {
        searchPromises.push(
          searchLeads(user.tenantId, searchPattern).then((results) => ({ type: 'lead' as const, results }))
        )
      }

      if (entityTypes.includes('deal')) {
        searchPromises.push(
          searchDeals(user.tenantId, searchPattern).then((results) => ({ type: 'deal' as const, results }))
        )
      }

      if (entityTypes.includes('activity')) {
        searchPromises.push(
          searchActivities(user.tenantId, searchPattern).then((results) => ({ type: 'activity' as const, results }))
        )
      }

      if (entityTypes.includes('note')) {
        searchPromises.push(
          searchNotes(user.tenantId, searchPattern).then((results) => ({ type: 'note' as const, results }))
        )
      }

      const searchResults = await Promise.all(searchPromises)

      // Group results by entity type
      const groupedResults: SearchResultGroup[] = searchResults
        .filter(({ results }) => results.length > 0)
        .map(({ type, results }) => ({
          entityType: type,
          label: ENTITY_CONFIG[type].pluralLabel,
          icon: ENTITY_CONFIG[type].icon,
          results,
          totalCount: results.length,
        }))

      setResults(groupedResults)

      // Save to recent searches
      const totalCount = groupedResults.reduce((sum, g) => sum + g.totalCount, 0)
      if (totalCount > 0) {
        saveRecentSearch(searchQuery, totalCount)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Search error:', err)
      setError('Failed to search. Please try again.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.tenantId, saveRecentSearch])

  // Debounced search
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery, filters)
    }, SEARCH_DEBOUNCE_MS)
  }, [performSearch, filters])

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    results,
    isLoading,
    error,
    filters,
    recentSearches,
    savedSearches,
    search,
    clearSearch,
    setFilters,
    saveSearch,
    deleteSavedSearch,
    clearRecentSearches,
  }
}

// Search helper functions
async function searchContacts(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, title, created_at, accounts(name)')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Contact search error:', error)
    return []
  }

  return (data || []).map((contact) => {
    const matchedFields: string[] = []
    const searchLower = pattern.replace(/%/g, '').toLowerCase()

    if (contact.first_name?.toLowerCase().includes(searchLower)) matchedFields.push('name')
    if (contact.last_name?.toLowerCase().includes(searchLower)) matchedFields.push('name')
    if (contact.email?.toLowerCase().includes(searchLower)) matchedFields.push('email')
    if (contact.phone?.toLowerCase().includes(searchLower)) matchedFields.push('phone')

    // Handle Supabase relation - could be object or array depending on join type
    const accountsData = contact.accounts
    const accountName = accountsData
      ? Array.isArray(accountsData)
        ? (accountsData[0] as { name?: string })?.name
        : (accountsData as { name?: string })?.name
      : undefined

    return {
      id: contact.id,
      entityType: 'contact' as const,
      title: `${contact.first_name} ${contact.last_name || ''}`.trim(),
      subtitle: contact.title || contact.email || undefined,
      description: accountName ? `Account: ${accountName}` : undefined,
      url: `/contacts/${contact.id}`,
      matchedFields,
      createdAt: contact.created_at,
    }
  })
}

async function searchAccounts(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, domain, website, industry, created_at')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.${pattern},domain.ilike.${pattern},website.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Account search error:', error)
    return []
  }

  return (data || []).map((account) => {
    const matchedFields: string[] = []
    const searchLower = pattern.replace(/%/g, '').toLowerCase()

    if (account.name?.toLowerCase().includes(searchLower)) matchedFields.push('name')
    if (account.domain?.toLowerCase().includes(searchLower)) matchedFields.push('domain')
    if (account.website?.toLowerCase().includes(searchLower)) matchedFields.push('website')

    return {
      id: account.id,
      entityType: 'account' as const,
      title: account.name,
      subtitle: account.website || account.domain || undefined,
      description: account.industry || undefined,
      url: `/accounts/${account.id}`,
      matchedFields,
      createdAt: account.created_at,
    }
  })
}

async function searchLeads(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, first_name, last_name, email, phone, company, status, created_at')
    .eq('tenant_id', tenantId)
    .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},company.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Lead search error:', error)
    return []
  }

  return (data || []).map((lead) => {
    const matchedFields: string[] = []
    const searchLower = pattern.replace(/%/g, '').toLowerCase()

    if (lead.first_name?.toLowerCase().includes(searchLower)) matchedFields.push('name')
    if (lead.last_name?.toLowerCase().includes(searchLower)) matchedFields.push('name')
    if (lead.email?.toLowerCase().includes(searchLower)) matchedFields.push('email')
    if (lead.company?.toLowerCase().includes(searchLower)) matchedFields.push('company')

    return {
      id: lead.id,
      entityType: 'lead' as const,
      title: `${lead.first_name} ${lead.last_name || ''}`.trim(),
      subtitle: lead.company || lead.email || undefined,
      description: `Status: ${lead.status}`,
      url: `/leads/${lead.id}`,
      matchedFields,
      createdAt: lead.created_at,
    }
  })
}

async function searchDeals(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('id, name, value, created_at, deal_stages(name), accounts(name)')
    .eq('tenant_id', tenantId)
    .ilike('name', pattern)
    .order('updated_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Deal search error:', error)
    return []
  }

  return (data || []).map((deal) => {
    // Handle Supabase relations - could be object or array depending on join type
    const stageData = deal.deal_stages
    const stageName = stageData
      ? Array.isArray(stageData)
        ? (stageData[0] as { name?: string })?.name
        : (stageData as { name?: string })?.name
      : undefined

    const accountData = deal.accounts
    const accountName = accountData
      ? Array.isArray(accountData)
        ? (accountData[0] as { name?: string })?.name
        : (accountData as { name?: string })?.name
      : undefined

    const valueFormatted = deal.value
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(deal.value)
      : null

    return {
      id: deal.id,
      entityType: 'deal' as const,
      title: deal.name,
      subtitle: valueFormatted || undefined,
      description: [stageName, accountName].filter(Boolean).join(' • ') || undefined,
      url: `/deals/${deal.id}`,
      matchedFields: ['name'],
      createdAt: deal.created_at,
    }
  })
}

async function searchActivities(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('id, subject, description, activity_type, entity_type, entity_id, created_at')
    .eq('tenant_id', tenantId)
    .or(`subject.ilike.${pattern},description.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Activity search error:', error)
    return []
  }

  return (data || []).map((activity) => {
    const matchedFields: string[] = []
    const searchLower = pattern.replace(/%/g, '').toLowerCase()

    if (activity.subject?.toLowerCase().includes(searchLower)) matchedFields.push('subject')
    if (activity.description?.toLowerCase().includes(searchLower)) matchedFields.push('description')

    // Build URL based on entity type
    const entityUrl = activity.entity_type && activity.entity_id
      ? `/${activity.entity_type}s/${activity.entity_id}`
      : '/activity'

    return {
      id: activity.id,
      entityType: 'activity' as const,
      title: activity.subject || `${activity.activity_type} activity`,
      subtitle: activity.activity_type,
      description: activity.description?.slice(0, 100) || undefined,
      url: entityUrl,
      matchedFields,
      createdAt: activity.created_at,
    }
  })
}

async function searchNotes(tenantId: string, pattern: string): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, content, content_plain, entity_type, entity_id, created_at')
    .eq('tenant_id', tenantId)
    .ilike('content_plain', pattern)
    .order('created_at', { ascending: false })
    .limit(MAX_RESULTS_PER_TYPE)

  if (error) {
    console.error('Note search error:', error)
    return []
  }

  return (data || []).map((note) => {
    // Build URL based on entity type
    const entityUrl = note.entity_type && note.entity_id
      ? `/${note.entity_type}s/${note.entity_id}`
      : '/activity'

    // Get preview text
    const preview = note.content_plain?.slice(0, 150) || note.content?.slice(0, 150) || ''

    return {
      id: note.id,
      entityType: 'note' as const,
      title: preview.split('\n')[0] || 'Note',
      subtitle: `On ${note.entity_type}`,
      description: preview,
      url: entityUrl,
      matchedFields: ['content'],
      createdAt: note.created_at,
    }
  })
}
