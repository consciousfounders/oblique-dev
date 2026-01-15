import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { ThemeProvider } from '@/lib/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/Login'
import { AuthCallback } from '@/pages/auth/Callback'
import { DashboardPage } from '@/pages/dashboard/Dashboard'
import { LeadsPage } from '@/pages/leads/Leads'
import { ContactsPage } from '@/pages/contacts/Contacts'
import { AccountsPage } from '@/pages/accounts/Accounts'
import { DealsPage } from '@/pages/deals/Deals'
import { SuperAdminPage } from '@/pages/super-admin/SuperAdmin'
import { SettingsPage } from '@/pages/settings/Settings'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/super-admin" element={<SuperAdminPage />} />
          </Route>
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
