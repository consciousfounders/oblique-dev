-- Enhanced Webhook System
-- Adds inbound webhooks, webhook queue, payload templates, and retry logic

-- =====================
-- OUTBOUND WEBHOOK ENHANCEMENTS
-- =====================

-- Add custom payload template and metadata to webhooks table
ALTER TABLE public.webhooks
ADD COLUMN IF NOT EXISTS payload_template JSONB,
ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 3,
ADD COLUMN IF NOT EXISTS retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Webhook delivery queue for async processing and retries
CREATE TABLE IF NOT EXISTS public.webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  webhook_id UUID REFERENCES public.webhooks ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  last_response_status INTEGER,
  last_response_body TEXT,
  priority INTEGER NOT NULL DEFAULT 5, -- 1-10, lower is higher priority
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- Add retry_count to webhook_deliveries if not exists
ALTER TABLE public.webhook_deliveries
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- =====================
-- INBOUND WEBHOOKS
-- =====================

-- Inbound webhook endpoints for receiving data from external systems
CREATE TABLE IF NOT EXISTS public.inbound_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Endpoint configuration
  endpoint_slug TEXT NOT NULL, -- Unique slug for the webhook URL

  -- Authentication
  auth_type TEXT NOT NULL DEFAULT 'api_key' CHECK (auth_type IN ('none', 'api_key', 'hmac', 'basic')),
  api_key TEXT, -- For api_key auth
  hmac_secret TEXT, -- For hmac auth
  hmac_header TEXT DEFAULT 'X-Webhook-Signature', -- Header containing signature
  hmac_algorithm TEXT DEFAULT 'sha256', -- sha256, sha1
  basic_username TEXT, -- For basic auth
  basic_password TEXT, -- For basic auth (hashed)

  -- Target entity mapping
  target_entity TEXT NOT NULL CHECK (target_entity IN ('lead', 'contact', 'account', 'deal', 'activity')),

  -- Field mapping (source field -> target field)
  field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Default values for new records
  default_values JSONB DEFAULT '{}'::jsonb,

  -- Processing configuration
  create_if_not_exists BOOLEAN NOT NULL DEFAULT true,
  update_if_exists BOOLEAN NOT NULL DEFAULT false,
  lookup_field TEXT, -- Field to use for matching existing records (e.g., 'email')

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_received_at TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure unique endpoint slugs per tenant
CREATE UNIQUE INDEX IF NOT EXISTS inbound_webhooks_tenant_slug_idx
ON public.inbound_webhooks(tenant_id, endpoint_slug);

-- Inbound webhook logs
CREATE TABLE IF NOT EXISTS public.inbound_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  inbound_webhook_id UUID REFERENCES public.inbound_webhooks ON DELETE CASCADE NOT NULL,

  -- Request details
  request_method TEXT,
  request_headers JSONB,
  request_body JSONB,
  request_ip INET,

  -- Processing results
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'success', 'auth_failed', 'validation_failed', 'error')),
  entity_type TEXT,
  entity_id UUID,
  operation TEXT CHECK (operation IN ('create', 'update', 'skip')),

  -- Error details
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- =====================
-- COMMON INTEGRATION PRESETS
-- =====================

-- Integration presets for popular services (Zapier, Slack, etc.)
CREATE TABLE IF NOT EXISTS public.webhook_integration_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL, -- 'zapier', 'make', 'slack', 'custom'
  description TEXT,
  logo_url TEXT,

  -- Default configuration for this integration
  default_auth_type TEXT DEFAULT 'api_key',
  default_headers JSONB DEFAULT '{}'::jsonb,

  -- For outbound webhooks
  outbound_payload_template JSONB,

  -- For inbound webhooks
  inbound_field_mappings JSONB,

  -- Documentation
  docs_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Webhook tags for organization
CREATE TABLE IF NOT EXISTS public.webhook_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  webhook_id UUID REFERENCES public.webhooks ON DELETE CASCADE,
  inbound_webhook_id UUID REFERENCES public.inbound_webhooks ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CHECK ((webhook_id IS NOT NULL) OR (inbound_webhook_id IS NOT NULL))
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS webhook_queue_status_idx ON public.webhook_queue(status);
CREATE INDEX IF NOT EXISTS webhook_queue_tenant_status_idx ON public.webhook_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS webhook_queue_next_attempt_idx ON public.webhook_queue(next_attempt_at)
WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS webhook_queue_webhook_id_idx ON public.webhook_queue(webhook_id);

CREATE INDEX IF NOT EXISTS inbound_webhooks_tenant_idx ON public.inbound_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS inbound_webhooks_active_idx ON public.inbound_webhooks(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS inbound_webhooks_endpoint_idx ON public.inbound_webhooks(endpoint_slug);

CREATE INDEX IF NOT EXISTS inbound_webhook_logs_webhook_idx ON public.inbound_webhook_logs(inbound_webhook_id);
CREATE INDEX IF NOT EXISTS inbound_webhook_logs_created_idx ON public.inbound_webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS inbound_webhook_logs_status_idx ON public.inbound_webhook_logs(status);

CREATE INDEX IF NOT EXISTS webhook_tags_webhook_idx ON public.webhook_tags(webhook_id);
CREATE INDEX IF NOT EXISTS webhook_tags_inbound_idx ON public.webhook_tags(inbound_webhook_id);
CREATE INDEX IF NOT EXISTS webhook_tags_tag_idx ON public.webhook_tags(tag);

-- =====================
-- RLS POLICIES
-- =====================

ALTER TABLE public.webhook_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_integration_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_tags ENABLE ROW LEVEL SECURITY;

-- Webhook queue policies
CREATE POLICY "Users can view own tenant webhook queue"
  ON public.webhook_queue FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Service role can manage webhook queue"
  ON public.webhook_queue FOR ALL
  USING (auth.role() = 'service_role');

-- Inbound webhooks policies
CREATE POLICY "Users can view own tenant inbound webhooks"
  ON public.inbound_webhooks FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can create own inbound webhooks"
  ON public.inbound_webhooks FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own inbound webhooks"
  ON public.inbound_webhooks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own inbound webhooks"
  ON public.inbound_webhooks FOR DELETE
  USING (user_id = auth.uid());

-- Inbound webhook logs policies
CREATE POLICY "Users can view own inbound webhook logs"
  ON public.inbound_webhook_logs FOR SELECT
  USING (
    inbound_webhook_id IN (SELECT id FROM public.inbound_webhooks WHERE user_id = auth.uid())
  );

-- Integration presets are read-only for everyone
CREATE POLICY "Anyone can view integration presets"
  ON public.webhook_integration_presets FOR SELECT
  TO authenticated
  USING (true);

-- Webhook tags policies
CREATE POLICY "Users can manage own webhook tags"
  ON public.webhook_tags FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- =====================
-- TRIGGERS
-- =====================

CREATE TRIGGER inbound_webhooks_updated_at
  BEFORE UPDATE ON public.inbound_webhooks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Function to process webhook queue
CREATE OR REPLACE FUNCTION public.get_pending_webhooks(
  batch_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  webhook_id UUID,
  event_type TEXT,
  payload JSONB,
  attempt_count INTEGER,
  max_attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.webhook_queue wq
  SET status = 'processing', last_attempt_at = NOW()
  WHERE wq.id IN (
    SELECT wq2.id
    FROM public.webhook_queue wq2
    WHERE wq2.status = 'pending'
      AND (wq2.next_attempt_at IS NULL OR wq2.next_attempt_at <= NOW())
    ORDER BY wq2.priority ASC, wq2.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING wq.id, wq.tenant_id, wq.webhook_id, wq.event_type, wq.payload, wq.attempt_count, wq.max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Function to mark webhook as completed
CREATE OR REPLACE FUNCTION public.complete_webhook_delivery(
  queue_id UUID,
  response_status INTEGER DEFAULT NULL,
  response_body TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.webhook_queue
  SET
    status = 'completed',
    completed_at = NOW(),
    last_response_status = response_status,
    last_response_body = response_body
  WHERE id = queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function to retry webhook delivery
CREATE OR REPLACE FUNCTION public.retry_webhook_delivery(
  queue_id UUID,
  error_message TEXT DEFAULT NULL,
  response_status INTEGER DEFAULT NULL,
  response_body TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  current_attempt INTEGER;
  max_attempts_count INTEGER;
  retry_delay INTEGER;
BEGIN
  SELECT attempt_count, max_attempts INTO current_attempt, max_attempts_count
  FROM public.webhook_queue WHERE id = queue_id;

  -- Get retry delay from webhook config
  SELECT COALESCE(w.retry_delay_seconds, 60) INTO retry_delay
  FROM public.webhook_queue wq
  JOIN public.webhooks w ON w.id = wq.webhook_id
  WHERE wq.id = queue_id;

  IF current_attempt + 1 >= max_attempts_count THEN
    -- Move to dead letter
    UPDATE public.webhook_queue
    SET
      status = 'dead_letter',
      attempt_count = attempt_count + 1,
      last_error = error_message,
      last_response_status = response_status,
      last_response_body = response_body
    WHERE id = queue_id;
  ELSE
    -- Schedule retry with exponential backoff
    UPDATE public.webhook_queue
    SET
      status = 'pending',
      attempt_count = attempt_count + 1,
      next_attempt_at = NOW() + (retry_delay * POWER(2, attempt_count)) * INTERVAL '1 second',
      last_error = error_message,
      last_response_status = response_status,
      last_response_body = response_body
    WHERE id = queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to increment webhook failure count
CREATE OR REPLACE FUNCTION public.increment_webhook_failure(webhook_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.webhooks
  SET failure_count = failure_count + 1
  WHERE id = webhook_id;

  -- Auto-disable after 10 consecutive failures
  UPDATE public.webhooks
  SET is_active = false
  WHERE id = webhook_id AND failure_count >= 10;
END;
$$ LANGUAGE plpgsql;

-- Function to generate unique inbound webhook slug
CREATE OR REPLACE FUNCTION public.generate_webhook_slug()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================
-- INSERT DEFAULT INTEGRATION PRESETS
-- =====================

INSERT INTO public.webhook_integration_presets (name, provider, description, default_auth_type, docs_url) VALUES
('Zapier', 'zapier', 'Connect your CRM with 5000+ apps through Zapier', 'api_key', 'https://zapier.com/apps'),
('Make (Integromat)', 'make', 'Build complex automation workflows with Make', 'api_key', 'https://www.make.com'),
('Slack', 'slack', 'Send notifications to Slack channels', 'none', 'https://api.slack.com/messaging/webhooks'),
('Microsoft Teams', 'teams', 'Send notifications to Microsoft Teams channels', 'none', 'https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook'),
('Discord', 'discord', 'Send notifications to Discord channels', 'none', 'https://discord.com/developers/docs/resources/webhook'),
('Custom Webhook', 'custom', 'Configure a custom webhook for any service', 'api_key', NULL)
ON CONFLICT (name) DO NOTHING;

-- =====================
-- CLEANUP FUNCTION UPDATES
-- =====================

CREATE OR REPLACE FUNCTION public.cleanup_webhook_data()
RETURNS void AS $$
BEGIN
  -- Delete completed webhook queue items older than 7 days
  DELETE FROM public.webhook_queue
  WHERE status IN ('completed', 'dead_letter')
    AND created_at < NOW() - INTERVAL '7 days';

  -- Delete old inbound webhook logs (older than 30 days)
  DELETE FROM public.inbound_webhook_logs
  WHERE received_at < NOW() - INTERVAL '30 days';

  -- Delete old webhook deliveries (older than 30 days)
  DELETE FROM public.webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
