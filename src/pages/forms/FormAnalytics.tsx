import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { WebForm, WebFormSubmission } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft,
  Eye,
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

interface AnalyticsData {
  totalViews: number
  totalSubmissions: number
  conversionRate: number
  viewsByDay: { date: string; count: number }[]
  submissionsByDay: { date: string; count: number }[]
  topSources: { source: string; count: number }[]
  recentSubmissions: WebFormSubmission[]
  spamCount: number
  conversionErrors: number
}

export function FormAnalyticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<WebForm | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState(30) // days

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    }
  }, [id, user?.tenantId, dateRange])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch form details
      const { data: formData, error: formError } = await supabase
        .from('web_forms')
        .select('*')
        .eq('id', id)
        .single()

      if (formError) throw formError
      setForm(formData)

      const startDate = startOfDay(subDays(new Date(), dateRange)).toISOString()
      const endDate = endOfDay(new Date()).toISOString()

      // Fetch views
      const { data: viewsData, error: viewsError } = await supabase
        .from('web_form_views')
        .select('created_at, utm_source')
        .eq('form_id', id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (viewsError) throw viewsError

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('web_form_submissions')
        .select('*')
        .eq('form_id', id)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })

      if (submissionsError) throw submissionsError

      // Process analytics
      const views = viewsData || []
      const submissions = submissionsData || []

      // Views by day
      const viewsByDayMap = new Map<string, number>()
      views.forEach(v => {
        const date = format(new Date(v.created_at), 'yyyy-MM-dd')
        viewsByDayMap.set(date, (viewsByDayMap.get(date) || 0) + 1)
      })

      // Submissions by day
      const submissionsByDayMap = new Map<string, number>()
      submissions.forEach(s => {
        const date = format(new Date(s.created_at), 'yyyy-MM-dd')
        submissionsByDayMap.set(date, (submissionsByDayMap.get(date) || 0) + 1)
      })

      // Top sources
      const sourcesMap = new Map<string, number>()
      views.forEach(v => {
        const source = v.utm_source || 'Direct'
        sourcesMap.set(source, (sourcesMap.get(source) || 0) + 1)
      })

      // Generate date range array
      const dates: string[] = []
      for (let i = dateRange; i >= 0; i--) {
        dates.push(format(subDays(new Date(), i), 'yyyy-MM-dd'))
      }

      const analyticsData: AnalyticsData = {
        totalViews: views.length,
        totalSubmissions: submissions.length,
        conversionRate: views.length > 0 ? (submissions.length / views.length) * 100 : 0,
        viewsByDay: dates.map(date => ({
          date,
          count: viewsByDayMap.get(date) || 0,
        })),
        submissionsByDay: dates.map(date => ({
          date,
          count: submissionsByDayMap.get(date) || 0,
        })),
        topSources: Array.from(sourcesMap.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        recentSubmissions: submissions.slice(0, 10),
        spamCount: submissions.filter(s => s.is_spam).length,
        conversionErrors: submissions.filter(s => s.conversion_error).length,
      }

      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!form || !analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    )
  }

  const maxViews = Math.max(...analytics.viewsByDay.map(d => d.count), 1)
  const maxSubmissions = Math.max(...analytics.submissionsByDay.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/forms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{form.name}</h1>
            <p className="text-muted-foreground">Analytics & Performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(parseInt(e.target.value))}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSubmissions.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spam Blocked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.spamCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Views Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Views Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {analytics.viewsByDay.slice(-30).map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-blue-500 rounded-t min-h-[2px] hover:bg-blue-600 transition-colors"
                  style={{ height: `${(day.count / maxViews) * 100}%` }}
                  title={`${format(new Date(day.date), 'MMM d')}: ${day.count} views`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{format(new Date(analytics.viewsByDay[0]?.date), 'MMM d')}</span>
              <span>{format(new Date(analytics.viewsByDay[analytics.viewsByDay.length - 1]?.date), 'MMM d')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Submissions Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {analytics.submissionsByDay.slice(-30).map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-green-500 rounded-t min-h-[2px] hover:bg-green-600 transition-colors"
                  style={{ height: `${(day.count / maxSubmissions) * 100}%` }}
                  title={`${format(new Date(day.date), 'MMM d')}: ${day.count} submissions`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{format(new Date(analytics.submissionsByDay[0]?.date), 'MMM d')}</span>
              <span>{format(new Date(analytics.submissionsByDay[analytics.submissionsByDay.length - 1]?.date), 'MMM d')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Sources & Recent Submissions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Traffic Sources</CardTitle>
            <CardDescription>Where your visitors are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topSources.length === 0 ? (
              <p className="text-muted-foreground text-sm">No traffic data yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.topSources.map((source, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{source.source}</span>
                        <span className="text-muted-foreground">{source.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(source.count / analytics.totalViews) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentSubmissions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No submissions yet</p>
            ) : (
              <div className="space-y-3">
                {analytics.recentSubmissions.map((submission) => {
                  const data = submission.submission_data as Record<string, string>
                  const email = data.email || data.Email || 'Unknown'
                  const name = data.first_name || data.name || data.Name || ''

                  return (
                    <div
                      key={submission.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {submission.is_spam ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : submission.converted_to_lead ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{name || email}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(submission.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                      {submission.is_spam && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200">
                          Spam
                        </span>
                      )}
                      {submission.conversion_error && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded dark:bg-yellow-900 dark:text-yellow-200">
                          Error
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
