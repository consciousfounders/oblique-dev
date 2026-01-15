import Cal, { getCalApi } from '@calcom/embed-react'
import { useEffect } from 'react'

interface BookingWidgetProps {
  calLink: string
  name?: string
  email?: string
  theme?: 'light' | 'dark' | 'auto'
  hideEventTypeDetails?: boolean
  layout?: 'month_view' | 'week_view' | 'column_view'
}

export function BookingWidget({
  calLink,
  name,
  email,
  theme = 'auto',
  hideEventTypeDetails = false,
  layout = 'month_view',
}: BookingWidgetProps) {
  useEffect(() => {
    ;(async function () {
      const cal = await getCalApi()
      cal('ui', {
        theme,
        styles: { branding: { brandColor: '#000000' } },
        hideEventTypeDetails,
        layout,
      })

      // Pre-fill guest info if provided
      if (name || email) {
        cal('preload', {
          calLink,
        })
      }
    })()
  }, [calLink, theme, hideEventTypeDetails, layout, name, email])

  const config: Record<string, string> = { theme, layout }
  if (name) config.name = name
  if (email) config.email = email

  return (
    <Cal
      calLink={calLink}
      style={{ width: '100%', height: '100%', overflow: 'scroll' }}
      config={config}
    />
  )
}

// Floating button trigger for inline booking
export function BookingButton({
  calLink,
  text = 'Book a Meeting',
}: {
  calLink: string
  text?: string
}) {
  useEffect(() => {
    ;(async function () {
      const cal = await getCalApi()
      cal('floatingButton', {
        calLink,
        buttonText: text,
        buttonColor: '#000000',
        buttonTextColor: '#ffffff',
      })
    })()
  }, [calLink, text])

  return null
}

// Modal trigger for popup booking
export function useBookingModal() {
  const openBooking = async (calLink: string, opts?: { name?: string; email?: string }) => {
    const cal = await getCalApi()
    const config: Record<string, string> = {}
    if (opts?.name) config.name = opts.name
    if (opts?.email) config.email = opts.email

    cal('modal', {
      calLink,
      config,
    })
  }

  return { openBooking }
}
