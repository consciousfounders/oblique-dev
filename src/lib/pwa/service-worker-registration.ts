import { registerSW } from 'virtual:pwa-register'

export interface PWAUpdateCallbacks {
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: Error) => void
}

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined

export function initServiceWorker(callbacks: PWAUpdateCallbacks = {}): void {
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      callbacks.onNeedRefresh?.()
    },
    onOfflineReady() {
      callbacks.onOfflineReady?.()
    },
    onRegistered(registration) {
      callbacks.onRegistered?.(registration)

      // Check for updates periodically
      if (registration) {
        setInterval(
          () => {
            registration.update()
          },
          60 * 60 * 1000
        ) // Check every hour
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error)
      callbacks.onRegisterError?.(error)
    },
  })
}

export function updateServiceWorker(reloadPage = true): Promise<void> {
  if (updateSW) {
    return updateSW(reloadPage)
  }
  return Promise.resolve()
}

export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  if (!isServiceWorkerSupported()) return undefined
  return navigator.serviceWorker.ready
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist()
    return isPersisted
  }
  return false
}

// Check storage usage
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    }
  }
  return null
}
