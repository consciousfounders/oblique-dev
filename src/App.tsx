import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { ThemeProvider } from '@/lib/hooks/useTheme'
import { GoogleApiProvider } from '@/lib/hooks/useGoogleApi'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/Login'
import { AuthCallback } from '@/pages/auth/Callback'

// Lazy load pages for better initial load performance
const DashboardPage = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.DashboardPage })))
const LeadsPage = lazy(() => import('@/pages/leads/Leads').then(m => ({ default: m.LeadsPage })))
const LeadDetailPage = lazy(() => import('@/pages/leads/LeadDetail').then(m => ({ default: m.LeadDetailPage })))
const ContactsPage = lazy(() => import('@/pages/contacts/Contacts').then(m => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() => import('@/pages/contacts/ContactDetail').then(m => ({ default: m.ContactDetailPage })))
const AccountsPage = lazy(() => import('@/pages/accounts/Accounts').then(m => ({ default: m.AccountsPage })))
const AccountDetailPage = lazy(() => import('@/pages/accounts/AccountDetail').then(m => ({ default: m.AccountDetailPage })))
const DealsPage = lazy(() => import('@/pages/deals/Deals').then(m => ({ default: m.DealsPage })))
const DealDetailPage = lazy(() => import('@/pages/deals/DealDetail').then(m => ({ default: m.DealDetailPage })))
const EmailPage = lazy(() => import('@/pages/email/Email').then(m => ({ default: m.EmailPage })))
const CalendarPage = lazy(() => import('@/pages/calendar/Calendar').then(m => ({ default: m.CalendarPage })))
const DrivePage = lazy(() => import('@/pages/drive/Drive').then(m => ({ default: m.DrivePage })))
const BookingPage = lazy(() => import('@/pages/booking/Booking').then(m => ({ default: m.BookingPage })))
const SuperAdminPage = lazy(() => import('@/pages/super-admin/SuperAdmin').then(m => ({ default: m.SuperAdminPage })))
const SettingsPage = lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.SettingsPage })))
const DeveloperPage = lazy(() => import('@/pages/developer/Developer').then(m => ({ default: m.DeveloperPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
      <GoogleApiProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
            <Route path="/leads" element={<Suspense fallback={<PageLoader />}><LeadsPage /></Suspense>} />
            <Route path="/leads/:id" element={<Suspense fallback={<PageLoader />}><LeadDetailPage /></Suspense>} />
            <Route path="/contacts" element={<Suspense fallback={<PageLoader />}><ContactsPage /></Suspense>} />
            <Route path="/contacts/:id" element={<Suspense fallback={<PageLoader />}><ContactDetailPage /></Suspense>} />
            <Route path="/accounts" element={<Suspense fallback={<PageLoader />}><AccountsPage /></Suspense>} />
            <Route path="/accounts/:id" element={<Suspense fallback={<PageLoader />}><AccountDetailPage /></Suspense>} />
            <Route path="/deals" element={<Suspense fallback={<PageLoader />}><DealsPage /></Suspense>} />
            <Route path="/deals/:id" element={<Suspense fallback={<PageLoader />}><DealDetailPage /></Suspense>} />
            <Route path="/email" element={<Suspense fallback={<PageLoader />}><EmailPage /></Suspense>} />
            <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
            <Route path="/drive" element={<Suspense fallback={<PageLoader />}><DrivePage /></Suspense>} />
            <Route path="/booking" element={<Suspense fallback={<PageLoader />}><BookingPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="/developer" element={<Suspense fallback={<PageLoader />}><DeveloperPage /></Suspense>} />
            <Route path="/super-admin" element={<Suspense fallback={<PageLoader />}><SuperAdminPage /></Suspense>} />
          </Route>
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-background text-foreground border-border',
          }}
          richColors
          closeButton
        />
      </GoogleApiProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
