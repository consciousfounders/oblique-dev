import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookingWidget, useBookingModal } from '@/components/modules/BookingWidget'
import { useBookings, useAvailability, useBookingLinks, type Booking, type AvailabilityRule, type BookingLink } from '@/lib/hooks/useBookings'
import {
  Calendar,
  Clock,
  ExternalLink,
  Settings,
  Link as LinkIcon,
  Copy,
  Check,
  User,
  Mail,
  Phone,
  Video,
  MapPin,
  X,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  CalendarDays,
  Share2,
  RefreshCw,
  Timer,
} from 'lucide-react'
import { DEFAULT_EVENT_TYPES, type EventTypePreset } from '@/lib/services/calcomService'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type TabType = 'bookings' | 'event-types' | 'availability' | 'links' | 'settings'

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  rescheduled: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export function BookingPage() {
  const [calLink, setCalLink] = useState('')
  const [savedLink, setSavedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('bookings')
  const { openBooking } = useBookingModal()

  // Hooks for data
  const { bookings, loading: bookingsLoading, cancelBooking, refresh: refreshBookings } = useBookings({
    status: ['pending', 'confirmed'],
    upcoming: true,
  })
  const { rules, loading: rulesLoading, addRule, updateRule, deleteRule } = useAvailability()
  const { links, loading: linksLoading, addLink, updateLink, deleteLink } = useBookingLinks()

  // Modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null)
  const [newRule, setNewRule] = useState({
    name: '',
    day_of_week: null as number | null,
    start_time: '09:00',
    end_time: '17:00',
  })

  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<BookingLink | null>(null)
  const [newLink, setNewLink] = useState({
    name: '',
    slug: '',
    description: '',
    cal_event_type: '',
  })

  // Load saved Cal.com link from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('oblique_cal_link')
    if (saved) {
      setSavedLink(saved)
      setCalLink(saved)
    }
  }, [])

  function handleSaveLink() {
    if (calLink.trim()) {
      let cleanLink = calLink.trim()
      if (cleanLink.includes('cal.com/')) {
        cleanLink = cleanLink.split('cal.com/')[1]
      }
      if (cleanLink.startsWith('/')) {
        cleanLink = cleanLink.substring(1)
      }
      localStorage.setItem('oblique_cal_link', cleanLink)
      setSavedLink(cleanLink)
    }
  }

  function handleCopyLink() {
    if (savedLink) {
      navigator.clipboard.writeText(`https://cal.com/${savedLink}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleTestBooking() {
    if (savedLink) {
      openBooking(savedLink)
    }
  }

  async function handleCancelBooking() {
    if (cancellingBooking) {
      await cancelBooking(cancellingBooking.id, cancelReason)
      setCancelModalOpen(false)
      setCancellingBooking(null)
      setCancelReason('')
    }
  }

  async function handleSaveAvailability() {
    if (editingRule) {
      await updateRule(editingRule.id, {
        name: newRule.name,
        day_of_week: newRule.day_of_week,
        start_time: newRule.start_time,
        end_time: newRule.end_time,
      })
    } else {
      await addRule({
        name: newRule.name || 'Working Hours',
        day_of_week: newRule.day_of_week,
        start_time: newRule.start_time,
        end_time: newRule.end_time,
      })
    }
    setAvailabilityModalOpen(false)
    setEditingRule(null)
    setNewRule({ name: '', day_of_week: null, start_time: '09:00', end_time: '17:00' })
  }

  async function handleSaveBookingLink() {
    if (!newLink.name || !newLink.slug || !savedLink) return

    if (editingLink) {
      await updateLink(editingLink.id, {
        name: newLink.name,
        slug: newLink.slug,
        description: newLink.description || null,
        cal_event_type: newLink.cal_event_type || savedLink,
      })
    } else {
      await addLink({
        name: newLink.name,
        slug: newLink.slug,
        description: newLink.description || null,
        cal_event_type: newLink.cal_event_type || savedLink,
      })
    }
    setLinkModalOpen(false)
    setEditingLink(null)
    setNewLink({ name: '', slug: '', description: '', cal_event_type: '' })
  }

  function copyBookingLinkUrl(slug: string) {
    const baseUrl = window.location.origin
    navigator.clipboard.writeText(`${baseUrl}/book/${slug}`)
  }

  function formatDateTime(dateStr: string) {
    const date = new Date(dateStr)
    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    }
  }

  function formatDuration(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.round(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Not configured yet - show setup instructions
  if (!savedLink) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Booking</h1>
          <p className="text-muted-foreground">Set up scheduling with Cal.com</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Connect Cal.com
            </CardTitle>
            <CardDescription>
              Cal.com is an open-source scheduling platform that syncs with your Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Create a Cal.com account</p>
                  <p className="text-sm text-muted-foreground">
                    Sign up at cal.com and connect your Google Calendar
                  </p>
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer">
                      Sign up for Cal.com
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Create event types</p>
                  <p className="text-sm text-muted-foreground">
                    Set up different meeting types (30 min call, discovery, demo, etc.)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div className="space-y-1">
                  <p className="font-medium">Enter your booking link</p>
                  <p className="text-sm text-muted-foreground">
                    Paste your Cal.com username or full link below
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="your-username or cal.com/your-username"
                  value={calLink}
                  onChange={(e) => setCalLink(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSaveLink} disabled={!calLink.trim()}>
                Connect
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Self-Hosted Option
            </CardTitle>
            <CardDescription>
              For more control, you can self-host Cal.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cal.com is open source and can be self-hosted on your own infrastructure.
              This gives you full control over your data and branding.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://cal.com/docs/introduction/quick-start/self-hosting"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Self-hosting docs
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://railway.app/template/cal-com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Deploy on Railway
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Configured - show full booking management interface
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Booking</h1>
          <p className="text-muted-foreground">Manage your scheduling and availability</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleTestBooking}>
            <Clock className="w-4 h-4 mr-2" />
            Test Booking
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { id: 'bookings' as const, label: 'Upcoming Bookings', icon: CalendarDays },
          { id: 'event-types' as const, label: 'Event Types', icon: Timer },
          { id: 'availability' as const, label: 'Availability', icon: Clock },
          { id: 'links' as const, label: 'Booking Links', icon: Share2 },
          { id: 'settings' as const, label: 'Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
            <Button variant="ghost" size="sm" onClick={refreshBookings}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {bookingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No upcoming bookings</h3>
                <p className="text-muted-foreground mt-1">
                  Your upcoming bookings will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bookings.map((booking) => {
                const { date, time } = formatDateTime(booking.start_time)
                const duration = formatDuration(booking.start_time, booking.end_time)
                return (
                  <Card key={booking.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="text-center min-w-[60px]">
                            <div className="text-xs text-muted-foreground uppercase">
                              {date.split(' ')[0]}
                            </div>
                            <div className="text-2xl font-bold">
                              {date.split(' ')[2]}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {date.split(' ')[1]}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold">{booking.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {time} ({duration})
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm">
                              {booking.attendee_name && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <User className="w-3 h-3" />
                                  {booking.attendee_name}
                                </div>
                              )}
                              {booking.attendee_email && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  {booking.attendee_email}
                                </div>
                              )}
                              {booking.attendee_phone && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {booking.attendee_phone}
                                </div>
                              )}
                              {booking.location_type && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  {booking.location_type === 'video' ? (
                                    <Video className="w-3 h-3" />
                                  ) : (
                                    <MapPin className="w-3 h-3" />
                                  )}
                                  {booking.location_value || booking.location_type}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusColors[booking.status])}>
                            {booking.status}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {booking.meeting_url && (
                                <DropdownMenuItem asChild>
                                  <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer">
                                    <Video className="w-4 h-4 mr-2" />
                                    Join Meeting
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  if (savedLink) {
                                    window.open(`https://cal.com/${savedLink}?rescheduleUid=${booking.cal_booking_uid}`, '_blank')
                                  }
                                }}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reschedule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setCancellingBooking(booking)
                                  setCancelModalOpen(true)
                                }}
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel Booking
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'event-types' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event Types</h2>
            <Button variant="outline" size="sm" asChild>
              <a href="https://cal.com/event-types" target="_blank" rel="noopener noreferrer">
                Manage in Cal.com
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Event types define the different meeting durations you offer. Create these in Cal.com,
                then use the slugs below to create booking links in your CRM.
              </p>
            </CardContent>
          </Card>

          <h3 className="text-sm font-medium text-muted-foreground">Recommended Event Types</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {DEFAULT_EVENT_TYPES.map((eventType: EventTypePreset) => (
              <Card key={eventType.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Timer className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-2xl font-bold text-primary">{eventType.duration}m</span>
                  </div>
                  <h4 className="font-semibold mb-1">{eventType.name}</h4>
                  <p className="text-sm text-muted-foreground mb-3">{eventType.description}</p>
                  <div className="flex items-center justify-between">
                    <code className="text-xs bg-muted px-2 py-1 rounded">{savedLink}/{eventType.slug}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${savedLink}/${eventType.slug}`)
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-dashed">
            <CardContent className="p-4 text-center">
              <Timer className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <h4 className="font-medium mb-1">Create Custom Event Types</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Need different durations or custom event types? Create them directly in Cal.com.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://cal.com/event-types/new" target="_blank" rel="noopener noreferrer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event Type
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'availability' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Availability Rules</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingRule(null)
                setNewRule({ name: '', day_of_week: null, start_time: '09:00', end_time: '17:00' })
                setAvailabilityModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Set your availability rules here. These rules are stored in your CRM and can be synced with Cal.com
                through webhooks. For real-time availability management, configure your schedules directly in Cal.com.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href="https://cal.com/availability" target="_blank" rel="noopener noreferrer">
                  Manage in Cal.com
                  <ExternalLink className="w-3 h-3 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          {rulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No availability rules</h3>
                <p className="text-muted-foreground mt-1">
                  Add rules to define your working hours
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        rule.is_active ? 'bg-green-500' : 'bg-gray-400'
                      )} />
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {rule.day_of_week !== null ? DAYS_OF_WEEK[rule.day_of_week] : 'Every day'} &bull;{' '}
                          {rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingRule(rule)
                          setNewRule({
                            name: rule.name,
                            day_of_week: rule.day_of_week,
                            start_time: rule.start_time.substring(0, 5),
                            end_time: rule.end_time.substring(0, 5),
                          })
                          setAvailabilityModalOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Shareable Booking Links</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingLink(null)
                setNewLink({ name: '', slug: '', description: '', cal_event_type: '' })
                setLinkModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Link
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Your Cal.com Link</div>
                  <div className="text-sm text-muted-foreground">
                    https://cal.com/{savedLink}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {linksLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : links.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Share2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No custom booking links</h3>
                <p className="text-muted-foreground mt-1">
                  Create custom links for different meeting types
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {links.map((link) => (
                <Card key={link.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{link.name}</div>
                        {!link.is_active && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">Inactive</span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {link.description || link.cal_event_type}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {link.view_count} views &bull; {link.booking_count} bookings
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyBookingLinkUrl(link.slug)}
                      >
                        <Copy className="w-3 h-3 mr-2" />
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingLink(link)
                          setNewLink({
                            name: link.name,
                            slug: link.slug,
                            description: link.description || '',
                            cal_event_type: link.cal_event_type,
                          })
                          setLinkModalOpen(true)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLink(link.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Booking Settings</h2>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cal.com Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Connected Cal.com Link</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={calLink}
                    onChange={(e) => setCalLink(e.target.value)}
                    placeholder="your-username"
                  />
                  <Button onClick={handleSaveLink}>Update</Button>
                </div>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  localStorage.removeItem('oblique_cal_link')
                  setSavedLink(null)
                }}
              >
                Disconnect Cal.com
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook Integration</CardTitle>
              <CardDescription>
                Set up webhooks to automatically sync booking data from Cal.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To receive booking notifications in your CRM, configure a webhook in Cal.com
                pointing to your CRM's webhook endpoint.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://cal.com/settings/developer/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Configure Webhooks
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendar Preview</CardTitle>
              <CardDescription>
                Preview your Cal.com calendar widget
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[500px]">
              <BookingWidget calLink={savedLink} theme="auto" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Booking Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {cancellingBooking && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium">{cancellingBooking.title}</div>
                <div className="text-sm text-muted-foreground">
                  {cancellingBooking.attendee_name} &bull;{' '}
                  {formatDateTime(cancellingBooking.start_time).date} at{' '}
                  {formatDateTime(cancellingBooking.start_time).time}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Reason for cancellation (optional)</label>
              <Input
                className="mt-1"
                placeholder="Enter a reason..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button variant="destructive" onClick={handleCancelBooking}>
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Rule Modal */}
      <Dialog open={availabilityModalOpen} onOpenChange={setAvailabilityModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Availability Rule' : 'Add Availability Rule'}</DialogTitle>
            <DialogDescription>
              Define when you're available for bookings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <Input
                className="mt-1"
                placeholder="e.g., Working Hours"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Day of Week</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newRule.day_of_week ?? ''}
                onChange={(e) => setNewRule({
                  ...newRule,
                  day_of_week: e.target.value === '' ? null : parseInt(e.target.value),
                })}
              >
                <option value="">Every day</option>
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Time</label>
                <Input
                  className="mt-1"
                  type="time"
                  value={newRule.start_time}
                  onChange={(e) => setNewRule({ ...newRule, start_time: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Time</label>
                <Input
                  className="mt-1"
                  type="time"
                  value={newRule.end_time}
                  onChange={(e) => setNewRule({ ...newRule, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvailabilityModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAvailability}>
              {editingRule ? 'Save Changes' : 'Add Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Booking Link Modal */}
      <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? 'Edit Booking Link' : 'Create Booking Link'}</DialogTitle>
            <DialogDescription>
              Create a custom shareable link for a specific meeting type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Link Name</label>
              <Input
                className="mt-1"
                placeholder="e.g., 30 Minute Discovery Call"
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">URL Slug</label>
              <Input
                className="mt-1"
                placeholder="e.g., discovery-call"
                value={newLink.slug}
                onChange={(e) => setNewLink({ ...newLink, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your link will be: {window.location.origin}/book/{newLink.slug || 'your-slug'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                className="mt-1"
                placeholder="Brief description of this meeting type"
                value={newLink.description}
                onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Cal.com Event Type</label>
              <Input
                className="mt-1"
                placeholder={savedLink || 'username/event-type'}
                value={newLink.cal_event_type}
                onChange={(e) => setNewLink({ ...newLink, cal_event_type: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use your default: {savedLink}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBookingLink}
              disabled={!newLink.name || !newLink.slug}
            >
              {editingLink ? 'Save Changes' : 'Create Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
