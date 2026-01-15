-- Notifications and Alerts System Migration
-- This migration creates the notifications table and notification_preferences table

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
  'system',
  'mention',
  'activity',
  'reminder',
  'alert'
);

-- Notification category enum
CREATE TYPE notification_category AS ENUM (
  'task_due',
  'task_overdue',
  'deal_stage_change',
  'lead_assigned',
  'mention_in_note',
  'email_reply',
  'meeting_reminder',
  'quota_alert',
  'system'
);

-- Digest mode enum for notification preferences
CREATE TYPE digest_mode AS ENUM (
  'immediate',
  'hourly',
  'daily'
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type notification_type NOT NULL DEFAULT 'system',
  category notification_category NOT NULL DEFAULT 'system',
  entity_type TEXT,
  entity_id UUID,
  action_url TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  browser_push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  digest_mode digest_mode NOT NULL DEFAULT 'immediate',
  category_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);

-- Create indexes for notification_preferences
CREATE INDEX idx_notification_prefs_tenant_user ON notification_preferences(tenant_id, user_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = user_id)
  );

-- RLS policies for notification_preferences
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- Function to create a notification (for use by other tables/triggers)
CREATE OR REPLACE FUNCTION create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_notification_type notification_type,
  p_category notification_category,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_prefs RECORD;
BEGIN
  -- Check user preferences
  SELECT in_app_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, category_preferences
  INTO v_prefs
  FROM notification_preferences
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id;

  -- If no preferences exist, default to enabled
  IF NOT FOUND THEN
    v_prefs.in_app_enabled := TRUE;
    v_prefs.category_preferences := '{}';
  END IF;

  -- Check if in-app notifications are enabled
  IF NOT v_prefs.in_app_enabled THEN
    RETURN NULL;
  END IF;

  -- Check if category is enabled
  IF v_prefs.category_preferences IS NOT NULL AND
     v_prefs.category_preferences ? p_category::TEXT AND
     (v_prefs.category_preferences ->> p_category::TEXT)::BOOLEAN = FALSE THEN
    RETURN NULL;
  END IF;

  -- Check quiet hours (only for non-system notifications)
  IF v_prefs.quiet_hours_enabled AND p_category != 'system' THEN
    IF v_prefs.quiet_hours_start IS NOT NULL AND v_prefs.quiet_hours_end IS NOT NULL THEN
      IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
        -- Overnight quiet hours (e.g., 22:00 to 08:00)
        IF CURRENT_TIME >= v_prefs.quiet_hours_start OR CURRENT_TIME <= v_prefs.quiet_hours_end THEN
          RETURN NULL;
        END IF;
      ELSE
        -- Same-day quiet hours (e.g., 12:00 to 14:00)
        IF CURRENT_TIME >= v_prefs.quiet_hours_start AND CURRENT_TIME <= v_prefs.quiet_hours_end THEN
          RETURN NULL;
        END IF;
      END IF;
    END IF;
  END IF;

  -- Create the notification
  INSERT INTO notifications (
    tenant_id,
    user_id,
    title,
    message,
    notification_type,
    category,
    entity_type,
    entity_id,
    action_url,
    metadata
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_title,
    p_message,
    p_notification_type,
    p_category,
    p_entity_type,
    p_entity_id,
    p_action_url,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to create notification on mention
CREATE OR REPLACE FUNCTION notify_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  v_mentioner_name TEXT;
  v_entity_name TEXT;
BEGIN
  -- Get the mentioner's name
  SELECT full_name INTO v_mentioner_name FROM users WHERE id = NEW.user_id;
  IF v_mentioner_name IS NULL THEN
    v_mentioner_name := 'Someone';
  END IF;

  -- Get entity name based on type
  CASE
    WHEN NEW.entity_type = 'contact' THEN
      SELECT first_name || COALESCE(' ' || last_name, '') INTO v_entity_name FROM contacts WHERE id = NEW.entity_id;
    WHEN NEW.entity_type = 'lead' THEN
      SELECT first_name || COALESCE(' ' || last_name, '') INTO v_entity_name FROM leads WHERE id = NEW.entity_id;
    WHEN NEW.entity_type = 'account' THEN
      SELECT name INTO v_entity_name FROM accounts WHERE id = NEW.entity_id;
    WHEN NEW.entity_type = 'deal' THEN
      SELECT name INTO v_entity_name FROM deals WHERE id = NEW.entity_id;
    ELSE
      v_entity_name := 'a record';
  END CASE;

  -- Create notification for the mentioned user
  PERFORM create_notification(
    (SELECT tenant_id FROM notes WHERE id = NEW.note_id),
    NEW.mentioned_user_id,
    'You were mentioned',
    v_mentioner_name || ' mentioned you in a note on ' || v_entity_name,
    'mention'::notification_type,
    'mention_in_note'::notification_category,
    (SELECT entity_type FROM notes WHERE id = NEW.note_id),
    (SELECT entity_id FROM notes WHERE id = NEW.note_id),
    '/' || (SELECT entity_type FROM notes WHERE id = NEW.note_id) || 's/' || (SELECT entity_id FROM notes WHERE id = NEW.note_id)::TEXT
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for mentions
DROP TRIGGER IF EXISTS trigger_notify_on_mention ON note_mentions;
CREATE TRIGGER trigger_notify_on_mention
  AFTER INSERT ON note_mentions
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mention();

-- Trigger function to notify on lead assignment
CREATE OR REPLACE FUNCTION notify_on_lead_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_name TEXT;
  v_assigner_name TEXT;
BEGIN
  -- Only trigger if owner_id changed and new owner is not null
  IF NEW.owner_id IS NOT NULL AND (OLD.owner_id IS NULL OR NEW.owner_id != OLD.owner_id) THEN
    v_lead_name := NEW.first_name || COALESCE(' ' || NEW.last_name, '');

    -- Get the name of whoever made this change (current session user)
    SELECT full_name INTO v_assigner_name FROM users WHERE id = auth.uid();
    IF v_assigner_name IS NULL THEN
      v_assigner_name := 'A team member';
    END IF;

    PERFORM create_notification(
      NEW.tenant_id,
      NEW.owner_id,
      'New lead assigned',
      v_assigner_name || ' assigned you the lead "' || v_lead_name || '"',
      'activity'::notification_type,
      'lead_assigned'::notification_category,
      'lead',
      NEW.id,
      '/leads/' || NEW.id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lead assignment
DROP TRIGGER IF EXISTS trigger_notify_on_lead_assignment ON leads;
CREATE TRIGGER trigger_notify_on_lead_assignment
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_lead_assignment();

-- Trigger function to notify on deal stage change
CREATE OR REPLACE FUNCTION notify_on_deal_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_stage_name TEXT;
  v_new_stage_name TEXT;
BEGIN
  -- Only trigger if stage_id changed
  IF NEW.stage_id != OLD.stage_id AND NEW.owner_id IS NOT NULL THEN
    SELECT name INTO v_old_stage_name FROM deal_stages WHERE id = OLD.stage_id;
    SELECT name INTO v_new_stage_name FROM deal_stages WHERE id = NEW.stage_id;

    PERFORM create_notification(
      NEW.tenant_id,
      NEW.owner_id,
      'Deal stage changed',
      '"' || NEW.name || '" moved from ' || COALESCE(v_old_stage_name, 'unknown') || ' to ' || COALESCE(v_new_stage_name, 'unknown'),
      'activity'::notification_type,
      'deal_stage_change'::notification_category,
      'deal',
      NEW.id,
      '/deals/' || NEW.id::TEXT,
      jsonb_build_object('old_stage', v_old_stage_name, 'new_stage', v_new_stage_name)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for deal stage change
DROP TRIGGER IF EXISTS trigger_notify_on_deal_stage_change ON deals;
CREATE TRIGGER trigger_notify_on_deal_stage_change
  AFTER UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_deal_stage_change();
