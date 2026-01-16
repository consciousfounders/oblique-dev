import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/hooks/useAuth'
import { ThemeProvider } from '@/lib/hooks/useTheme'
import { GoogleApiProvider } from '@/lib/hooks/useGoogleApi'
import { QueryProvider } from '@/lib/hooks/useQueryClient'
import { PermissionsProvider } from '@/lib/hooks/usePermissions'
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
const PipelinesPage = lazy(() => import('@/pages/pipelines/Pipelines').then(m => ({ default: m.PipelinesPage })))
const EmailPage = lazy(() => import('@/pages/email/Email').then(m => ({ default: m.EmailPage })))
const CalendarPage = lazy(() => import('@/pages/calendar/Calendar').then(m => ({ default: m.CalendarPage })))
const DrivePage = lazy(() => import('@/pages/drive/Drive').then(m => ({ default: m.DrivePage })))
const BookingPage = lazy(() => import('@/pages/booking/Booking').then(m => ({ default: m.BookingPage })))
const SuperAdminPage = lazy(() => import('@/pages/super-admin/SuperAdmin').then(m => ({ default: m.SuperAdminPage })))
const SettingsPage = lazy(() => import('@/pages/settings/Settings').then(m => ({ default: m.SettingsPage })))
const NotificationSettingsPage = lazy(() => import('@/pages/settings/NotificationSettings').then(m => ({ default: m.NotificationSettingsPage })))
const EnrichmentSettingsPage = lazy(() => import('@/pages/settings/EnrichmentSettings').then(m => ({ default: m.EnrichmentSettingsPage })))
const CustomFieldSettingsPage = lazy(() => import('@/pages/settings/CustomFieldSettings').then(m => ({ default: m.CustomFieldSettingsPage })))
const UserManagementPage = lazy(() => import('@/pages/settings/UserManagement').then(m => ({ default: m.UserManagementPage })))
const PipelineSettingsPage = lazy(() => import('@/pages/settings/PipelineSettings').then(m => ({ default: m.PipelineSettings })))
const DeveloperPage = lazy(() => import('@/pages/developer/Developer').then(m => ({ default: m.DeveloperPage })))
const ActivityPage = lazy(() => import('@/pages/activity/Activity').then(m => ({ default: m.ActivityPage })))
const TasksPage = lazy(() => import('@/pages/tasks/Tasks').then(m => ({ default: m.TasksPage })))
const LinkedInPage = lazy(() => import('@/pages/linkedin/LinkedIn').then(m => ({ default: m.LinkedInPage })))
const PublicBookingPage = lazy(() => import('@/pages/booking/PublicBooking').then(m => ({ default: m.PublicBookingPage })))
const DataManagementPage = lazy(() => import('@/pages/data-management/DataManagement').then(m => ({ default: m.DataManagementPage })))
const TeamsPage = lazy(() => import('@/pages/teams/Teams').then(m => ({ default: m.TeamsPage })))
const TerritoriesPage = lazy(() => import('@/pages/territories/Territories').then(m => ({ default: m.TerritoriesPage })))
const AssignmentRulesPage = lazy(() => import('@/pages/assignment-rules/AssignmentRules').then(m => ({ default: m.AssignmentRulesPage })))
const FormsPage = lazy(() => import('@/pages/forms/Forms').then(m => ({ default: m.FormsPage })))
const FormBuilderPage = lazy(() => import('@/pages/forms/FormBuilder').then(m => ({ default: m.FormBuilderPage })))
const FormAnalyticsPage = lazy(() => import('@/pages/forms/FormAnalytics').then(m => ({ default: m.FormAnalyticsPage })))
const FormEmbedPage = lazy(() => import('@/pages/forms/FormEmbed').then(m => ({ default: m.FormEmbedPage })))
const PublicFormPage = lazy(() => import('@/pages/forms/PublicForm').then(m => ({ default: m.PublicFormPage })))
const CampaignsPage = lazy(() => import('@/pages/campaigns/Campaigns').then(m => ({ default: m.CampaignsPage })))
const CampaignDetailPage = lazy(() => import('@/pages/campaigns/CampaignDetail').then(m => ({ default: m.CampaignDetailPage })))
const ProductsPage = lazy(() => import('@/pages/products/Products').then(m => ({ default: m.ProductsPage })))
const ProductDetailPage = lazy(() => import('@/pages/products/ProductDetail').then(m => ({ default: m.ProductDetailPage })))
const PriceBooksPage = lazy(() => import('@/pages/price-books/PriceBooks').then(m => ({ default: m.PriceBooksPage })))
const PriceBookDetailPage = lazy(() => import('@/pages/price-books/PriceBookDetail').then(m => ({ default: m.PriceBookDetailPage })))
const QuotesPage = lazy(() => import('@/pages/quotes/Quotes').then(m => ({ default: m.QuotesPage })))
const QuoteDetailPage = lazy(() => import('@/pages/quotes/QuoteDetail').then(m => ({ default: m.QuoteDetailPage })))
const ForecastingPage = lazy(() => import('@/pages/forecasting/Forecasting').then(m => ({ default: m.ForecastingPage })))

// Reports and Dashboards
const ReportsPage = lazy(() => import('@/pages/reports/Reports'))
const ReportBuilderPage = lazy(() => import('@/pages/reports/ReportBuilderPage'))
const ReportViewerPage = lazy(() => import('@/pages/reports/ReportViewerPage'))
const DashboardsPage = lazy(() => import('@/pages/dashboards/Dashboards'))
const DashboardViewerPage = lazy(() => import('@/pages/dashboards/DashboardViewerPage'))

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
      <QueryProvider>
      <ThemeProvider>
      <AuthProvider>
      <PermissionsProvider>
      <GoogleApiProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/book/:slug" element={<Suspense fallback={<PageLoader />}><PublicBookingPage /></Suspense>} />
          <Route path="/f/:slug/*" element={<Suspense fallback={<PageLoader />}><PublicFormPage /></Suspense>} />

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
            <Route path="/pipelines" element={<Suspense fallback={<PageLoader />}><PipelinesPage /></Suspense>} />
            <Route path="/email" element={<Suspense fallback={<PageLoader />}><EmailPage /></Suspense>} />
            <Route path="/calendar" element={<Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>} />
            <Route path="/drive" element={<Suspense fallback={<PageLoader />}><DrivePage /></Suspense>} />
            <Route path="/booking" element={<Suspense fallback={<PageLoader />}><BookingPage /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>} />
            <Route path="/settings/notifications" element={<Suspense fallback={<PageLoader />}><NotificationSettingsPage /></Suspense>} />
            <Route path="/settings/enrichment" element={<Suspense fallback={<PageLoader />}><EnrichmentSettingsPage /></Suspense>} />
            <Route path="/settings/custom-fields" element={<Suspense fallback={<PageLoader />}><CustomFieldSettingsPage /></Suspense>} />
            <Route path="/settings/users" element={<Suspense fallback={<PageLoader />}><UserManagementPage /></Suspense>} />
            <Route path="/settings/pipelines" element={<Suspense fallback={<PageLoader />}><PipelineSettingsPage /></Suspense>} />
            <Route path="/developer" element={<Suspense fallback={<PageLoader />}><DeveloperPage /></Suspense>} />
            <Route path="/super-admin" element={<Suspense fallback={<PageLoader />}><SuperAdminPage /></Suspense>} />
            <Route path="/activity" element={<Suspense fallback={<PageLoader />}><ActivityPage /></Suspense>} />
            <Route path="/tasks" element={<Suspense fallback={<PageLoader />}><TasksPage /></Suspense>} />
            <Route path="/linkedin" element={<Suspense fallback={<PageLoader />}><LinkedInPage /></Suspense>} />
            <Route path="/data-management" element={<Suspense fallback={<PageLoader />}><DataManagementPage /></Suspense>} />
            <Route path="/teams" element={<Suspense fallback={<PageLoader />}><TeamsPage /></Suspense>} />
            <Route path="/territories" element={<Suspense fallback={<PageLoader />}><TerritoriesPage /></Suspense>} />
            <Route path="/assignment-rules" element={<Suspense fallback={<PageLoader />}><AssignmentRulesPage /></Suspense>} />
            <Route path="/forms" element={<Suspense fallback={<PageLoader />}><FormsPage /></Suspense>} />
            <Route path="/forms/:id" element={<Suspense fallback={<PageLoader />}><FormBuilderPage /></Suspense>} />
            <Route path="/forms/:id/analytics" element={<Suspense fallback={<PageLoader />}><FormAnalyticsPage /></Suspense>} />
            <Route path="/forms/:id/embed" element={<Suspense fallback={<PageLoader />}><FormEmbedPage /></Suspense>} />
            <Route path="/campaigns" element={<Suspense fallback={<PageLoader />}><CampaignsPage /></Suspense>} />
            <Route path="/campaigns/:id" element={<Suspense fallback={<PageLoader />}><CampaignDetailPage /></Suspense>} />
            <Route path="/products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
            <Route path="/products/:id" element={<Suspense fallback={<PageLoader />}><ProductDetailPage /></Suspense>} />
            <Route path="/price-books" element={<Suspense fallback={<PageLoader />}><PriceBooksPage /></Suspense>} />
            <Route path="/price-books/:id" element={<Suspense fallback={<PageLoader />}><PriceBookDetailPage /></Suspense>} />
            <Route path="/quotes" element={<Suspense fallback={<PageLoader />}><QuotesPage /></Suspense>} />
            <Route path="/quotes/:id" element={<Suspense fallback={<PageLoader />}><QuoteDetailPage /></Suspense>} />
            <Route path="/forecasting" element={<Suspense fallback={<PageLoader />}><ForecastingPage /></Suspense>} />

            {/* Reports */}
            <Route path="/reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />
            <Route path="/reports/builder" element={<Suspense fallback={<PageLoader />}><ReportBuilderPage /></Suspense>} />
            <Route path="/reports/builder/:id" element={<Suspense fallback={<PageLoader />}><ReportBuilderPage /></Suspense>} />
            <Route path="/reports/:id" element={<Suspense fallback={<PageLoader />}><ReportViewerPage /></Suspense>} />

            {/* Dashboards */}
            <Route path="/dashboards" element={<Suspense fallback={<PageLoader />}><DashboardsPage /></Suspense>} />
            <Route path="/dashboards/:id" element={<Suspense fallback={<PageLoader />}><DashboardViewerPage /></Suspense>} />
            <Route path="/dashboards/:id/edit" element={<Suspense fallback={<PageLoader />}><DashboardViewerPage /></Suspense>} />
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
      </PermissionsProvider>
      </AuthProvider>
      </ThemeProvider>
      </QueryProvider>
    </BrowserRouter>
  )
}

export default App
