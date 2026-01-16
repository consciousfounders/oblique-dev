import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  cacheContacts,
  getCachedContacts,
  searchCachedContacts,
  cacheLeads,
  getCachedLeads,
  cacheDeals,
  getCachedDeals,
  addPendingAction,
  getPendingActions,
  removePendingAction,
  clearOfflineData,
} from '@/lib/pwa/offline-storage'

type EntityType = 'contacts' | 'leads' | 'deals'

export function useOfflineData(entityType: EntityType) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    getPendingActions().then((actions) => {
      const count = actions.filter((a) => a.entity === entityType).length
      setPendingCount(count)
    })
  }, [entityType])

  const cacheData = useCallback(
    async (data: Array<Record<string, unknown>>) => {
      switch (entityType) {
        case 'contacts':
          await cacheContacts(data)
          break
        case 'leads':
          await cacheLeads(data)
          break
        case 'deals':
          await cacheDeals(data)
          break
      }
    },
    [entityType]
  )

  const getCachedData = useCallback(async () => {
    switch (entityType) {
      case 'contacts':
        return getCachedContacts()
      case 'leads':
        return getCachedLeads()
      case 'deals':
        return getCachedDeals()
      default:
        return []
    }
  }, [entityType])

  const searchCached = useCallback(
    async (query: string) => {
      if (entityType === 'contacts') {
        return searchCachedContacts(query)
      }
      // For other entities, get all and filter
      const data = await getCachedData()
      const lowerQuery = query.toLowerCase()
      return data.filter((item) => {
        const name = (item.name as string) || ''
        const email = (item.email as string) || ''
        return name.toLowerCase().includes(lowerQuery) || email.toLowerCase().includes(lowerQuery)
      })
    },
    [entityType, getCachedData]
  )

  const queueOfflineAction = useCallback(
    async (
      type: 'create' | 'update' | 'delete',
      entityId: string,
      payload: Record<string, unknown>
    ) => {
      const id = await addPendingAction(type, entityType as 'contacts' | 'leads' | 'deals', entityId, payload)
      setPendingCount((prev) => prev + 1)
      return id
    },
    [entityType]
  )

  const syncPendingActions = useCallback(async () => {
    if (isOffline) return

    setIsSyncing(true)
    try {
      const actions = await getPendingActions()
      const entityActions = actions.filter((a) => a.entity === entityType)

      for (const action of entityActions) {
        try {
          // The actual sync would be handled by React Query mutations
          // This is a placeholder for the sync logic
          await removePendingAction(action.id)
          setPendingCount((prev) => Math.max(0, prev - 1))
        } catch {
          // Keep the action in pending if sync fails
          console.error(`Failed to sync action ${action.id}`)
        }
      }

      // Invalidate queries after sync
      queryClient.invalidateQueries({ queryKey: [entityType] })
    } finally {
      setIsSyncing(false)
    }
  }, [entityType, isOffline, queryClient])

  const clearCache = useCallback(async () => {
    await clearOfflineData()
    setPendingCount(0)
  }, [])

  return {
    isOffline,
    isSyncing,
    pendingCount,
    cacheData,
    getCachedData,
    searchCached,
    queueOfflineAction,
    syncPendingActions,
    clearCache,
  }
}
