import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BookingWidget, useBookingModal } from '@/components/modules/BookingWidget'
import { Calendar, Clock, ExternalLink, Settings, Link as LinkIcon, Copy, Check } from 'lucide-react'

export function BookingPage() {
  const [calLink, setCalLink] = useState('')
  const [savedLink, setSavedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { openBooking } = useBookingModal()

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
      // Clean up the link - extract just the username/event-type
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

        {/* Self-hosted option */}
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

  // Configured - show booking widget
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Booking</h1>
          <p className="text-muted-foreground">Manage your scheduling</p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('oblique_cal_link')
              setSavedLink(null)
            }}
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 h-[calc(100vh-200px)]">
          <BookingWidget calLink={savedLink} theme="auto" />
        </CardContent>
      </Card>
    </div>
  )
}
