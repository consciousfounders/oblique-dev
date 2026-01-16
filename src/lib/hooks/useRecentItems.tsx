import { useState, useEffect, useCallback } from 'react'

export interface RecentItem {
  id: string
  type: 'contact' | 'account' | 'deal' | 'lead' | 'task'
  name: string
  href: string
  timestamp: number
}

const STORAGE_KEY = 'crm_recent_items'
const MAX_ITEMS = 10

export function useRecentItems() {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as RecentItem[]
        // Filter out stale items (older than 7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const fresh = parsed.filter((item) => item.timestamp > weekAgo)
        setRecentItems(fresh)
      }
    } catch (error) {
      console.error('Error loading recent items:', error)
    }
  }, [])

  // Save to localStorage when items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentItems))
    } catch (error) {
      console.error('Error saving recent items:', error)
    }
  }, [recentItems])

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setRecentItems((prev) => {
      // Remove existing item with same id and type
      const filtered = prev.filter(
        (existing) => !(existing.id === item.id && existing.type === item.type)
      )

      // Add new item at the beginning
      const newItem: RecentItem = {
        ...item,
        timestamp: Date.now(),
      }

      // Keep only the most recent items
      return [newItem, ...filtered].slice(0, MAX_ITEMS)
    })
  }, [])

  const removeRecentItem = useCallback((id: string, type: string) => {
    setRecentItems((prev) =>
      prev.filter((item) => !(item.id === id && item.type === type))
    )
  }, [])

  const clearRecentItems = useCallback(() => {
    setRecentItems([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const getItemsByType = useCallback(
    (type: RecentItem['type']) => {
      return recentItems.filter((item) => item.type === type)
    },
    [recentItems]
  )

  return {
    recentItems,
    addRecentItem,
    removeRecentItem,
    clearRecentItems,
    getItemsByType,
  }
}
