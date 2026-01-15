-- Drive links table (links Google Drive files to CRM entities)
create table public.drive_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users,
  -- Google Drive file info (stored locally for quick access)
  file_id text not null,
  file_name text not null,
  file_mime_type text,
  file_size bigint,
  file_web_view_link text,
  file_icon_link text,
  -- Linked CRM entity
  entity_type text not null, -- 'deal', 'contact', 'account', 'lead'
  entity_id uuid not null,
  -- Optional notes about the file
  notes text,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Unique constraint: prevent duplicate links of same file to same entity
  unique(tenant_id, file_id, entity_type, entity_id)
);

-- Indexes for common queries
create index drive_links_tenant_id_idx on public.drive_links(tenant_id);
create index drive_links_user_id_idx on public.drive_links(user_id);
create index drive_links_file_id_idx on public.drive_links(file_id);
create index drive_links_entity_idx on public.drive_links(entity_type, entity_id);

-- Enable RLS
alter table public.drive_links enable row level security;

-- RLS Policies for drive_links
create policy "Users can view own tenant drive links"
  on public.drive_links for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant drive links"
  on public.drive_links for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant drive links"
  on public.drive_links for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant drive links"
  on public.drive_links for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at trigger
create trigger drive_links_updated_at before update on public.drive_links
  for each row execute procedure public.handle_updated_at();
