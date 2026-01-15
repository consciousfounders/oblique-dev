-- Super admin table (your access to manage all tenants)
create table public.super_admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now() not null
);

-- Tenants (companies/instances)
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- User roles enum
create type public.user_role as enum ('admin', 'sdr', 'ae', 'am');

-- Users (per tenant)
create table public.users (
  id uuid primary key references auth.users on delete cascade,
  tenant_id uuid references public.tenants on delete cascade not null,
  email text not null,
  full_name text,
  role public.user_role default 'sdr' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(tenant_id, email)
);

-- Accounts (companies)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  domain text,
  industry text,
  employee_count text,
  annual_revenue text,
  owner_id uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Contacts (people)
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  account_id uuid references public.accounts on delete set null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  title text,
  owner_id uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Lead status enum
create type public.lead_status as enum ('new', 'contacted', 'qualified', 'unqualified', 'converted');

-- Leads
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  company text,
  title text,
  source text,
  status public.lead_status default 'new' not null,
  owner_id uuid references public.users,
  converted_contact_id uuid references public.contacts,
  converted_account_id uuid references public.accounts,
  converted_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Deal stages
create table public.deal_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  position integer not null,
  probability integer default 0,
  created_at timestamptz default now() not null
);

-- Deals
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  value numeric(12,2),
  stage_id uuid references public.deal_stages not null,
  account_id uuid references public.accounts,
  contact_id uuid references public.contacts,
  owner_id uuid references public.users,
  expected_close_date date,
  closed_at timestamptz,
  won boolean,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Activity log
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users,
  entity_type text not null,
  entity_id uuid not null,
  activity_type text not null,
  subject text,
  description text,
  created_at timestamptz default now() not null
);

-- Indexes
create index users_tenant_id_idx on public.users(tenant_id);
create index accounts_tenant_id_idx on public.accounts(tenant_id);
create index contacts_tenant_id_idx on public.contacts(tenant_id);
create index contacts_account_id_idx on public.contacts(account_id);
create index leads_tenant_id_idx on public.leads(tenant_id);
create index leads_status_idx on public.leads(status);
create index deals_tenant_id_idx on public.deals(tenant_id);
create index deals_stage_id_idx on public.deals(stage_id);
create index deal_stages_tenant_id_idx on public.deal_stages(tenant_id);
create index activities_tenant_id_idx on public.activities(tenant_id);
create index activities_entity_idx on public.activities(entity_type, entity_id);

-- Enable RLS
alter table public.super_admins enable row level security;
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.deal_stages enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;

-- RLS Policies for super_admins (only service role can access)
-- No policies needed - service role bypasses RLS

-- RLS Policies for tenants
create policy "Super admins can view all tenants"
  on public.tenants for select
  using (
    exists (select 1 from public.super_admins where email = auth.jwt() ->> 'email')
  );

create policy "Super admins can manage tenants"
  on public.tenants for all
  using (
    exists (select 1 from public.super_admins where email = auth.jwt() ->> 'email')
  );

-- RLS Policies for users
create policy "Users can view own tenant users"
  on public.users for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Super admins can manage users"
  on public.users for all
  using (
    exists (select 1 from public.super_admins where email = auth.jwt() ->> 'email')
  );

-- RLS Policies for accounts
create policy "Users can view own tenant accounts"
  on public.accounts for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant accounts"
  on public.accounts for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant accounts"
  on public.accounts for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant accounts"
  on public.accounts for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for contacts
create policy "Users can view own tenant contacts"
  on public.contacts for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant contacts"
  on public.contacts for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant contacts"
  on public.contacts for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant contacts"
  on public.contacts for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for leads
create policy "Users can view own tenant leads"
  on public.leads for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant leads"
  on public.leads for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant leads"
  on public.leads for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant leads"
  on public.leads for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for deal_stages
create policy "Users can view own tenant deal stages"
  on public.deal_stages for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage deal stages"
  on public.deal_stages for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for deals
create policy "Users can view own tenant deals"
  on public.deals for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant deals"
  on public.deals for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant deals"
  on public.deals for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant deals"
  on public.deals for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for activities
create policy "Users can view own tenant activities"
  on public.activities for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant activities"
  on public.activities for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tenants_updated_at before update on public.tenants
  for each row execute procedure public.handle_updated_at();

create trigger users_updated_at before update on public.users
  for each row execute procedure public.handle_updated_at();

create trigger accounts_updated_at before update on public.accounts
  for each row execute procedure public.handle_updated_at();

create trigger contacts_updated_at before update on public.contacts
  for each row execute procedure public.handle_updated_at();

create trigger leads_updated_at before update on public.leads
  for each row execute procedure public.handle_updated_at();

create trigger deals_updated_at before update on public.deals
  for each row execute procedure public.handle_updated_at();
