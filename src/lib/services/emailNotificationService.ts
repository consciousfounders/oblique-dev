import { supabase, type NotificationCategory } from '@/lib/supabase'

interface EmailNotificationData {
  to: string
  subject: string
  body: string
  category: NotificationCategory
}

interface UserNotificationPrefs {
  email_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  category_preferences: Record<string, boolean> | null
}

function isInQuietHours(prefs: UserNotificationPrefs): boolean {
  if (!prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) {
    return false
  }

  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const start = prefs.quiet_hours_start
  const end = prefs.quiet_hours_end

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end
  }

  return currentTime >= start && currentTime <= end
}

function isCategoryEnabled(prefs: UserNotificationPrefs, category: NotificationCategory): boolean {
  if (!prefs.category_preferences) return true
  return prefs.category_preferences[category] !== false
}

export const emailNotificationService = {
  async shouldSendEmail(
    userId: string,
    tenantId: string,
    category: NotificationCategory
  ): Promise<boolean> {
    try {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, category_preferences')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single()

      if (!prefs) return true // Default to sending if no prefs exist

      // Check if email is enabled
      if (!prefs.email_enabled) return false

      // Check if category is enabled
      if (!isCategoryEnabled(prefs, category)) return false

      // Check quiet hours
      if (isInQuietHours(prefs)) return false

      return true
    } catch (error) {
      console.error('Error checking email preferences:', error)
      return true // Default to sending on error
    }
  },

  async sendNotificationEmail(data: EmailNotificationData): Promise<boolean> {
    // This is a placeholder for the actual email sending logic
    // In production, this would integrate with:
    // - Supabase Edge Functions for serverless email sending
    // - Email service providers like SendGrid, Resend, or AWS SES

    console.log('Email notification would be sent:', {
      to: data.to,
      subject: data.subject,
      preview: data.body.substring(0, 100),
    })

    // For now, we'll log the notification and return success
    // The actual implementation would call an edge function or API endpoint
    return true
  },

  async queueEmailNotification(
    userId: string,
    tenantId: string,
    data: Omit<EmailNotificationData, 'to'>
  ): Promise<boolean> {
    try {
      // Check if we should send the email
      const shouldSend = await this.shouldSendEmail(userId, tenantId, data.category)
      if (!shouldSend) {
        console.log('Email notification skipped due to user preferences')
        return false
      }

      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()

      if (!user?.email) {
        console.error('User email not found')
        return false
      }

      // Send the email
      return await this.sendNotificationEmail({
        ...data,
        to: user.email,
      })
    } catch (error) {
      console.error('Error queueing email notification:', error)
      return false
    }
  },

  getEmailSubject(category: NotificationCategory, title: string): string {
    const prefixes: Record<NotificationCategory, string> = {
      task_due: '[Task Due]',
      task_overdue: '[OVERDUE]',
      deal_stage_change: '[Deal Update]',
      lead_assigned: '[New Lead]',
      mention_in_note: '[Mentioned]',
      email_reply: '[Reply]',
      meeting_reminder: '[Meeting]',
      quota_alert: '[Quota Alert]',
      system: '[System]',
    }
    return `${prefixes[category]} ${title}`
  },

  formatEmailBody(title: string, message: string, actionUrl?: string): string {
    let body = `${title}\n\n${message}`

    if (actionUrl) {
      body += `\n\nView details: ${actionUrl}`
    }

    body += '\n\n---\nYou received this email because you have notifications enabled in your CRM settings.'
    body += '\nTo manage your notification preferences, visit Settings > Notifications.'

    return body
  },
}
