-- Multi-pipeline management support
-- This migration adds support for multiple sales pipelines (Sales, Renewal, Upsell/Expansion, Custom)

-- Pipeline type enum
CREATE TYPE public.pipeline_type AS ENUM ('sales', 'renewal', 'upsell', 'custom');

-- Stage type enum (for win/loss marking)
CREATE TYPE public.stage_type AS ENUM ('open', 'won', 'lost');

-- Pipelines table
CREATE TABLE public.pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  pipeline_type public.pipeline_type DEFAULT 'custom' NOT NULL,
  is_default boolean DEFAULT false NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  color text DEFAULT '#3b82f6',
  position integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add pipeline_id to deal_stages
ALTER TABLE public.deal_stages
  ADD COLUMN pipeline_id uuid REFERENCES public.pipelines ON DELETE CASCADE,
  ADD COLUMN color text DEFAULT '#6b7280',
  ADD COLUMN stage_type public.stage_type DEFAULT 'open' NOT NULL,
  ADD COLUMN description text,
  ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;

-- Pipeline analytics table for tracking stage history
CREATE TABLE public.deal_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES public.deals ON DELETE CASCADE NOT NULL,
  from_stage_id uuid REFERENCES public.deal_stages ON DELETE SET NULL,
  to_stage_id uuid REFERENCES public.deal_stages ON DELETE SET NULL NOT NULL,
  from_pipeline_id uuid REFERENCES public.pipelines ON DELETE SET NULL,
  to_pipeline_id uuid REFERENCES public.pipelines ON DELETE SET NULL,
  changed_by uuid REFERENCES public.users ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,
  time_in_previous_stage interval
);

-- Indexes
CREATE INDEX pipelines_tenant_id_idx ON public.pipelines(tenant_id);
CREATE INDEX pipelines_is_default_idx ON public.pipelines(tenant_id, is_default) WHERE is_default = true;
CREATE INDEX deal_stages_pipeline_id_idx ON public.deal_stages(pipeline_id);
CREATE INDEX deal_stage_history_deal_id_idx ON public.deal_stage_history(deal_id);
CREATE INDEX deal_stage_history_tenant_id_idx ON public.deal_stage_history(tenant_id);
CREATE INDEX deal_stage_history_changed_at_idx ON public.deal_stage_history(changed_at);

-- Enable RLS
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_stage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pipelines
CREATE POLICY "Users can view own tenant pipelines"
  ON public.pipelines FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant pipelines"
  ON public.pipelines FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant pipelines"
  ON public.pipelines FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant pipelines"
  ON public.pipelines FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- RLS Policies for deal_stage_history
CREATE POLICY "Users can view own tenant deal stage history"
  ON public.deal_stage_history FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant deal stage history"
  ON public.deal_stage_history FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Updated at trigger for pipelines
CREATE TRIGGER pipelines_updated_at BEFORE UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Updated at trigger for deal_stages
CREATE TRIGGER deal_stages_updated_at BEFORE UPDATE ON public.deal_stages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to ensure only one default pipeline per tenant
CREATE OR REPLACE FUNCTION public.ensure_single_default_pipeline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.pipelines
    SET is_default = false
    WHERE tenant_id = NEW.tenant_id AND id != NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_pipeline
  BEFORE INSERT OR UPDATE ON public.pipelines
  FOR EACH ROW EXECUTE PROCEDURE public.ensure_single_default_pipeline();

-- Function to track deal stage changes
CREATE OR REPLACE FUNCTION public.track_deal_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  v_from_pipeline_id uuid;
  v_to_pipeline_id uuid;
  v_time_in_stage interval;
  v_last_change timestamptz;
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    -- Get pipeline IDs
    SELECT pipeline_id INTO v_from_pipeline_id FROM public.deal_stages WHERE id = OLD.stage_id;
    SELECT pipeline_id INTO v_to_pipeline_id FROM public.deal_stages WHERE id = NEW.stage_id;

    -- Calculate time in previous stage
    SELECT changed_at INTO v_last_change
    FROM public.deal_stage_history
    WHERE deal_id = NEW.id
    ORDER BY changed_at DESC
    LIMIT 1;

    IF v_last_change IS NOT NULL THEN
      v_time_in_stage := now() - v_last_change;
    ELSE
      v_time_in_stage := now() - OLD.created_at;
    END IF;

    -- Insert history record
    INSERT INTO public.deal_stage_history (
      tenant_id, deal_id, from_stage_id, to_stage_id,
      from_pipeline_id, to_pipeline_id, changed_by, time_in_previous_stage
    ) VALUES (
      NEW.tenant_id, NEW.id, OLD.stage_id, NEW.stage_id,
      v_from_pipeline_id, v_to_pipeline_id, auth.uid(), v_time_in_stage
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_deal_stage_change
  AFTER UPDATE ON public.deals
  FOR EACH ROW EXECUTE PROCEDURE public.track_deal_stage_change();
