-- Quota period type enum
create type public.quota_period_type as enum ('monthly', 'quarterly', 'yearly');

-- Forecast type enum
create type public.forecast_type as enum ('pipeline', 'commit', 'best_case', 'ai_predicted');

-- Forecast category enum
create type public.forecast_category as enum ('pipeline', 'commit', 'best_case', 'omitted');

-- Quotas table - track sales quotas by rep and period
create table public.quotas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  period_type public.quota_period_type not null,
  period_start date not null,
  period_end date not null,
  quota_amount numeric(14,2) not null,
  territory_id uuid references public.territories on delete set null,
  team_id uuid references public.teams on delete set null,
  product_category text,
  created_by uuid references public.users on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(tenant_id, user_id, period_type, period_start)
);

-- Forecast entries table - store forecast snapshots over time
create table public.forecast_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  period_type public.quota_period_type not null,
  period_start date not null,
  period_end date not null,
  forecast_type public.forecast_type not null,
  amount numeric(14,2) not null,
  deal_count integer default 0,
  weighted_amount numeric(14,2),
  manager_override_amount numeric(14,2),
  manager_override_by uuid references public.users on delete set null,
  manager_override_note text,
  manager_override_at timestamptz,
  territory_id uuid references public.territories on delete set null,
  team_id uuid references public.teams on delete set null,
  product_category text,
  snapshot_date date default current_date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Forecast deal snapshots - capture deal details at time of forecast
create table public.forecast_deal_snapshots (
  id uuid primary key default gen_random_uuid(),
  forecast_entry_id uuid references public.forecast_entries on delete cascade not null,
  deal_id uuid references public.deals on delete cascade not null,
  deal_name text not null,
  deal_value numeric(14,2) not null,
  deal_probability integer not null,
  weighted_value numeric(14,2) not null,
  stage_name text not null,
  expected_close_date date,
  forecast_category public.forecast_category default 'pipeline',
  created_at timestamptz default now() not null
);

-- Indexes for quotas
create index quotas_tenant_id_idx on public.quotas(tenant_id);
create index quotas_user_id_idx on public.quotas(user_id);
create index quotas_period_type_idx on public.quotas(period_type);
create index quotas_period_start_idx on public.quotas(period_start);
create index quotas_team_id_idx on public.quotas(team_id);
create index quotas_territory_id_idx on public.quotas(territory_id);

-- Indexes for forecast_entries
create index forecast_entries_tenant_id_idx on public.forecast_entries(tenant_id);
create index forecast_entries_user_id_idx on public.forecast_entries(user_id);
create index forecast_entries_period_type_idx on public.forecast_entries(period_type);
create index forecast_entries_period_start_idx on public.forecast_entries(period_start);
create index forecast_entries_forecast_type_idx on public.forecast_entries(forecast_type);
create index forecast_entries_snapshot_date_idx on public.forecast_entries(snapshot_date);
create index forecast_entries_team_id_idx on public.forecast_entries(team_id);

-- Indexes for forecast_deal_snapshots
create index forecast_deal_snapshots_forecast_entry_id_idx on public.forecast_deal_snapshots(forecast_entry_id);
create index forecast_deal_snapshots_deal_id_idx on public.forecast_deal_snapshots(deal_id);

-- Enable RLS
alter table public.quotas enable row level security;
alter table public.forecast_entries enable row level security;
alter table public.forecast_deal_snapshots enable row level security;

-- RLS Policies for quotas
create policy "Users can view own tenant quotas"
  on public.quotas for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant quotas"
  on public.quotas for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant quotas"
  on public.quotas for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant quotas"
  on public.quotas for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for forecast_entries
create policy "Users can view own tenant forecast_entries"
  on public.forecast_entries for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant forecast_entries"
  on public.forecast_entries for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant forecast_entries"
  on public.forecast_entries for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant forecast_entries"
  on public.forecast_entries for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for forecast_deal_snapshots (via forecast_entry tenant)
create policy "Users can view forecast_deal_snapshots"
  on public.forecast_deal_snapshots for select
  using (
    forecast_entry_id in (
      select id from public.forecast_entries
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert forecast_deal_snapshots"
  on public.forecast_deal_snapshots for insert
  with check (
    forecast_entry_id in (
      select id from public.forecast_entries
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update forecast_deal_snapshots"
  on public.forecast_deal_snapshots for update
  using (
    forecast_entry_id in (
      select id from public.forecast_entries
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete forecast_deal_snapshots"
  on public.forecast_deal_snapshots for delete
  using (
    forecast_entry_id in (
      select id from public.forecast_entries
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- Updated at triggers
create trigger quotas_updated_at before update on public.quotas
  for each row execute procedure public.handle_updated_at();

create trigger forecast_entries_updated_at before update on public.forecast_entries
  for each row execute procedure public.handle_updated_at();
