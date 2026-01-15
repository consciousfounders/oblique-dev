-- API Keys table for programmatic access
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  key_hash text not null unique, -- SHA-256 hash of the API key
  key_prefix text not null, -- First 8 chars for identification (e.g., "obl_xxxx")
  scopes text[] not null default '{}', -- Array of allowed scopes
  rate_limit_per_minute integer not null default 60,
  rate_limit_per_day integer not null default 10000,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- API Usage tracking table
create table public.api_usage (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys on delete set null,
  tenant_id uuid references public.tenants on delete cascade not null,
  endpoint text not null,
  method text not null,
  status_code integer not null,
  response_time_ms integer,
  request_size_bytes integer,
  response_size_bytes integer,
  ip_address inet,
  user_agent text,
  error_message text,
  created_at timestamptz default now() not null
);

-- API Rate limit tracking (sliding window)
create table public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.api_keys on delete cascade not null,
  window_start timestamptz not null,
  window_type text not null check (window_type in ('minute', 'day')),
  request_count integer not null default 1,
  created_at timestamptz default now() not null,
  unique(api_key_id, window_start, window_type)
);

-- Webhook subscriptions for API events
create table public.webhooks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  url text not null,
  secret text not null, -- For HMAC signature verification
  events text[] not null default '{}', -- Array of subscribed events
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Webhook delivery logs
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id uuid references public.webhooks on delete cascade not null,
  event_type text not null,
  payload jsonb not null,
  response_status integer,
  response_body text,
  delivery_time_ms integer,
  success boolean not null default false,
  retry_count integer not null default 0,
  created_at timestamptz default now() not null
);

-- OAuth applications for third-party integrations
create table public.oauth_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  name text not null,
  description text,
  client_id text not null unique,
  client_secret_hash text not null, -- Hashed client secret
  redirect_uris text[] not null default '{}',
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- OAuth authorization codes (short-lived)
create table public.oauth_codes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.oauth_applications on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  code text not null unique,
  redirect_uri text not null,
  scopes text[] not null default '{}',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now() not null
);

-- OAuth access tokens
create table public.oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.oauth_applications on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  access_token_hash text not null unique,
  refresh_token_hash text unique,
  scopes text[] not null default '{}',
  expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now() not null
);

-- Indexes for performance
create index api_keys_tenant_id_idx on public.api_keys(tenant_id);
create index api_keys_user_id_idx on public.api_keys(user_id);
create index api_keys_key_prefix_idx on public.api_keys(key_prefix);
create index api_keys_active_idx on public.api_keys(tenant_id) where revoked_at is null and (expires_at is null or expires_at > now());

create index api_usage_tenant_id_idx on public.api_usage(tenant_id);
create index api_usage_api_key_id_idx on public.api_usage(api_key_id);
create index api_usage_created_at_idx on public.api_usage(created_at);
create index api_usage_endpoint_idx on public.api_usage(endpoint);

create index api_rate_limits_key_window_idx on public.api_rate_limits(api_key_id, window_start, window_type);

create index webhooks_tenant_id_idx on public.webhooks(tenant_id);
create index webhooks_active_idx on public.webhooks(tenant_id) where is_active = true;

create index webhook_deliveries_webhook_id_idx on public.webhook_deliveries(webhook_id);
create index webhook_deliveries_created_at_idx on public.webhook_deliveries(created_at);

create index oauth_applications_tenant_id_idx on public.oauth_applications(tenant_id);
create index oauth_applications_client_id_idx on public.oauth_applications(client_id);

create index oauth_codes_code_idx on public.oauth_codes(code);
create index oauth_codes_expires_idx on public.oauth_codes(expires_at);

create index oauth_tokens_application_id_idx on public.oauth_tokens(application_id);
create index oauth_tokens_user_id_idx on public.oauth_tokens(user_id);

-- Enable RLS
alter table public.api_keys enable row level security;
alter table public.api_usage enable row level security;
alter table public.api_rate_limits enable row level security;
alter table public.webhooks enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.oauth_applications enable row level security;
alter table public.oauth_codes enable row level security;
alter table public.oauth_tokens enable row level security;

-- RLS Policies for api_keys
create policy "Users can view own tenant API keys"
  on public.api_keys for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can create own API keys"
  on public.api_keys for insert
  with check (
    user_id = auth.uid() and
    tenant_id in (select tenant_id from public.users where id = auth.uid())
  );

create policy "Users can update own API keys"
  on public.api_keys for update
  using (user_id = auth.uid());

create policy "Users can delete own API keys"
  on public.api_keys for delete
  using (user_id = auth.uid());

-- RLS Policies for api_usage (read-only for users, admins can see tenant)
create policy "Admins can view tenant API usage"
  on public.api_usage for select
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can view own API key usage"
  on public.api_usage for select
  using (
    api_key_id in (select id from public.api_keys where user_id = auth.uid())
  );

-- RLS Policies for webhooks
create policy "Users can view own tenant webhooks"
  on public.webhooks for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can create own webhooks"
  on public.webhooks for insert
  with check (
    user_id = auth.uid() and
    tenant_id in (select tenant_id from public.users where id = auth.uid())
  );

create policy "Users can update own webhooks"
  on public.webhooks for update
  using (user_id = auth.uid());

create policy "Users can delete own webhooks"
  on public.webhooks for delete
  using (user_id = auth.uid());

-- RLS Policies for webhook_deliveries
create policy "Users can view own webhook deliveries"
  on public.webhook_deliveries for select
  using (
    webhook_id in (select id from public.webhooks where user_id = auth.uid())
  );

-- RLS Policies for oauth_applications
create policy "Admins can view tenant OAuth apps"
  on public.oauth_applications for select
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can manage tenant OAuth apps"
  on public.oauth_applications for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for oauth_tokens
create policy "Users can view own OAuth tokens"
  on public.oauth_tokens for select
  using (user_id = auth.uid());

create policy "Users can revoke own OAuth tokens"
  on public.oauth_tokens for update
  using (user_id = auth.uid());

-- Updated at triggers
create trigger api_keys_updated_at before update on public.api_keys
  for each row execute procedure public.handle_updated_at();

create trigger webhooks_updated_at before update on public.webhooks
  for each row execute procedure public.handle_updated_at();

create trigger oauth_applications_updated_at before update on public.oauth_applications
  for each row execute procedure public.handle_updated_at();

-- Function to clean up expired data (run periodically)
create or replace function public.cleanup_api_data()
returns void as $$
begin
  -- Delete expired OAuth codes
  delete from public.oauth_codes where expires_at < now();

  -- Delete old rate limit records (older than 1 day)
  delete from public.api_rate_limits where window_start < now() - interval '1 day';

  -- Delete old API usage records (older than 90 days)
  delete from public.api_usage where created_at < now() - interval '90 days';

  -- Delete old webhook deliveries (older than 30 days)
  delete from public.webhook_deliveries where created_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;
