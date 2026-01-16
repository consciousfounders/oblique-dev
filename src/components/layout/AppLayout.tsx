import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { CommandPalette } from '@/components/search/CommandPalette'
import { CommandPaletteProvider, useCommandPalette } from '@/lib/hooks/useCommandPalette'
import { PWAInstallPrompt, PWAUpdatePrompt, OfflineIndicator } from '@/components/pwa'
import { MobileBottomNav, MobileFloatingActions, QuickContactSearch } from '@/components/mobile'
import { useMobileDetect } from '@/lib/hooks/useMobileDetect'

function AppLayoutContent() {
  const { user, loading } = useAuth()
  const { isOpen, close, open } = useCommandPalette()
  const { isMobile, isStandalone } = useMobileDetect()
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar onQuickSearch={() => setIsQuickSearchOpen(true)} />
      <main className="md:pl-64">
        <div className={`p-4 md:p-8 pt-16 md:pt-8 ${isMobile ? 'pb-24' : ''}`}>
          {/* Offline indicator for mobile */}
          {isMobile && (
            <div className="mb-4 md:hidden">
              <OfflineIndicator />
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette open={isOpen} onOpenChange={(o) => !o && close()} />

      {/* Mobile Navigation */}
      <MobileBottomNav onMenuClick={open} />
      <MobileFloatingActions />

      {/* Quick Contact Search (Mobile) */}
      <QuickContactSearch isOpen={isQuickSearchOpen} onClose={() => setIsQuickSearchOpen(false)} />

      {/* PWA Prompts */}
      <PWAUpdatePrompt />
      {!isStandalone && <PWAInstallPrompt />}
    </div>
  )
}

export function AppLayout() {
  return (
    <CommandPaletteProvider>
      <AppLayoutContent />
    </CommandPaletteProvider>
  )
}
