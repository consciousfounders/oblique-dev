-- Data Enrichment Integration Schema
-- Integrates with data enrichment services (Clearbit, Apollo, ZoomInfo, etc.)
-- to automatically populate company and contact information

-- Enrichment provider enum
create type public.enrichment_provider as enum (
  'clearbit',
  'apollo',
  'zoominfo',
  'rocketreach',
  'manual'
);

-- Enrichment status enum
create type public.enrichment_status as enum (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'partial',
  'stale'
);

-- Enrichment trigger enum
create type public.enrichment_trigger as enum (
  'on_create',
  'on_demand',
  'scheduled',
  'bulk'
);

-- Company enrichment data table
create table public.company_enrichment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  account_id uuid references public.accounts on delete cascade not null,
  provider public.enrichment_provider not null,
  status public.enrichment_status default 'pending',
  triggered_by public.enrichment_trigger default 'on_demand',

  -- Company basic info
  legal_name text,
  domain text,
  logo_url text,
  description text,
  founded_year integer,

  -- Company size and financials
  employee_count integer,
  employee_range text,
  annual_revenue numeric(20, 2),
  revenue_range text,
  funding_total numeric(20, 2),
  funding_rounds jsonb default '[]',
  last_funding_date date,
  last_funding_amount numeric(20, 2),
  last_funding_type text,

  -- Industry classification
  industry text,
  sub_industry text,
  industry_tags text[] default '{}',
  sic_codes text[] default '{}',
  naics_codes text[] default '{}',

  -- Technologies and tools
  technologies text[] default '{}',
  tech_categories jsonb default '{}',

  -- Social profiles
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  crunchbase_url text,

  -- Contact info
  phone text,
  email_formats text[] default '{}',

  -- Location
  headquarters_address text,
  headquarters_city text,
  headquarters_state text,
  headquarters_country text,
  headquarters_postal_code text,
  location_count integer,

  -- Recent news and signals
  recent_news jsonb default '[]',
  hiring_signals jsonb default '{}',
  growth_signals jsonb default '{}',

  -- Key personnel (decision makers)
  key_personnel jsonb default '[]',

  -- Metadata
  confidence_score integer,
  data_quality_score integer,
  raw_data jsonb default '{}',
  enriched_at timestamptz,
  expires_at timestamptz,
  error_message text,

  -- Credit tracking
  credits_used integer default 0,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- One enrichment record per account per provider
  unique(account_id, provider)
);

-- Contact enrichment data table
create table public.contact_enrichment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  contact_id uuid references public.contacts on delete cascade,
  lead_id uuid references public.leads on delete cascade,
  provider public.enrichment_provider not null,
  status public.enrichment_status default 'pending',
  triggered_by public.enrichment_trigger default 'on_demand',

  -- Personal info
  full_name text,
  first_name text,
  last_name text,
  headline text,
  bio text,
  avatar_url text,

  -- Job info (verified)
  job_title text,
  job_title_role text,
  job_title_level text,
  job_title_verified boolean default false,
  department text,
  seniority text,

  -- Current employment
  current_company text,
  current_company_domain text,
  current_company_linkedin text,
  employment_start_date date,

  -- Contact info
  email text,
  email_verified boolean default false,
  email_type text,
  email_confidence integer,
  phone text,
  phone_type text,
  mobile_phone text,
  work_phone text,

  -- Social profiles
  linkedin_url text,
  linkedin_id text,
  twitter_url text,
  github_url text,
  personal_website text,

  -- Professional history
  work_history jsonb default '[]',
  education_history jsonb default '[]',
  skills text[] default '{}',
  certifications text[] default '{}',

  -- Location
  location text,
  city text,
  state text,
  country text,
  timezone text,

  -- Metadata
  confidence_score integer,
  data_quality_score integer,
  raw_data jsonb default '{}',
  enriched_at timestamptz,
  expires_at timestamptz,
  error_message text,

  -- Credit tracking
  credits_used integer default 0,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- Ensure enrichment is linked to exactly one entity
  constraint contact_enrichment_entity_check check (
    (contact_id is not null and lead_id is null) or
    (contact_id is null and lead_id is not null)
  )
);

-- Enrichment provider settings per tenant
create table public.enrichment_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null unique,

  -- Active provider
  default_company_provider public.enrichment_provider default 'clearbit',
  default_contact_provider public.enrichment_provider default 'clearbit',

  -- Clearbit credentials
  clearbit_api_key_encrypted text,
  clearbit_enabled boolean default false,

  -- Apollo credentials
  apollo_api_key_encrypted text,
  apollo_enabled boolean default false,

  -- ZoomInfo credentials
  zoominfo_api_key_encrypted text,
  zoominfo_enabled boolean default false,

  -- Auto-enrichment settings
  auto_enrich_on_create boolean default false,
  auto_enrich_companies boolean default true,
  auto_enrich_contacts boolean default true,
  auto_enrich_leads boolean default true,

  -- Scheduled enrichment
  scheduled_enrichment_enabled boolean default false,
  enrichment_schedule_cron text,
  max_stale_days integer default 90,

  -- Rate limiting
  daily_enrichment_limit integer default 100,
  monthly_enrichment_limit integer default 2000,

  -- Credit budget
  monthly_credit_budget integer default 1000,
  credit_alert_threshold integer default 100,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enrichment usage tracking (for cost management)
create table public.enrichment_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  provider public.enrichment_provider not null,

  -- Usage period
  period_start date not null,
  period_end date not null,

  -- Counts
  company_enrichments integer default 0,
  contact_enrichments integer default 0,
  total_enrichments integer default 0,
  successful_enrichments integer default 0,
  failed_enrichments integer default 0,

  -- Credits
  credits_used integer default 0,
  credits_remaining integer,

  -- Cost tracking (if provider charges per call)
  estimated_cost numeric(10, 2) default 0,

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  -- One record per tenant per provider per period
  unique(tenant_id, provider, period_start)
);

-- Enrichment job queue (for bulk and scheduled enrichment)
create table public.enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,

  -- Job details
  job_type text not null check (job_type in ('company', 'contact', 'bulk_company', 'bulk_contact')),
  provider public.enrichment_provider not null,
  trigger_type public.enrichment_trigger not null,

  -- Target entities
  entity_ids uuid[] default '{}',
  total_count integer default 0,
  processed_count integer default 0,
  success_count integer default 0,
  error_count integer default 0,

  -- Status
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,

  -- Progress tracking
  progress jsonb default '{}',

  -- Created by
  created_by uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for company_enrichment
create index company_enrichment_tenant_id_idx on public.company_enrichment(tenant_id);
create index company_enrichment_account_id_idx on public.company_enrichment(account_id);
create index company_enrichment_provider_idx on public.company_enrichment(provider);
create index company_enrichment_status_idx on public.company_enrichment(status);
create index company_enrichment_enriched_at_idx on public.company_enrichment(enriched_at);
create index company_enrichment_domain_idx on public.company_enrichment(domain);

-- Indexes for contact_enrichment
create index contact_enrichment_tenant_id_idx on public.contact_enrichment(tenant_id);
create index contact_enrichment_contact_id_idx on public.contact_enrichment(contact_id);
create index contact_enrichment_lead_id_idx on public.contact_enrichment(lead_id);
create index contact_enrichment_provider_idx on public.contact_enrichment(provider);
create index contact_enrichment_status_idx on public.contact_enrichment(status);
create index contact_enrichment_enriched_at_idx on public.contact_enrichment(enriched_at);
create index contact_enrichment_email_idx on public.contact_enrichment(email);

-- Indexes for enrichment_usage
create index enrichment_usage_tenant_id_idx on public.enrichment_usage(tenant_id);
create index enrichment_usage_provider_idx on public.enrichment_usage(provider);
create index enrichment_usage_period_idx on public.enrichment_usage(period_start, period_end);

-- Indexes for enrichment_jobs
create index enrichment_jobs_tenant_id_idx on public.enrichment_jobs(tenant_id);
create index enrichment_jobs_status_idx on public.enrichment_jobs(status);
create index enrichment_jobs_created_at_idx on public.enrichment_jobs(created_at);

-- Enable RLS
alter table public.company_enrichment enable row level security;
alter table public.contact_enrichment enable row level security;
alter table public.enrichment_settings enable row level security;
alter table public.enrichment_usage enable row level security;
alter table public.enrichment_jobs enable row level security;

-- RLS Policies for company_enrichment
create policy "Users can view own tenant company enrichment"
  on public.company_enrichment for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant company enrichment"
  on public.company_enrichment for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant company enrichment"
  on public.company_enrichment for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant company enrichment"
  on public.company_enrichment for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for contact_enrichment
create policy "Users can view own tenant contact enrichment"
  on public.contact_enrichment for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant contact enrichment"
  on public.contact_enrichment for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant contact enrichment"
  on public.contact_enrichment for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant contact enrichment"
  on public.contact_enrichment for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for enrichment_settings (admin only)
create policy "Admins can view own tenant enrichment settings"
  on public.enrichment_settings for select
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage enrichment settings"
  on public.enrichment_settings for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for enrichment_usage
create policy "Users can view own tenant enrichment usage"
  on public.enrichment_usage for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant enrichment usage"
  on public.enrichment_usage for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant enrichment usage"
  on public.enrichment_usage for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for enrichment_jobs
create policy "Users can view own tenant enrichment jobs"
  on public.enrichment_jobs for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant enrichment jobs"
  on public.enrichment_jobs for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant enrichment jobs"
  on public.enrichment_jobs for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant enrichment jobs"
  on public.enrichment_jobs for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at triggers
create trigger company_enrichment_updated_at before update on public.company_enrichment
  for each row execute procedure public.handle_updated_at();

create trigger contact_enrichment_updated_at before update on public.contact_enrichment
  for each row execute procedure public.handle_updated_at();

create trigger enrichment_settings_updated_at before update on public.enrichment_settings
  for each row execute procedure public.handle_updated_at();

create trigger enrichment_usage_updated_at before update on public.enrichment_usage
  for each row execute procedure public.handle_updated_at();

create trigger enrichment_jobs_updated_at before update on public.enrichment_jobs
  for each row execute procedure public.handle_updated_at();
