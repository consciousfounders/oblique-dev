-- Tasks and Activities Management Migration
-- Creates a comprehensive task management system with polymorphic relations to entities

-- Task type enum
CREATE TYPE task_type AS ENUM (
  'call',
  'email',
  'meeting',
  'todo',
  'follow_up'
);

-- Task priority enum
CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high'
);

-- Task status enum
CREATE TYPE task_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'deferred'
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Task details
  subject TEXT NOT NULL,
  description TEXT,
  task_type task_type NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'not_started',

  -- Dates
  due_date DATE,
  due_time TIME,
  completed_at TIMESTAMPTZ,

  -- Polymorphic relation to entities
  entity_type TEXT, -- 'contact', 'account', 'deal', 'lead'
  entity_id UUID,

  -- Assignment
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Call-specific fields
  call_duration INTEGER, -- in seconds
  call_outcome TEXT, -- 'connected', 'voicemail', 'no_answer', 'busy', 'wrong_number'

  -- Meeting-specific fields
  meeting_location TEXT,
  meeting_attendees JSONB, -- Array of { user_id?, email, name }

  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_minutes_before INTEGER DEFAULT 15, -- Minutes before due date/time to send reminder
  reminder_sent_at TIMESTAMPTZ,

  -- Recurrence (for future support)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern JSONB, -- { frequency: 'daily' | 'weekly' | 'monthly', interval: number, end_date?: string }
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- For recurring instances

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for tasks
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_due_date_status ON tasks(due_date, status) WHERE status != 'completed';
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_reminder ON tasks(reminder_enabled, due_date, due_time, reminder_sent_at)
  WHERE reminder_enabled = TRUE AND reminder_sent_at IS NULL;

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can view own tenant tasks"
  ON tasks
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant tasks"
  ON tasks
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant tasks"
  ON tasks
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Trigger to update updated_at timestamp
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Enable Realtime for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Function to create notification when task is due soon
CREATE OR REPLACE FUNCTION notify_task_due()
RETURNS TRIGGER AS $$
DECLARE
  v_reminder_time TIMESTAMPTZ;
  v_entity_name TEXT;
BEGIN
  -- Only process if reminder is enabled and due date is set
  IF NEW.reminder_enabled AND NEW.due_date IS NOT NULL AND NEW.reminder_sent_at IS NULL THEN
    -- Calculate reminder time
    v_reminder_time := (NEW.due_date + COALESCE(NEW.due_time, '09:00:00'::TIME))::TIMESTAMPTZ
                       - (NEW.reminder_minutes_before || ' minutes')::INTERVAL;

    -- Check if reminder time is now or in the past (within a 5-minute window for batch processing)
    IF v_reminder_time <= NOW() AND v_reminder_time > NOW() - INTERVAL '5 minutes' THEN
      -- Get entity name if linked
      IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
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
            v_entity_name := NULL;
        END CASE;
      END IF;

      -- Create notification for the assigned user or owner
      PERFORM create_notification(
        NEW.tenant_id,
        COALESCE(NEW.assigned_to, NEW.owner_id),
        'Task Due Soon',
        '"' || NEW.subject || '"' || COALESCE(' for ' || v_entity_name, '') || ' is due soon',
        'reminder'::notification_type,
        'task_due'::notification_category,
        'task',
        NEW.id,
        '/tasks?id=' || NEW.id::TEXT
      );

      -- Mark reminder as sent
      UPDATE tasks SET reminder_sent_at = NOW() WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when task becomes overdue
CREATE OR REPLACE FUNCTION notify_task_overdue()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_name TEXT;
BEGIN
  -- Check if task just became overdue (due_date was today or earlier and status is not completed)
  IF NEW.due_date IS NOT NULL AND NEW.due_date < CURRENT_DATE
     AND NEW.status != 'completed' AND OLD.status != 'completed' THEN

    -- Get entity name if linked
    IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
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
          v_entity_name := NULL;
      END CASE;
    END IF;

    -- Create notification for the assigned user or owner
    PERFORM create_notification(
      NEW.tenant_id,
      COALESCE(NEW.assigned_to, NEW.owner_id),
      'Task Overdue',
      '"' || NEW.subject || '"' || COALESCE(' for ' || v_entity_name, '') || ' is overdue',
      'alert'::notification_type,
      'task_overdue'::notification_category,
      'task',
      NEW.id,
      '/tasks?id=' || NEW.id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log task completion as activity
CREATE OR REPLACE FUNCTION log_task_completion_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when task is marked as completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Set completed_at timestamp
    NEW.completed_at := NOW();

    -- Log activity if task is linked to an entity
    IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
      INSERT INTO activities (
        tenant_id,
        user_id,
        entity_type,
        entity_id,
        activity_type,
        subject,
        description
      ) VALUES (
        NEW.tenant_id,
        auth.uid(),
        NEW.entity_type,
        NEW.entity_id,
        'task',
        'Completed: ' || NEW.subject,
        COALESCE(NEW.description, '')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging task completion
CREATE TRIGGER trigger_log_task_completion
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_completion_activity();

-- Function to log call activity when call task is completed
CREATE OR REPLACE FUNCTION log_call_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when call task is marked as completed
  IF NEW.task_type = 'call' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Log call activity if task is linked to an entity
    IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
      INSERT INTO activities (
        tenant_id,
        user_id,
        entity_type,
        entity_id,
        activity_type,
        subject,
        description
      ) VALUES (
        NEW.tenant_id,
        auth.uid(),
        NEW.entity_type,
        NEW.entity_id,
        'call',
        NEW.subject,
        COALESCE(NEW.call_outcome, '') ||
        CASE WHEN NEW.call_duration IS NOT NULL
          THEN ' - Duration: ' || (NEW.call_duration / 60) || ' min ' || (NEW.call_duration % 60) || ' sec'
          ELSE ''
        END ||
        CASE WHEN NEW.description IS NOT NULL
          THEN E'\n' || NEW.description
          ELSE ''
        END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging call activity
CREATE TRIGGER trigger_log_call_activity
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_call_activity();

-- Function to log meeting activity when meeting task is completed
CREATE OR REPLACE FUNCTION log_meeting_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when meeting task is marked as completed
  IF NEW.task_type = 'meeting' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Log meeting activity if task is linked to an entity
    IF NEW.entity_type IS NOT NULL AND NEW.entity_id IS NOT NULL THEN
      INSERT INTO activities (
        tenant_id,
        user_id,
        entity_type,
        entity_id,
        activity_type,
        subject,
        description
      ) VALUES (
        NEW.tenant_id,
        auth.uid(),
        NEW.entity_type,
        NEW.entity_id,
        'meeting',
        NEW.subject,
        COALESCE('Location: ' || NEW.meeting_location, '') ||
        CASE WHEN NEW.description IS NOT NULL
          THEN E'\n' || NEW.description
          ELSE ''
        END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logging meeting activity
CREATE TRIGGER trigger_log_meeting_activity
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_meeting_activity();
