import { createContext, useContext, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a stable QueryClient with optimized defaults for the CRM
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: data stays fresh for 2 minutes
        staleTime: 2 * 60 * 1000,
        // Cache time: keep unused data for 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests up to 2 times
        retry: 2,
        // Don't refetch on window focus by default (can be enabled per-query)
        refetchOnWindowFocus: false,
        // Deduplicate requests within 1 second
        refetchOnMount: 'always',
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  })
}

// Query keys factory for type-safe, consistent cache keys
export const queryKeys = {
  // Gmail
  gmail: {
    all: ['gmail'] as const,
    threads: (search?: string) => [...queryKeys.gmail.all, 'threads', { search }] as const,
    thread: (id: string) => [...queryKeys.gmail.all, 'thread', id] as const,
  },
  // Calendar
  calendar: {
    all: ['calendar'] as const,
    events: (start?: Date, end?: Date) => [...queryKeys.calendar.all, 'events', { start: start?.toISOString(), end: end?.toISOString() }] as const,
    event: (id: string) => [...queryKeys.calendar.all, 'event', id] as const,
  },
  // Drive
  drive: {
    all: ['drive'] as const,
    files: (folderId?: string, search?: string) => [...queryKeys.drive.all, 'files', { folderId, search }] as const,
    file: (id: string) => [...queryKeys.drive.all, 'file', id] as const,
    recent: () => [...queryKeys.drive.all, 'recent'] as const,
    starred: () => [...queryKeys.drive.all, 'starred'] as const,
    shared: () => [...queryKeys.drive.all, 'shared'] as const,
  },
  // CRM entities
  contacts: {
    all: ['contacts'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.contacts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.contacts.all, 'detail', id] as const,
  },
  leads: {
    all: ['leads'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.leads.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.leads.all, 'detail', id] as const,
  },
  deals: {
    all: ['deals'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.deals.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.deals.all, 'detail', id] as const,
  },
  accounts: {
    all: ['accounts'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.accounts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.accounts.all, 'detail', id] as const,
  },
  activities: {
    all: ['activities'] as const,
    list: (entityType?: string, entityId?: string) => [...queryKeys.activities.all, 'list', { entityType, entityId }] as const,
  },
} as const

// Context for accessing query client imperatively
const QueryClientContext = createContext<QueryClient | null>(null)

export function useQueryClientContext() {
  const client = useContext(QueryClientContext)
  if (!client) {
    throw new Error('useQueryClientContext must be used within QueryProvider')
  }
  return client
}

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create stable QueryClient that persists across re-renders
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </QueryClientContext.Provider>
  )
}
