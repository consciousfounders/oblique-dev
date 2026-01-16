// Cal.com Webhook Handler - Supabase Edge Function
// Receives booking events from Cal.com and stores them in the CRM database

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cal-signature-256',
}

// Cal.com webhook event types
type CalcomWebhookEvent =
  | 'BOOKING_CREATED'
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_REJECTED'
  | 'BOOKING_COMPLETED'

// Cal.com webhook payload structure
interface CalcomWebhookPayload {
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

// Booking status type
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'

// Map Cal.com status to internal booking status
function mapCalcomStatus(event: CalcomWebhookEvent, status: string): BookingStatus {
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
  if (locationLower.includes('phone') || locationLower.includes('call'))
    return { type: 'phone', value: location }
  if (locationLower.includes('in person') || locationLower.includes('office'))
    return { type: 'in_person', value: location }

  return { type: 'other', value: location }
}

// Verify HMAC-SHA256 webhook signature
async function verifySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false

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

// Format booking time for display
function formatBookingTime(startTime: string, endTime: string, timezone: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || 'UTC',
  }
  const dateStr = start.toLocaleDateString('en-US', options)
  const endTimeStr = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone || 'UTC',
  })
  return `${dateStr} - ${endTimeStr}`
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get tenant and user from query params or headers
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenant_id')
    const userId = url.searchParams.get('user_id')
    const webhookSecret = url.searchParams.get('secret')

    if (!tenantId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing tenant_id or user_id parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get('x-cal-signature-256')

    // Verify signature if secret is provided
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Parse payload
    const payload: CalcomWebhookPayload = JSON.parse(rawBody)
    const { triggerEvent, payload: data } = payload
    const attendee = data.attendees[0]
    const { type: locationType, value: locationValue } = parseLocationType(data.location)

    console.log(`Processing ${triggerEvent} event for booking ${data.uid}`)

    let bookingId: string | undefined
    let contactId: string | undefined
    let activitySubject = ''
    let activityDescription = ''

    // Process based on event type
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_CONFIRMED': {
        // Check if booking already exists
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id, contact_id')
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
          bookingId = existingBooking.id
          contactId = existingBooking.contact_id

          activitySubject = `Meeting Confirmed: ${data.title}`
          activityDescription = `Meeting confirmed with ${attendee?.name || 'Guest'}\n${formatBookingTime(data.startTime, data.endTime, data.timezone || 'UTC')}`
        } else {
          // Try to find existing contact by email
          if (attendee?.email) {
            const { data: contact } = await supabase
              .from('contacts')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('email', attendee.email)
              .single()

            contactId = contact?.id
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
              contact_id: contactId || null,
              metadata: data.metadata || {},
            })
            .select('id')
            .single()

          if (insertError) throw insertError
          bookingId = newBooking?.id

          activitySubject = `Meeting Scheduled: ${data.title}`
          activityDescription = `New meeting scheduled with ${attendee?.name || 'Guest'}\n${formatBookingTime(data.startTime, data.endTime, data.timezone || 'UTC')}`
          if (data.meetingUrl) {
            activityDescription += `\nMeeting link: ${data.meetingUrl}`
          }
        }
        break
      }

      case 'BOOKING_CANCELLED':
      case 'BOOKING_REJECTED': {
        // Get the booking to find contact
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, contact_id, title, attendee_name')
          .eq('cal_booking_uid', data.uid)
          .eq('tenant_id', tenantId)
          .single()

        if (booking) {
          bookingId = booking.id
          contactId = booking.contact_id

          const { error: cancelError } = await supabase
            .from('bookings')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: data.cancelledReason || null,
            })
            .eq('id', booking.id)

          if (cancelError) throw cancelError

          activitySubject = `Meeting Cancelled: ${booking.title}`
          activityDescription = `Meeting with ${booking.attendee_name || 'Guest'} was cancelled`
          if (data.cancelledReason) {
            activityDescription += `\nReason: ${data.cancelledReason}`
          }
        }
        break
      }

      case 'BOOKING_RESCHEDULED': {
        // Get old booking
        const { data: oldBooking } = await supabase
          .from('bookings')
          .select('id, contact_id')
          .eq('cal_booking_uid', data.rescheduleUid)
          .eq('tenant_id', tenantId)
          .single()

        contactId = oldBooking?.contact_id

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
            contact_id: contactId || null,
            rescheduled_from_id: oldBooking?.id || null,
            metadata: data.metadata || {},
          })
          .select('id')
          .single()

        if (insertError) throw insertError
        bookingId = newBooking?.id

        // Update old booking
        if (oldBooking && newBooking) {
          await supabase
            .from('bookings')
            .update({
              status: 'rescheduled',
              rescheduled_to_id: newBooking.id,
            })
            .eq('id', oldBooking.id)
        }

        activitySubject = `Meeting Rescheduled: ${data.title}`
        activityDescription = `Meeting with ${attendee?.name || 'Guest'} rescheduled to ${formatBookingTime(data.startTime, data.endTime, data.timezone || 'UTC')}`
        break
      }

      case 'BOOKING_COMPLETED': {
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, contact_id, title, attendee_name')
          .eq('cal_booking_uid', data.uid)
          .eq('tenant_id', tenantId)
          .single()

        if (booking) {
          bookingId = booking.id
          contactId = booking.contact_id

          const { error: completeError } = await supabase
            .from('bookings')
            .update({ status: 'completed' })
            .eq('id', booking.id)

          if (completeError) throw completeError

          activitySubject = `Meeting Completed: ${booking.title}`
          activityDescription = `Meeting with ${booking.attendee_name || 'Guest'} has been completed`
        }
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event type: ${triggerEvent}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Create activity record if we have a booking
    if (bookingId && activitySubject) {
      const entityType = contactId ? 'contact' : 'booking'
      const entityId = contactId || bookingId

      await supabase.from('activities').insert({
        tenant_id: tenantId,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        activity_type: 'meeting',
        subject: activitySubject,
        description: activityDescription,
      })
    }

    // Create notification for the user
    if (bookingId) {
      const notificationTitle =
        triggerEvent === 'BOOKING_CREATED' || triggerEvent === 'BOOKING_CONFIRMED'
          ? 'New Meeting Scheduled'
          : triggerEvent === 'BOOKING_CANCELLED' || triggerEvent === 'BOOKING_REJECTED'
            ? 'Meeting Cancelled'
            : triggerEvent === 'BOOKING_RESCHEDULED'
              ? 'Meeting Rescheduled'
              : 'Meeting Completed'

      const notificationMessage = `${data.title} with ${attendee?.name || 'Guest'}`

      // Use the create_notification function
      await supabase.rpc('create_notification', {
        p_tenant_id: tenantId,
        p_user_id: userId,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_notification_type: 'activity',
        p_category: 'meeting_reminder',
        p_entity_type: 'booking',
        p_entity_id: bookingId,
        p_action_url: `/bookings/${bookingId}`,
        p_metadata: { event_type: triggerEvent, cal_uid: data.uid },
      })
    }

    console.log(`Successfully processed ${triggerEvent} event, booking ID: ${bookingId}`)

    return new Response(
      JSON.stringify({
        success: true,
        bookingId,
        event: triggerEvent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
