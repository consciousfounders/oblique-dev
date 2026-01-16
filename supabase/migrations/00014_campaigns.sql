-- Campaign types
create type public.campaign_type as enum (
  'email',
  'event',
  'webinar',
  'ads',
  'content',
  'social',
  'direct_mail',
  'referral',
  'other'
);

-- Campaign status
create type public.campaign_status as enum ('planned', 'active', 'paused', 'completed', 'archived');

-- Campaign member status (response tracking)
create type public.campaign_member_status as enum (
  'added',
  'sent',
  'opened',
  'clicked',
  'responded',
  'converted',
  'unsubscribed',
  'bounced'
);

-- Campaigns table
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  campaign_type public.campaign_type not null,
  status public.campaign_status default 'planned' not null,
  -- Budget tracking
  budget numeric(12,2),
  actual_cost numeric(12,2) default 0,
  -- Timeline
  start_date date,
  end_date date,
  -- Ownership
  owner_id uuid references public.users on delete set null,
  -- Parent campaign for hierarchical campaigns
  parent_campaign_id uuid references public.campaigns on delete set null,
  -- UTM parameters for tracking
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- Expected metrics
  expected_response_rate numeric(5,2),
  expected_revenue numeric(12,2),
  -- Actual metrics (calculated from campaign_members)
  total_leads integer default 0 not null,
  total_contacts integer default 0 not null,
  total_responses integer default 0 not null,
  total_converted integer default 0 not null,
  total_revenue numeric(12,2) default 0,
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Campaign members table (leads/contacts associated with campaigns)
create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  -- Can be either a lead or contact (one should be set)
  lead_id uuid references public.leads on delete cascade,
  contact_id uuid references public.contacts on delete cascade,
  -- Is this the primary campaign source for this lead/contact?
  is_primary_source boolean default false not null,
  -- Member status and engagement tracking
  status public.campaign_member_status default 'added' not null,
  responded_at timestamptz,
  converted_at timestamptz,
  -- Multi-touch attribution
  first_touch boolean default false not null,
  last_touch boolean default false not null,
  touch_count integer default 1 not null,
  attribution_percentage numeric(5,2) default 100,
  -- Revenue attribution
  attributed_revenue numeric(12,2) default 0,
  -- UTM parameters captured at time of lead creation
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- Page/form where lead was captured
  landing_page_url text,
  referrer_url text,
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure a member is either a lead or contact, not both or neither
  check (
    (lead_id is not null and contact_id is null) or
    (lead_id is null and contact_id is not null)
  ),
  -- Prevent duplicate campaign members
  unique(campaign_id, lead_id),
  unique(campaign_id, contact_id)
);

-- Campaign response history (track status changes over time)
create table public.campaign_responses (
  id uuid primary key default gen_random_uuid(),
  campaign_member_id uuid references public.campaign_members on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  -- Response details
  response_type text not null, -- 'email_open', 'email_click', 'form_submit', 'meeting_booked', etc.
  response_date timestamptz default now() not null,
  -- Additional context
  response_data jsonb,
  -- Metadata
  created_at timestamptz default now() not null
);

-- Add campaign_id to leads table for primary campaign source
alter table public.leads add column campaign_id uuid references public.campaigns on delete set null;

-- Add campaign_id to deals table for influenced deals
alter table public.deals add column campaign_id uuid references public.campaigns on delete set null;

-- Indexes for performance
create index campaigns_tenant_id_idx on public.campaigns(tenant_id);
create index campaigns_status_idx on public.campaigns(status);
create index campaigns_type_idx on public.campaigns(campaign_type);
create index campaigns_owner_id_idx on public.campaigns(owner_id);
create index campaigns_start_date_idx on public.campaigns(start_date);
create index campaigns_end_date_idx on public.campaigns(end_date);
create index campaigns_parent_campaign_id_idx on public.campaigns(parent_campaign_id);

create index campaign_members_campaign_id_idx on public.campaign_members(campaign_id);
create index campaign_members_tenant_id_idx on public.campaign_members(tenant_id);
create index campaign_members_lead_id_idx on public.campaign_members(lead_id);
create index campaign_members_contact_id_idx on public.campaign_members(contact_id);
create index campaign_members_status_idx on public.campaign_members(status);
create index campaign_members_primary_source_idx on public.campaign_members(is_primary_source) where is_primary_source = true;

create index campaign_responses_member_id_idx on public.campaign_responses(campaign_member_id);
create index campaign_responses_tenant_id_idx on public.campaign_responses(tenant_id);
create index campaign_responses_date_idx on public.campaign_responses(response_date);

create index leads_campaign_id_idx on public.leads(campaign_id);
create index deals_campaign_id_idx on public.deals(campaign_id);

-- Enable RLS
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.campaign_responses enable row level security;

-- RLS Policies for campaigns
create policy "Users can view own tenant campaigns"
  on public.campaigns for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant campaigns"
  on public.campaigns for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant campaigns"
  on public.campaigns for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant campaigns"
  on public.campaigns for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for campaign_members
create policy "Users can view own tenant campaign members"
  on public.campaign_members for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant campaign members"
  on public.campaign_members for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant campaign members"
  on public.campaign_members for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant campaign members"
  on public.campaign_members for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for campaign_responses
create policy "Users can view own tenant campaign responses"
  on public.campaign_responses for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant campaign responses"
  on public.campaign_responses for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at triggers
create trigger campaigns_updated_at before update on public.campaigns
  for each row execute procedure public.handle_updated_at();

create trigger campaign_members_updated_at before update on public.campaign_members
  for each row execute procedure public.handle_updated_at();

-- Function to update campaign metrics when members change
create or replace function public.update_campaign_metrics()
returns trigger as $$
declare
  v_campaign_id uuid;
begin
  -- Get the campaign_id depending on operation
  if TG_OP = 'DELETE' then
    v_campaign_id := OLD.campaign_id;
  else
    v_campaign_id := NEW.campaign_id;
  end if;

  -- Update campaign metrics
  update public.campaigns
  set
    total_leads = (
      select count(*) from public.campaign_members
      where campaign_id = v_campaign_id and lead_id is not null
    ),
    total_contacts = (
      select count(*) from public.campaign_members
      where campaign_id = v_campaign_id and contact_id is not null
    ),
    total_responses = (
      select count(*) from public.campaign_members
      where campaign_id = v_campaign_id and status in ('responded', 'converted')
    ),
    total_converted = (
      select count(*) from public.campaign_members
      where campaign_id = v_campaign_id and status = 'converted'
    ),
    total_revenue = (
      select coalesce(sum(attributed_revenue), 0) from public.campaign_members
      where campaign_id = v_campaign_id
    ),
    updated_at = now()
  where id = v_campaign_id;

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

-- Triggers to update campaign metrics
create trigger campaign_members_metrics_insert
  after insert on public.campaign_members
  for each row execute procedure public.update_campaign_metrics();

create trigger campaign_members_metrics_update
  after update on public.campaign_members
  for each row execute procedure public.update_campaign_metrics();

create trigger campaign_members_metrics_delete
  after delete on public.campaign_members
  for each row execute procedure public.update_campaign_metrics();

-- Function to calculate campaign ROI
create or replace function public.calculate_campaign_roi(p_campaign_id uuid)
returns numeric as $$
declare
  v_revenue numeric;
  v_cost numeric;
begin
  select total_revenue, coalesce(actual_cost, 0)
  into v_revenue, v_cost
  from public.campaigns
  where id = p_campaign_id;

  if v_cost = 0 or v_cost is null then
    return null;
  end if;

  return round(((v_revenue - v_cost) / v_cost) * 100, 2);
end;
$$ language plpgsql stable;

-- Function to calculate cost per lead
create or replace function public.calculate_cost_per_lead(p_campaign_id uuid)
returns numeric as $$
declare
  v_cost numeric;
  v_leads integer;
begin
  select coalesce(actual_cost, 0), total_leads
  into v_cost, v_leads
  from public.campaigns
  where id = p_campaign_id;

  if v_leads = 0 then
    return null;
  end if;

  return round(v_cost / v_leads, 2);
end;
$$ language plpgsql stable;

-- Function to calculate conversion rate
create or replace function public.calculate_campaign_conversion_rate(p_campaign_id uuid)
returns numeric as $$
declare
  v_total_members integer;
  v_converted integer;
begin
  select total_leads + total_contacts, total_converted
  into v_total_members, v_converted
  from public.campaigns
  where id = p_campaign_id;

  if v_total_members = 0 then
    return 0;
  end if;

  return round((v_converted::numeric / v_total_members) * 100, 2);
end;
$$ language plpgsql stable;

-- Function to get campaign metrics (for API/UI)
create or replace function public.get_campaign_metrics(p_campaign_id uuid)
returns jsonb as $$
declare
  v_campaign record;
  v_roi numeric;
  v_cpl numeric;
  v_conversion_rate numeric;
begin
  select * into v_campaign from public.campaigns where id = p_campaign_id;

  if not found then
    return null;
  end if;

  v_roi := public.calculate_campaign_roi(p_campaign_id);
  v_cpl := public.calculate_cost_per_lead(p_campaign_id);
  v_conversion_rate := public.calculate_campaign_conversion_rate(p_campaign_id);

  return jsonb_build_object(
    'total_leads', v_campaign.total_leads,
    'total_contacts', v_campaign.total_contacts,
    'total_members', v_campaign.total_leads + v_campaign.total_contacts,
    'total_responses', v_campaign.total_responses,
    'total_converted', v_campaign.total_converted,
    'total_revenue', v_campaign.total_revenue,
    'budget', v_campaign.budget,
    'actual_cost', v_campaign.actual_cost,
    'roi', v_roi,
    'cost_per_lead', v_cpl,
    'conversion_rate', v_conversion_rate,
    'response_rate', case
      when (v_campaign.total_leads + v_campaign.total_contacts) > 0
      then round((v_campaign.total_responses::numeric / (v_campaign.total_leads + v_campaign.total_contacts)) * 100, 2)
      else 0
    end
  );
end;
$$ language plpgsql stable;
