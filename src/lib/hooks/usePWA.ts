import { useState, useEffect, useCallback } from 'react'
import {
  initServiceWorker,
  updateServiceWorker,
  isServiceWorkerSupported,
  requestPersistentStorage,
  getStorageEstimate,
} from '@/lib/pwa/service-worker-registration'

interface PWAState {
  isOnline: boolean
  isUpdateAvailable: boolean
  isOfflineReady: boolean
  isInstallable: boolean
  isPersisted: boolean
  storageUsage: { usage: number; quota: number } | null
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isUpdateAvailable: false,
    isOfflineReady: false,
    isInstallable: false,
    isPersisted: false,
    storageUsage: null,
  })

  useEffect(() => {
    if (!isServiceWorkerSupported()) return

    // Initialize service worker
    initServiceWorker({
      onNeedRefresh() {
        setState((prev) => ({ ...prev, isUpdateAvailable: true }))
      },
      onOfflineReady() {
        setState((prev) => ({ ...prev, isOfflineReady: true }))
      },
    })

    // Check persistent storage
    requestPersistentStorage().then((isPersisted) => {
      setState((prev) => ({ ...prev, isPersisted }))
    })

    // Check storage usage
    getStorageEstimate().then((storageUsage) => {
      setState((prev) => ({ ...prev, storageUsage }))
    })

    // Handle online/offline events
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }))
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setState((prev) => ({ ...prev, isInstallable: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if app is already installed
    const handleAppInstalled = () => {
      deferredPrompt = null
      setState((prev) => ({ ...prev, isInstallable: false }))
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const applyUpdate = useCallback(async () => {
    await updateServiceWorker(true)
  }, [])

  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      deferredPrompt = null
      setState((prev) => ({ ...prev, isInstallable: false }))
      return true
    }

    return false
  }, [])

  return {
    ...state,
    applyUpdate,
    installApp,
  }
}
