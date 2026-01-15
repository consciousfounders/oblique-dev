-- LinkedIn Integration Schema
-- Stores LinkedIn Sales Navigator data for contacts and leads

-- LinkedIn activity type enum
create type public.linkedin_activity_type as enum (
  'connection_request_sent',
  'connection_request_accepted',
  'connection_request_declined',
  'inmail_sent',
  'inmail_opened',
  'inmail_replied',
  'profile_viewed',
  'post_liked',
  'post_commented',
  'post_shared',
  'message_sent',
  'message_received'
);

-- LinkedIn profile status enum
create type public.linkedin_profile_status as enum (
  'not_connected',
  'pending',
  'connected',
  'following'
);

-- LinkedIn profiles table (stores LinkedIn profile data linked to contacts)
create table public.linkedin_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  -- Link to CRM entity (contact or lead)
  contact_id uuid references public.contacts on delete cascade,
  lead_id uuid references public.leads on delete cascade,
  -- LinkedIn profile data
  linkedin_id text,
  linkedin_url text,
  public_identifier text,
  -- Profile info
  headline text,
  summary text,
  location text,
  industry text,
  profile_picture_url text,
  -- Company info from LinkedIn
  current_company text,
  current_title text,
  -- Connection status
  connection_status public.linkedin_profile_status default 'not_connected',
  connection_degree integer,
  -- Engagement metrics
  mutual_connections integer default 0,
  -- Sync metadata
  last_synced_at timestamptz,
  raw_data jsonb default '{}',
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure profile is linked to exactly one entity
  constraint linkedin_profile_entity_check check (
    (contact_id is not null and lead_id is null) or
    (contact_id is null and lead_id is not null)
  ),
  -- Ensure unique LinkedIn profile per tenant
  unique(tenant_id, linkedin_id)
);

-- LinkedIn activities table (logs LinkedIn engagement)
create table public.linkedin_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users,
  linkedin_profile_id uuid references public.linkedin_profiles on delete cascade not null,
  -- Activity details
  activity_type public.linkedin_activity_type not null,
  subject text,
  description text,
  -- For InMails
  inmail_id text,
  inmail_subject text,
  inmail_body text,
  -- Response tracking
  responded_at timestamptz,
  response_content text,
  -- Metadata
  metadata jsonb default '{}',
  created_at timestamptz default now() not null
);

-- InMail templates table
create table public.linkedin_inmail_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users not null,
  name text not null,
  subject text not null,
  body text not null,
  -- Usage tracking
  use_count integer default 0,
  last_used_at timestamptz,
  -- Template status
  is_active boolean default true,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- LinkedIn saved leads table (leads imported from Sales Navigator)
create table public.linkedin_saved_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users,
  -- Sales Navigator lead data
  sales_nav_lead_id text,
  linkedin_url text,
  -- Person info
  first_name text not null,
  last_name text,
  headline text,
  location text,
  profile_picture_url text,
  -- Company info
  company_name text,
  company_linkedin_url text,
  company_industry text,
  company_size text,
  -- Recommendation info
  lead_score integer,
  recommendation_reason text,
  -- Import status
  imported_to_lead_id uuid references public.leads on delete set null,
  imported_to_contact_id uuid references public.contacts on delete set null,
  imported_at timestamptz,
  -- List info
  list_name text,
  list_id text,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Unique per tenant
  unique(tenant_id, sales_nav_lead_id)
);

-- LinkedIn integration settings per tenant
create table public.linkedin_integration_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null unique,
  -- Integration method
  integration_method text default 'api' check (integration_method in ('api', 'extension', 'manual')),
  -- API credentials (encrypted in practice)
  api_key_encrypted text,
  api_secret_encrypted text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  -- RocketReach integration (for profile lookup)
  rocketreach_api_key_encrypted text,
  -- Settings
  auto_sync_enabled boolean default false,
  sync_interval_hours integer default 24,
  auto_log_activities boolean default true,
  -- Last sync info
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index linkedin_profiles_tenant_id_idx on public.linkedin_profiles(tenant_id);
create index linkedin_profiles_contact_id_idx on public.linkedin_profiles(contact_id);
create index linkedin_profiles_lead_id_idx on public.linkedin_profiles(lead_id);
create index linkedin_profiles_linkedin_id_idx on public.linkedin_profiles(linkedin_id);
create index linkedin_profiles_connection_status_idx on public.linkedin_profiles(connection_status);

create index linkedin_activities_tenant_id_idx on public.linkedin_activities(tenant_id);
create index linkedin_activities_profile_id_idx on public.linkedin_activities(linkedin_profile_id);
create index linkedin_activities_type_idx on public.linkedin_activities(activity_type);
create index linkedin_activities_created_at_idx on public.linkedin_activities(created_at);

create index linkedin_inmail_templates_tenant_id_idx on public.linkedin_inmail_templates(tenant_id);
create index linkedin_inmail_templates_user_id_idx on public.linkedin_inmail_templates(user_id);

create index linkedin_saved_leads_tenant_id_idx on public.linkedin_saved_leads(tenant_id);
create index linkedin_saved_leads_user_id_idx on public.linkedin_saved_leads(user_id);
create index linkedin_saved_leads_imported_idx on public.linkedin_saved_leads(imported_at);

-- Enable RLS
alter table public.linkedin_profiles enable row level security;
alter table public.linkedin_activities enable row level security;
alter table public.linkedin_inmail_templates enable row level security;
alter table public.linkedin_saved_leads enable row level security;
alter table public.linkedin_integration_settings enable row level security;

-- RLS Policies for linkedin_profiles
create policy "Users can view own tenant LinkedIn profiles"
  on public.linkedin_profiles for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant LinkedIn profiles"
  on public.linkedin_profiles for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant LinkedIn profiles"
  on public.linkedin_profiles for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant LinkedIn profiles"
  on public.linkedin_profiles for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for linkedin_activities
create policy "Users can view own tenant LinkedIn activities"
  on public.linkedin_activities for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant LinkedIn activities"
  on public.linkedin_activities for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant LinkedIn activities"
  on public.linkedin_activities for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant LinkedIn activities"
  on public.linkedin_activities for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for linkedin_inmail_templates
create policy "Users can view own tenant InMail templates"
  on public.linkedin_inmail_templates for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant InMail templates"
  on public.linkedin_inmail_templates for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant InMail templates"
  on public.linkedin_inmail_templates for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant InMail templates"
  on public.linkedin_inmail_templates for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for linkedin_saved_leads
create policy "Users can view own tenant saved leads"
  on public.linkedin_saved_leads for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant saved leads"
  on public.linkedin_saved_leads for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant saved leads"
  on public.linkedin_saved_leads for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant saved leads"
  on public.linkedin_saved_leads for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for linkedin_integration_settings (admin only)
create policy "Admins can view own tenant LinkedIn settings"
  on public.linkedin_integration_settings for select
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage LinkedIn settings"
  on public.linkedin_integration_settings for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Updated at triggers
create trigger linkedin_profiles_updated_at before update on public.linkedin_profiles
  for each row execute procedure public.handle_updated_at();

create trigger linkedin_inmail_templates_updated_at before update on public.linkedin_inmail_templates
  for each row execute procedure public.handle_updated_at();

create trigger linkedin_saved_leads_updated_at before update on public.linkedin_saved_leads
  for each row execute procedure public.handle_updated_at();

create trigger linkedin_integration_settings_updated_at before update on public.linkedin_integration_settings
  for each row execute procedure public.handle_updated_at();
