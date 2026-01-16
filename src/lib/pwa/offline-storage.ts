import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'

interface CRMOfflineDB extends DBSchema {
  contacts: {
    key: string
    value: {
      id: string
      first_name: string
      last_name: string
      email: string | null
      phone: string | null
      company: string | null
      synced_at: number
      data: Record<string, unknown>
    }
    indexes: { 'by-name': string; 'by-synced': number }
  }
  leads: {
    key: string
    value: {
      id: string
      name: string
      email: string | null
      phone: string | null
      company: string | null
      status: string
      synced_at: number
      data: Record<string, unknown>
    }
    indexes: { 'by-name': string; 'by-synced': number }
  }
  deals: {
    key: string
    value: {
      id: string
      name: string
      amount: number | null
      stage: string
      synced_at: number
      data: Record<string, unknown>
    }
    indexes: { 'by-name': string; 'by-synced': number }
  }
  pendingActions: {
    key: string
    value: {
      id: string
      type: 'create' | 'update' | 'delete'
      entity: 'contacts' | 'leads' | 'deals' | 'tasks' | 'activities'
      entityId: string
      payload: Record<string, unknown>
      created_at: number
      retries: number
    }
    indexes: { 'by-created': number }
  }
  cache: {
    key: string
    value: {
      key: string
      data: unknown
      expires_at: number
    }
    indexes: { 'by-expires': number }
  }
}

const DB_NAME = 'oblique-crm-offline'
const DB_VERSION = 1

let dbInstance: IDBPDatabase<CRMOfflineDB> | null = null

export async function getDB(): Promise<IDBPDatabase<CRMOfflineDB>> {
  if (dbInstance) return dbInstance

  dbInstance = await openDB<CRMOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Contacts store
      if (!db.objectStoreNames.contains('contacts')) {
        const contactStore = db.createObjectStore('contacts', { keyPath: 'id' })
        contactStore.createIndex('by-name', 'last_name')
        contactStore.createIndex('by-synced', 'synced_at')
      }

      // Leads store
      if (!db.objectStoreNames.contains('leads')) {
        const leadStore = db.createObjectStore('leads', { keyPath: 'id' })
        leadStore.createIndex('by-name', 'name')
        leadStore.createIndex('by-synced', 'synced_at')
      }

      // Deals store
      if (!db.objectStoreNames.contains('deals')) {
        const dealStore = db.createObjectStore('deals', { keyPath: 'id' })
        dealStore.createIndex('by-name', 'name')
        dealStore.createIndex('by-synced', 'synced_at')
      }

      // Pending actions store for background sync
      if (!db.objectStoreNames.contains('pendingActions')) {
        const pendingStore = db.createObjectStore('pendingActions', { keyPath: 'id' })
        pendingStore.createIndex('by-created', 'created_at')
      }

      // Generic cache store
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
        cacheStore.createIndex('by-expires', 'expires_at')
      }
    },
  })

  return dbInstance
}

// Contact operations
export async function cacheContacts(contacts: Array<Record<string, unknown>>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('contacts', 'readwrite')
  const now = Date.now()

  await Promise.all([
    ...contacts.map((contact) =>
      tx.store.put({
        id: contact.id as string,
        first_name: (contact.first_name as string) || '',
        last_name: (contact.last_name as string) || '',
        email: contact.email as string | null,
        phone: contact.phone as string | null,
        company: contact.company as string | null,
        synced_at: now,
        data: contact,
      })
    ),
    tx.done,
  ])
}

export async function getCachedContacts(): Promise<Array<Record<string, unknown>>> {
  const db = await getDB()
  const contacts = await db.getAll('contacts')
  return contacts.map((c) => c.data)
}

export async function searchCachedContacts(query: string): Promise<Array<Record<string, unknown>>> {
  const db = await getDB()
  const contacts = await db.getAll('contacts')
  const lowerQuery = query.toLowerCase()

  return contacts
    .filter(
      (c) =>
        c.first_name.toLowerCase().includes(lowerQuery) ||
        c.last_name.toLowerCase().includes(lowerQuery) ||
        (c.email && c.email.toLowerCase().includes(lowerQuery)) ||
        (c.company && c.company.toLowerCase().includes(lowerQuery))
    )
    .map((c) => c.data)
}

// Lead operations
export async function cacheLeads(leads: Array<Record<string, unknown>>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('leads', 'readwrite')
  const now = Date.now()

  await Promise.all([
    ...leads.map((lead) =>
      tx.store.put({
        id: lead.id as string,
        name: (lead.name as string) || '',
        email: lead.email as string | null,
        phone: lead.phone as string | null,
        company: lead.company as string | null,
        status: (lead.status as string) || 'new',
        synced_at: now,
        data: lead,
      })
    ),
    tx.done,
  ])
}

export async function getCachedLeads(): Promise<Array<Record<string, unknown>>> {
  const db = await getDB()
  const leads = await db.getAll('leads')
  return leads.map((l) => l.data)
}

// Deal operations
export async function cacheDeals(deals: Array<Record<string, unknown>>): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('deals', 'readwrite')
  const now = Date.now()

  await Promise.all([
    ...deals.map((deal) =>
      tx.store.put({
        id: deal.id as string,
        name: (deal.name as string) || '',
        amount: deal.amount as number | null,
        stage: (deal.stage as string) || '',
        synced_at: now,
        data: deal,
      })
    ),
    tx.done,
  ])
}

export async function getCachedDeals(): Promise<Array<Record<string, unknown>>> {
  const db = await getDB()
  const deals = await db.getAll('deals')
  return deals.map((d) => d.data)
}

// Pending actions for background sync
export async function addPendingAction(
  type: 'create' | 'update' | 'delete',
  entity: 'contacts' | 'leads' | 'deals' | 'tasks' | 'activities',
  entityId: string,
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getDB()
  const id = `${entity}-${entityId}-${Date.now()}`

  await db.put('pendingActions', {
    id,
    type,
    entity,
    entityId,
    payload,
    created_at: Date.now(),
    retries: 0,
  })

  return id
}

export async function getPendingActions() {
  const db = await getDB()
  return db.getAllFromIndex('pendingActions', 'by-created')
}

export async function removePendingAction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pendingActions', id)
}

export async function incrementPendingActionRetry(id: string): Promise<void> {
  const db = await getDB()
  const action = await db.get('pendingActions', id)
  if (action) {
    action.retries += 1
    await db.put('pendingActions', action)
  }
}

// Generic cache operations
export async function setCache(key: string, data: unknown, ttlSeconds = 3600): Promise<void> {
  const db = await getDB()
  await db.put('cache', {
    key,
    data,
    expires_at: Date.now() + ttlSeconds * 1000,
  })
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getDB()
  const cached = await db.get('cache', key)

  if (!cached) return null
  if (cached.expires_at < Date.now()) {
    await db.delete('cache', key)
    return null
  }

  return cached.data as T
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDB()
  const now = Date.now()
  const expired = await db.getAllFromIndex('cache', 'by-expires')

  const tx = db.transaction('cache', 'readwrite')
  await Promise.all([
    ...expired.filter((item) => item.expires_at < now).map((item) => tx.store.delete(item.key)),
    tx.done,
  ])
}

// Clear all offline data
export async function clearOfflineData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('contacts'),
    db.clear('leads'),
    db.clear('deals'),
    db.clear('pendingActions'),
    db.clear('cache'),
  ])
}
