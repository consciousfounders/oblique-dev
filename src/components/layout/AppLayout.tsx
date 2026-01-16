import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { CommandPalette } from '@/components/search/CommandPalette'
import { CommandPaletteProvider, useCommandPalette } from '@/lib/hooks/useCommandPalette'

function AppLayoutContent() {
  const { user, loading } = useAuth()
  const { isOpen, close } = useCommandPalette()

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
      <Sidebar />
      <main className="md:pl-64">
        <div className="p-4 md:p-8 pt-16 md:pt-8">
          <Outlet />
        </div>
      </main>
      <CommandPalette open={isOpen} onOpenChange={(open) => !open && close()} />
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
