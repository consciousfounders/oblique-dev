-- Notes table (rich text notes attached to CRM entities)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete set null,
  -- Linked CRM entity
  entity_type text not null, -- 'deal', 'contact', 'account', 'lead'
  entity_id uuid not null,
  -- Note content
  content text not null,
  content_plain text, -- Plain text version for search
  -- Pinned notes appear at top
  is_pinned boolean default false not null,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for common queries
create index notes_tenant_id_idx on public.notes(tenant_id);
create index notes_user_id_idx on public.notes(user_id);
create index notes_entity_idx on public.notes(entity_type, entity_id);
create index notes_created_at_idx on public.notes(created_at desc);
create index notes_is_pinned_idx on public.notes(is_pinned) where is_pinned = true;
-- Full-text search index on plain content
create index notes_content_search_idx on public.notes using gin(to_tsvector('english', coalesce(content_plain, '')));

-- Enable RLS
alter table public.notes enable row level security;

-- RLS Policies for notes
create policy "Users can view own tenant notes"
  on public.notes for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant notes"
  on public.notes for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant notes"
  on public.notes for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant notes"
  on public.notes for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at trigger
create trigger notes_updated_at before update on public.notes
  for each row execute procedure public.handle_updated_at();


-- Attachments table (file attachments to CRM entities)
-- Supports both Supabase Storage uploads and Google Drive links
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  user_id uuid references public.users on delete set null,
  -- Linked CRM entity
  entity_type text not null, -- 'deal', 'contact', 'account', 'lead'
  entity_id uuid not null,
  -- File info
  file_name text not null,
  file_size bigint,
  file_mime_type text,
  -- Storage location (either Supabase storage path or external URL)
  storage_type text not null default 'supabase', -- 'supabase', 'google_drive', 'external'
  storage_path text, -- Path in Supabase storage bucket
  external_url text, -- URL for Google Drive or external files
  -- Google Drive specific
  drive_file_id text, -- Google Drive file ID for linked files
  -- Version tracking
  version integer default 1 not null,
  parent_attachment_id uuid references public.attachments on delete set null, -- For version history
  -- Optional description
  description text,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for common queries
create index attachments_tenant_id_idx on public.attachments(tenant_id);
create index attachments_user_id_idx on public.attachments(user_id);
create index attachments_entity_idx on public.attachments(entity_type, entity_id);
create index attachments_storage_type_idx on public.attachments(storage_type);
create index attachments_drive_file_id_idx on public.attachments(drive_file_id) where drive_file_id is not null;
create index attachments_parent_idx on public.attachments(parent_attachment_id) where parent_attachment_id is not null;
create index attachments_created_at_idx on public.attachments(created_at desc);

-- Enable RLS
alter table public.attachments enable row level security;

-- RLS Policies for attachments
create policy "Users can view own tenant attachments"
  on public.attachments for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant attachments"
  on public.attachments for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant attachments"
  on public.attachments for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant attachments"
  on public.attachments for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at trigger
create trigger attachments_updated_at before update on public.attachments
  for each row execute procedure public.handle_updated_at();


-- Note mentions table (for @mentions in notes)
create table public.note_mentions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid references public.notes on delete cascade not null,
  mentioned_user_id uuid references public.users on delete cascade not null,
  created_at timestamptz default now() not null,
  -- Unique constraint: prevent duplicate mentions in same note
  unique(note_id, mentioned_user_id)
);

-- Indexes
create index note_mentions_note_id_idx on public.note_mentions(note_id);
create index note_mentions_user_id_idx on public.note_mentions(mentioned_user_id);

-- Enable RLS
alter table public.note_mentions enable row level security;

-- RLS Policies for note_mentions
create policy "Users can view mentions in their tenant notes"
  on public.note_mentions for select
  using (note_id in (
    select id from public.notes
    where tenant_id in (select tenant_id from public.users where id = auth.uid())
  ));

create policy "Users can insert mentions in their tenant notes"
  on public.note_mentions for insert
  with check (note_id in (
    select id from public.notes
    where tenant_id in (select tenant_id from public.users where id = auth.uid())
  ));

create policy "Users can delete mentions in their tenant notes"
  on public.note_mentions for delete
  using (note_id in (
    select id from public.notes
    where tenant_id in (select tenant_id from public.users where id = auth.uid())
  ));


-- Storage quota tracking table
create table public.storage_quotas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null unique,
  max_storage_bytes bigint default 5368709120 not null, -- 5GB default
  used_storage_bytes bigint default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index storage_quotas_tenant_id_idx on public.storage_quotas(tenant_id);

-- Enable RLS
alter table public.storage_quotas enable row level security;

-- RLS Policies for storage_quotas
create policy "Users can view own tenant storage quota"
  on public.storage_quotas for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant storage quota"
  on public.storage_quotas for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at trigger
create trigger storage_quotas_updated_at before update on public.storage_quotas
  for each row execute procedure public.handle_updated_at();


-- Function to update storage quota when attachments are added/removed
create or replace function public.update_storage_quota()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.storage_quotas
    set used_storage_bytes = used_storage_bytes + coalesce(NEW.file_size, 0)
    where tenant_id = NEW.tenant_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.storage_quotas
    set used_storage_bytes = used_storage_bytes - coalesce(OLD.file_size, 0)
    where tenant_id = OLD.tenant_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Triggers for storage quota updates
create trigger attachments_quota_insert after insert on public.attachments
  for each row execute procedure public.update_storage_quota();

create trigger attachments_quota_delete after delete on public.attachments
  for each row execute procedure public.update_storage_quota();
