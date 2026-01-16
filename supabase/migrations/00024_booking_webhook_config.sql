-- Booking Webhook Configuration Migration
-- Stores Cal.com webhook configuration per tenant for secure webhook handling

-- Integration provider enum
CREATE TYPE public.integration_provider AS ENUM ('calcom', 'calendly', 'google_calendar');

-- Booking webhook configurations table
CREATE TABLE IF NOT EXISTS public.booking_webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users NOT NULL,
  provider integration_provider NOT NULL DEFAULT 'calcom',
  -- Webhook secret for signature verification
  webhook_secret TEXT,
  -- Cal.com username for generating booking links
  cal_username TEXT,
  -- Default event type slug
  default_event_type TEXT,
  -- Whether this integration is active
  is_active BOOLEAN DEFAULT TRUE,
  -- Last webhook received timestamp
  last_webhook_at TIMESTAMPTZ,
  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Unique per user/provider combo
  UNIQUE(tenant_id, user_id, provider)
);

-- Booking webhook delivery logs (for debugging)
CREATE TABLE IF NOT EXISTS public.booking_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  config_id UUID REFERENCES public.booking_webhook_configs ON DELETE CASCADE,
  -- Event details
  event_type TEXT NOT NULL,
  cal_booking_uid TEXT,
  -- Request/response
  request_payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  -- Timing
  processing_time_ms INTEGER,
  -- Outcome
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_booking_webhook_configs_tenant ON public.booking_webhook_configs(tenant_id);
CREATE INDEX idx_booking_webhook_configs_user ON public.booking_webhook_configs(user_id);
CREATE INDEX idx_booking_webhook_configs_provider ON public.booking_webhook_configs(provider);

CREATE INDEX idx_booking_webhook_logs_tenant ON public.booking_webhook_logs(tenant_id);
CREATE INDEX idx_booking_webhook_logs_config ON public.booking_webhook_logs(config_id);
CREATE INDEX idx_booking_webhook_logs_created ON public.booking_webhook_logs(created_at DESC);
CREATE INDEX idx_booking_webhook_logs_success ON public.booking_webhook_logs(success);

-- Enable RLS
ALTER TABLE public.booking_webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_webhook_configs
CREATE POLICY "Users can view own tenant webhook configs"
  ON public.booking_webhook_configs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own webhook configs"
  ON public.booking_webhook_configs FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update own webhook configs"
  ON public.booking_webhook_configs FOR UPDATE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can delete own webhook configs"
  ON public.booking_webhook_configs FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- RLS Policies for booking_webhook_logs
CREATE POLICY "Users can view own tenant webhook logs"
  ON public.booking_webhook_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Service role can insert logs (webhooks bypass RLS)
CREATE POLICY "Service role can insert webhook logs"
  ON public.booking_webhook_logs FOR INSERT
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER booking_webhook_configs_updated_at
  BEFORE UPDATE ON public.booking_webhook_configs
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to generate webhook URL for a user
CREATE OR REPLACE FUNCTION generate_booking_webhook_url(
  p_tenant_id UUID,
  p_user_id UUID,
  p_base_url TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_config booking_webhook_configs%ROWTYPE;
  v_base TEXT;
BEGIN
  -- Get the config to include the secret if set
  SELECT * INTO v_config
  FROM booking_webhook_configs
  WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND provider = 'calcom'
  LIMIT 1;

  -- Use provided base URL or default
  v_base := COALESCE(p_base_url, current_setting('app.supabase_url', true));

  -- Generate the URL with query params
  IF v_config.webhook_secret IS NOT NULL THEN
    RETURN v_base || '/functions/v1/calcom-webhook?tenant_id=' || p_tenant_id::TEXT
           || '&user_id=' || p_user_id::TEXT
           || '&secret=' || v_config.webhook_secret;
  ELSE
    RETURN v_base || '/functions/v1/calcom-webhook?tenant_id=' || p_tenant_id::TEXT
           || '&user_id=' || p_user_id::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add booking to activities entity types support
-- Update the activities table to support 'booking' as an entity type
DO $$
BEGIN
  -- Check if the constraint exists and can be updated
  -- This adds 'booking' to the allowed entity_type values if using a check constraint
  -- Since we're using a text field, we just document this is now valid
  COMMENT ON COLUMN public.activities.entity_type IS 'Entity type: lead, contact, account, deal, or booking';
END $$;
