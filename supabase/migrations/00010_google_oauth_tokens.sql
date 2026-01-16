-- Google OAuth Tokens Schema
-- Stores Google OAuth tokens separately from session for reliable API access
-- and background token refresh capabilities

-- Google tokens table
create table public.google_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users on delete cascade not null unique,
  -- Token data (encrypted at rest via Supabase Vault in production)
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  -- Token metadata
  expires_at timestamptz not null,
  scopes text[] not null default '{}',
  -- Token info from Google
  token_type text default 'Bearer',
  -- Tracking
  last_refreshed_at timestamptz,
  refresh_error text,
  refresh_error_at timestamptz,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index google_tokens_user_id_idx on public.google_tokens(user_id);
create index google_tokens_expires_at_idx on public.google_tokens(expires_at);

-- Enable RLS
alter table public.google_tokens enable row level security;

-- RLS Policies for google_tokens
-- Users can only access their own tokens
create policy "Users can view own Google tokens"
  on public.google_tokens for select
  using (user_id = auth.uid());

create policy "Users can insert own Google tokens"
  on public.google_tokens for insert
  with check (user_id = auth.uid());

create policy "Users can update own Google tokens"
  on public.google_tokens for update
  using (user_id = auth.uid());

create policy "Users can delete own Google tokens"
  on public.google_tokens for delete
  using (user_id = auth.uid());

-- Updated at trigger
create trigger google_tokens_updated_at before update on public.google_tokens
  for each row execute procedure public.handle_updated_at();

-- Function to check if token needs refresh (expires within 5 minutes)
create or replace function public.google_token_needs_refresh(token_user_id uuid)
returns boolean as $$
declare
  token_expires_at timestamptz;
begin
  select expires_at into token_expires_at
  from public.google_tokens
  where user_id = token_user_id;

  if token_expires_at is null then
    return true;
  end if;

  -- Return true if token expires within 5 minutes
  return token_expires_at < (now() + interval '5 minutes');
end;
$$ language plpgsql security definer;

-- Function to update token after refresh
create or replace function public.update_google_token(
  p_user_id uuid,
  p_access_token_encrypted text,
  p_refresh_token_encrypted text default null,
  p_expires_at timestamptz default null,
  p_scopes text[] default null
)
returns public.google_tokens as $$
declare
  result public.google_tokens;
begin
  update public.google_tokens
  set
    access_token_encrypted = p_access_token_encrypted,
    refresh_token_encrypted = coalesce(p_refresh_token_encrypted, refresh_token_encrypted),
    expires_at = coalesce(p_expires_at, expires_at),
    scopes = coalesce(p_scopes, scopes),
    last_refreshed_at = now(),
    refresh_error = null,
    refresh_error_at = null,
    updated_at = now()
  where user_id = p_user_id
  returning * into result;

  return result;
end;
$$ language plpgsql security definer;

-- Function to record token refresh error
create or replace function public.record_google_token_error(
  p_user_id uuid,
  p_error text
)
returns void as $$
begin
  update public.google_tokens
  set
    refresh_error = p_error,
    refresh_error_at = now(),
    updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- Function to upsert Google token (for initial storage and updates)
create or replace function public.upsert_google_token(
  p_user_id uuid,
  p_access_token_encrypted text,
  p_refresh_token_encrypted text,
  p_expires_at timestamptz,
  p_scopes text[]
)
returns public.google_tokens as $$
declare
  result public.google_tokens;
begin
  insert into public.google_tokens (
    user_id,
    access_token_encrypted,
    refresh_token_encrypted,
    expires_at,
    scopes
  ) values (
    p_user_id,
    p_access_token_encrypted,
    p_refresh_token_encrypted,
    p_expires_at,
    p_scopes
  )
  on conflict (user_id) do update set
    access_token_encrypted = excluded.access_token_encrypted,
    refresh_token_encrypted = coalesce(excluded.refresh_token_encrypted, google_tokens.refresh_token_encrypted),
    expires_at = excluded.expires_at,
    scopes = excluded.scopes,
    last_refreshed_at = now(),
    refresh_error = null,
    refresh_error_at = null,
    updated_at = now()
  returning * into result;

  return result;
end;
$$ language plpgsql security definer;

-- Grant execute permissions on functions
grant execute on function public.google_token_needs_refresh(uuid) to authenticated;
grant execute on function public.update_google_token(uuid, text, text, timestamptz, text[]) to authenticated;
grant execute on function public.record_google_token_error(uuid, text) to authenticated;
grant execute on function public.upsert_google_token(uuid, text, text, timestamptz, text[]) to authenticated;
