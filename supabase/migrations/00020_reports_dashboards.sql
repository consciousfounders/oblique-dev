-- Report type enum
create type public.report_type as enum ('standard', 'custom');

-- Report object type enum
create type public.report_object_type as enum ('leads', 'contacts', 'accounts', 'deals', 'activities', 'campaigns', 'users');

-- Chart type enum
create type public.chart_type as enum ('bar', 'line', 'pie', 'funnel', 'gauge', 'table', 'kpi');

-- Dashboard widget type enum
create type public.widget_type as enum ('chart', 'kpi', 'list', 'activity_feed');

-- Reports table - store report definitions
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  report_type public.report_type default 'custom' not null,
  object_type public.report_object_type not null,
  -- Report configuration
  fields text[] not null default '{}',
  filters jsonb default '[]',
  grouping text,
  summarization jsonb default '{}',
  sort_field text,
  sort_direction text default 'asc',
  -- Standard report identifier (for built-in reports)
  standard_report_key text,
  -- Visualization settings
  chart_type public.chart_type default 'table',
  chart_config jsonb default '{}',
  -- Access control
  is_public boolean default false,
  owner_id uuid references public.users on delete set null,
  shared_with_roles text[] default '{}',
  -- Scheduling
  schedule_enabled boolean default false,
  schedule_cron text,
  schedule_recipients text[] default '{}',
  last_run_at timestamptz,
  -- Cache settings
  cache_enabled boolean default true,
  cache_ttl_minutes integer default 15,
  cached_at timestamptz,
  cached_results jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Dashboards table - store dashboard definitions
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  -- Layout configuration
  layout jsonb default '[]',
  -- Access control
  is_default boolean default false,
  is_public boolean default false,
  owner_id uuid references public.users on delete set null,
  shared_with_roles text[] default '{}',
  -- Settings
  auto_refresh_enabled boolean default false,
  auto_refresh_interval integer default 300, -- seconds
  date_range_type text default 'last_30_days',
  date_range_start date,
  date_range_end date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Dashboard widgets table - store individual widgets
create table public.dashboard_widgets (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid references public.dashboards on delete cascade not null,
  report_id uuid references public.reports on delete cascade,
  -- Widget configuration
  widget_type public.widget_type not null,
  title text not null,
  -- Position and size (for grid layout)
  position_x integer default 0,
  position_y integer default 0,
  width integer default 4,
  height integer default 3,
  -- Widget-specific settings
  config jsonb default '{}',
  -- KPI-specific fields
  kpi_metric text,
  kpi_target numeric(14,2),
  kpi_comparison_type text, -- 'previous_period', 'target', 'none'
  -- Chart override (can override report's chart settings)
  chart_type public.chart_type,
  chart_config jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Report executions - track report runs for auditing
create table public.report_executions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete set null,
  execution_type text default 'manual', -- 'manual', 'scheduled', 'api'
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  row_count integer,
  execution_time_ms integer,
  filters_applied jsonb,
  export_format text, -- 'csv', 'excel', null
  error_message text
);

-- Saved filters - allow users to save commonly used filters
create table public.saved_report_filters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  object_type public.report_object_type not null,
  filters jsonb not null default '[]',
  is_default boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for reports
create index reports_tenant_id_idx on public.reports(tenant_id);
create index reports_owner_id_idx on public.reports(owner_id);
create index reports_report_type_idx on public.reports(report_type);
create index reports_object_type_idx on public.reports(object_type);
create index reports_standard_report_key_idx on public.reports(standard_report_key);

-- Indexes for dashboards
create index dashboards_tenant_id_idx on public.dashboards(tenant_id);
create index dashboards_owner_id_idx on public.dashboards(owner_id);
create index dashboards_is_default_idx on public.dashboards(is_default);

-- Indexes for dashboard_widgets
create index dashboard_widgets_dashboard_id_idx on public.dashboard_widgets(dashboard_id);
create index dashboard_widgets_report_id_idx on public.dashboard_widgets(report_id);

-- Indexes for report_executions
create index report_executions_report_id_idx on public.report_executions(report_id);
create index report_executions_tenant_id_idx on public.report_executions(tenant_id);
create index report_executions_user_id_idx on public.report_executions(user_id);
create index report_executions_started_at_idx on public.report_executions(started_at);

-- Indexes for saved_report_filters
create index saved_report_filters_tenant_id_idx on public.saved_report_filters(tenant_id);
create index saved_report_filters_user_id_idx on public.saved_report_filters(user_id);
create index saved_report_filters_object_type_idx on public.saved_report_filters(object_type);

-- Enable RLS
alter table public.reports enable row level security;
alter table public.dashboards enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.report_executions enable row level security;
alter table public.saved_report_filters enable row level security;

-- RLS Policies for reports
create policy "Users can view own tenant reports"
  on public.reports for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant reports"
  on public.reports for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant reports"
  on public.reports for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant reports"
  on public.reports for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for dashboards
create policy "Users can view own tenant dashboards"
  on public.dashboards for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant dashboards"
  on public.dashboards for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant dashboards"
  on public.dashboards for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant dashboards"
  on public.dashboards for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for dashboard_widgets (via dashboard tenant)
create policy "Users can view dashboard_widgets"
  on public.dashboard_widgets for select
  using (
    dashboard_id in (
      select id from public.dashboards
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can insert dashboard_widgets"
  on public.dashboard_widgets for insert
  with check (
    dashboard_id in (
      select id from public.dashboards
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can update dashboard_widgets"
  on public.dashboard_widgets for update
  using (
    dashboard_id in (
      select id from public.dashboards
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Users can delete dashboard_widgets"
  on public.dashboard_widgets for delete
  using (
    dashboard_id in (
      select id from public.dashboards
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for report_executions
create policy "Users can view own tenant report_executions"
  on public.report_executions for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant report_executions"
  on public.report_executions for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for saved_report_filters
create policy "Users can view own saved_report_filters"
  on public.saved_report_filters for select
  using (user_id = auth.uid() or tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own saved_report_filters"
  on public.saved_report_filters for insert
  with check (user_id = auth.uid());

create policy "Users can update own saved_report_filters"
  on public.saved_report_filters for update
  using (user_id = auth.uid());

create policy "Users can delete own saved_report_filters"
  on public.saved_report_filters for delete
  using (user_id = auth.uid());

-- Updated at triggers
create trigger reports_updated_at before update on public.reports
  for each row execute procedure public.handle_updated_at();

create trigger dashboards_updated_at before update on public.dashboards
  for each row execute procedure public.handle_updated_at();

create trigger dashboard_widgets_updated_at before update on public.dashboard_widgets
  for each row execute procedure public.handle_updated_at();

create trigger saved_report_filters_updated_at before update on public.saved_report_filters
  for each row execute procedure public.handle_updated_at();
