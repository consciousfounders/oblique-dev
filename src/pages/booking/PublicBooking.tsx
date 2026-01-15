import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { BookingWidget } from '@/components/modules/BookingWidget'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, ArrowLeft } from 'lucide-react'

interface BookingLinkData {
  id: string
  name: string
  description: string | null
  cal_event_type: string
  user_id: string
  default_name: string | null
  default_email: string | null
  is_active: boolean
}

export function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [bookingLink, setBookingLink] = useState<BookingLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBookingLink() {
      if (!slug) {
        setError('Invalid booking link')
        setLoading(false)
        return
      }

      try {
        // Fetch the booking link by slug (public access - no tenant filter for public pages)
        const { data, error: fetchError } = await supabase
          .from('booking_links')
          .select('id, name, description, cal_event_type, user_id, default_name, default_email, is_active')
          .eq('slug', slug)
          .eq('is_active', true)
          .single()

        if (fetchError || !data) {
          setError('Booking link not found or inactive')
          setLoading(false)
          return
        }

        setBookingLink(data)
      } catch (err) {
        console.error('Error fetching booking link:', err)
        setError('Failed to load booking page')
      } finally {
        setLoading(false)
      }
    }

    fetchBookingLink()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !bookingLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-muted-foreground mb-6">
              {error || 'This booking link is no longer available.'}
            </p>
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{bookingLink.name}</h1>
              {bookingLink.description && (
                <p className="text-sm text-muted-foreground">{bookingLink.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Booking Widget */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-0 h-[600px]">
            <BookingWidget
              calLink={bookingLink.cal_event_type}
              name={bookingLink.default_name || undefined}
              email={bookingLink.default_email || undefined}
              theme="auto"
              layout="month_view"
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by{' '}
          <a
            href="https://cal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Cal.com
          </a>
          {' '}&{' '}
          <span className="font-medium">Oblique CRM</span>
        </p>
      </main>
    </div>
  )
}
