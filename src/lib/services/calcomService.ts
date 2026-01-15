// Cal.com Integration Service
// Handles Cal.com webhook events and booking synchronization

import { supabase } from '@/lib/supabase'

// Cal.com webhook event types
export type CalcomWebhookEvent =
  | 'BOOKING_CREATED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_COMPLETED'

// Cal.com webhook payload structure
export interface CalcomWebhookPayload {
  triggerEvent: CalcomWebhookEvent
  createdAt: string
  payload: {
    uid: string
    bookingId: number
    title: string
    description?: string
    startTime: string
    endTime: string
    timezone?: string
    status: string
    attendees: Array<{
      email: string
      name: string
      phone?: string
      timeZone?: string
    }>
    organizer: {
      email: string
      name: string
      timeZone: string
    }
    eventType?: {
      id: number
      slug: string
      title: string
      length: number
    }
    location?: string
    meetingUrl?: string
    metadata?: Record<string, unknown>
    rescheduleUid?: string
    cancelledReason?: string
  }
}

// Event type presets
export interface EventTypePreset {
  id: string
  name: string
  slug: string
  duration: number
  description: string
}

// Default event type presets (15min, 30min, 60min)
export const DEFAULT_EVENT_TYPES: EventTypePreset[] = [
  {
    id: '15min',
    name: '15 Minute Meeting',
    slug: '15min',
    duration: 15,
    description: 'A quick 15-minute call for brief discussions or follow-ups',
  },
  {
    id: '30min',
    name: '30 Minute Meeting',
    slug: '30min',
    duration: 30,
    description: 'A standard 30-minute meeting for most discussions',
  },
  {
    id: '60min',
    name: '60 Minute Meeting',
    slug: '60min',
    duration: 60,
    description: 'An hour-long session for in-depth discussions or demos',
  },
]

// Map Cal.com status to internal booking status
function mapCalcomStatus(
  event: CalcomWebhookEvent,
  status: string
): 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' {
  switch (event) {
    case 'BOOKING_CREATED':
      return status === 'ACCEPTED' ? 'confirmed' : 'pending'
    case 'BOOKING_CONFIRMED':
      return 'confirmed'
    case 'BOOKING_CANCELLED':
    case 'BOOKING_REJECTED':
      return 'cancelled'
    case 'BOOKING_RESCHEDULED':
      return 'rescheduled'
    case 'BOOKING_COMPLETED':
      return 'completed'
    default:
      return 'pending'
  }
}

// Parse location type from Cal.com location string
function parseLocationType(location?: string): { type: string; value: string } {
  if (!location) return { type: 'video', value: '' }

  const locationLower = location.toLowerCase()
  if (locationLower.includes('zoom')) return { type: 'video', value: 'Zoom' }
  if (locationLower.includes('meet')) return { type: 'video', value: 'Google Meet' }
  if (locationLower.includes('teams')) return { type: 'video', value: 'Microsoft Teams' }
  if (locationLower.includes('phone') || locationLower.includes('call')) return { type: 'phone', value: location }
  if (locationLower.includes('in person') || locationLower.includes('office')) return { type: 'in_person', value: location }

  return { type: 'other', value: location }
}

export class CalcomService {
  /**
   * Process incoming webhook from Cal.com
   */
  async processWebhook(
    payload: CalcomWebhookPayload,
    tenantId: string,
    userId: string
  ): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    try {
      const { triggerEvent, payload: data } = payload
      const attendee = data.attendees[0]
      const { type: locationType, value: locationValue } = parseLocationType(data.location)

      switch (triggerEvent) {
        case 'BOOKING_CREATED':
        case 'BOOKING_CONFIRMED': {
          // Check if booking already exists (by cal_booking_uid)
          const { data: existingBooking } = await supabase
            .from('bookings')
            .select('id')
            .eq('cal_booking_uid', data.uid)
            .single()

          if (existingBooking) {
            // Update existing booking
            const { error: updateError } = await supabase
              .from('bookings')
              .update({
                status: mapCalcomStatus(triggerEvent, data.status),
                title: data.title,
                description: data.description || null,
                start_time: data.startTime,
                end_time: data.endTime,
                timezone: data.timezone || attendee?.timeZone || 'UTC',
                meeting_url: data.meetingUrl || null,
              })
              .eq('id', existingBooking.id)

            if (updateError) throw updateError
            return { success: true, bookingId: existingBooking.id }
          }

          // Create new booking
          const { data: newBooking, error: insertError } = await supabase
            .from('bookings')
            .insert({
              tenant_id: tenantId,
              user_id: userId,
              cal_booking_id: String(data.bookingId),
              cal_booking_uid: data.uid,
              title: data.title,
              description: data.description || null,
              start_time: data.startTime,
              end_time: data.endTime,
              timezone: data.timezone || attendee?.timeZone || 'UTC',
              attendee_name: attendee?.name || null,
              attendee_email: attendee?.email || null,
              attendee_phone: attendee?.phone || null,
              event_type: data.eventType?.title || null,
              event_type_slug: data.eventType?.slug || null,
              location_type: locationType,
              location_value: locationValue,
              meeting_url: data.meetingUrl || null,
              status: mapCalcomStatus(triggerEvent, data.status),
              metadata: data.metadata || {},
            })
            .select('id')
            .single()

          if (insertError) throw insertError

          // Try to auto-link to existing contact by email
          if (attendee?.email && newBooking) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('email', attendee.email)
              .single()

            if (contact) {
              await supabase
                .from('bookings')
                .update({ contact_id: contact.id })
                .eq('id', newBooking.id)
            }
          }

          return { success: true, bookingId: newBooking?.id }
        }

        case 'BOOKING_CANCELLED':
        case 'BOOKING_REJECTED': {
          const { error: cancelError } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: data.cancelledReason || null,
            })
            .eq('cal_booking_uid', data.uid)
            .eq('tenant_id', tenantId)

          if (cancelError) throw cancelError
          return { success: true }
        }

        case 'BOOKING_RESCHEDULED': {
          // Mark old booking as rescheduled
          const { data: oldBooking } = await supabase
            .from('bookings')
            .select('id')
            .eq('cal_booking_uid', data.rescheduleUid)
            .eq('tenant_id', tenantId)
            .single()

          // Create new booking with link to old one
          const { data: newBooking, error: insertError } = await supabase
            .from('bookings')
            .insert({
              tenant_id: tenantId,
              user_id: userId,
              cal_booking_id: String(data.bookingId),
              cal_booking_uid: data.uid,
              title: data.title,
              description: data.description || null,
              start_time: data.startTime,
              end_time: data.endTime,
              timezone: data.timezone || attendee?.timeZone || 'UTC',
              attendee_name: attendee?.name || null,
              attendee_email: attendee?.email || null,
              attendee_phone: attendee?.phone || null,
              event_type: data.eventType?.title || null,
              event_type_slug: data.eventType?.slug || null,
              location_type: locationType,
              location_value: locationValue,
              meeting_url: data.meetingUrl || null,
              status: 'confirmed',
              rescheduled_from_id: oldBooking?.id || null,
              metadata: data.metadata || {},
            })
            .select('id')
            .single()

          if (insertError) throw insertError

          // Update old booking to point to new one
          if (oldBooking && newBooking) {
            await supabase
              .from('bookings')
              .update({
                status: 'rescheduled',
                rescheduled_to_id: newBooking.id,
              })
              .eq('id', oldBooking.id)
          }

          return { success: true, bookingId: newBooking?.id }
        }

        case 'BOOKING_COMPLETED': {
          const { error: completeError } = await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('cal_booking_uid', data.uid)
            .eq('tenant_id', tenantId)

          if (completeError) throw completeError
          return { success: true }
        }

        default:
          return { success: false, error: `Unknown event type: ${triggerEvent}` }
      }
    } catch (err) {
      console.error('Error processing Cal.com webhook:', err)
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error processing webhook',
      }
    }
  }

  /**
   * Verify webhook signature from Cal.com
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )

      const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      return signature === computedSignature
    } catch {
      return false
    }
  }

  /**
   * Generate Cal.com booking link with event type
   */
  generateBookingLink(
    calUsername: string,
    eventTypeSlug?: string,
    prefillData?: { name?: string; email?: string }
  ): string {
    let url = `https://cal.com/${calUsername}`
    if (eventTypeSlug) {
      url += `/${eventTypeSlug}`
    }

    const params = new URLSearchParams()
    if (prefillData?.name) params.set('name', prefillData.name)
    if (prefillData?.email) params.set('email', prefillData.email)

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    return url
  }

  /**
   * Generate embed configuration for Cal.com widget
   */
  getEmbedConfig(options: {
    theme?: 'light' | 'dark' | 'auto'
    brandColor?: string
    hideEventTypeDetails?: boolean
    layout?: 'month_view' | 'week_view' | 'column_view'
  }) {
    return {
      theme: options.theme || 'auto',
      styles: {
        branding: {
          brandColor: options.brandColor || '#0ea5e9', // Default to Oblique primary color
        },
      },
      hideEventTypeDetails: options.hideEventTypeDetails || false,
      layout: options.layout || 'month_view',
    }
  }
}

// Export singleton instance
export const calcomService = new CalcomService()
