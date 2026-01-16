-- Audit Trail and Change History
-- Comprehensive logging for all CRM record changes

-- Audit operation type enum
create type public.audit_operation as enum ('create', 'update', 'delete');

-- Main audit logs table
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,

  -- What was changed
  entity_type text not null,
  entity_id uuid not null,
  entity_name text, -- Cached name for display (e.g., contact name, deal name)

  -- What operation was performed
  operation public.audit_operation not null,

  -- Who made the change
  user_id uuid references public.users,
  user_email text, -- Cached for when user is deleted
  user_name text,  -- Cached for when user is deleted

  -- When the change was made
  changed_at timestamptz default now() not null,

  -- Change details (JSONB for flexibility)
  changes jsonb not null default '[]',
  -- Structure: [{ field: string, old_value: any, new_value: any, field_label: string }]

  -- Old and new record snapshots for compliance
  old_values jsonb,
  new_values jsonb,

  -- Additional metadata
  ip_address inet,
  user_agent text,
  source text default 'web', -- 'web', 'api', 'import', 'workflow', 'system'

  -- Compliance fields
  is_immutable boolean default true not null,
  retention_until timestamptz, -- When this log can be deleted (for retention policies)

  created_at timestamptz default now() not null
);

-- Audit log settings per tenant
create table public.audit_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null unique,

  -- What to track
  track_creates boolean default true not null,
  track_updates boolean default true not null,
  track_deletes boolean default true not null,

  -- Entities to track (empty means all)
  tracked_entities text[] default array['accounts', 'contacts', 'leads', 'deals', 'tasks', 'campaigns', 'products'],

  -- Fields to exclude from tracking (sensitive data)
  excluded_fields text[] default array[]::text[],

  -- Retention policy
  retention_days integer default 365 not null, -- Keep logs for 1 year by default

  -- Compliance settings
  enable_data_export boolean default true not null,
  gdpr_mode boolean default false not null, -- Stricter data handling

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes for performance
create index audit_logs_tenant_id_idx on public.audit_logs(tenant_id);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_changed_at_idx on public.audit_logs(changed_at desc);
create index audit_logs_tenant_changed_at_idx on public.audit_logs(tenant_id, changed_at desc);
create index audit_logs_operation_idx on public.audit_logs(operation);
create index audit_logs_source_idx on public.audit_logs(source);

-- Composite index for entity history queries
create index audit_logs_entity_history_idx on public.audit_logs(tenant_id, entity_type, entity_id, changed_at desc);

-- Composite index for user activity queries
create index audit_logs_user_activity_idx on public.audit_logs(tenant_id, user_id, changed_at desc);

-- Enable RLS
alter table public.audit_logs enable row level security;
alter table public.audit_settings enable row level security;

-- RLS Policies for audit_logs
-- Users can view audit logs in their tenant
create policy "Users can view own tenant audit logs"
  on public.audit_logs for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Only system/triggers can insert audit logs (or admins via service role)
create policy "System can insert audit logs"
  on public.audit_logs for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Audit logs are immutable - no updates allowed via RLS
-- (Actual immutability enforced by trigger below)

-- No delete policy - audit logs cannot be deleted by users

-- RLS Policies for audit_settings
create policy "Users can view own tenant audit settings"
  on public.audit_settings for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage audit settings"
  on public.audit_settings for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role in ('admin', 'sales_manager')
    )
  );

-- Trigger to prevent updates to immutable audit logs
create or replace function public.prevent_audit_log_modification()
returns trigger as $$
begin
  if old.is_immutable then
    raise exception 'Audit logs are immutable and cannot be modified';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger audit_logs_immutable before update on public.audit_logs
  for each row execute procedure public.prevent_audit_log_modification();

-- Trigger to prevent deletion of audit logs
create or replace function public.prevent_audit_log_deletion()
returns trigger as $$
begin
  -- Only allow deletion if retention_until has passed
  if old.retention_until is null or old.retention_until > now() then
    raise exception 'Audit logs cannot be deleted before retention period expires';
  end if;
  return old;
end;
$$ language plpgsql;

create trigger audit_logs_no_delete before delete on public.audit_logs
  for each row execute procedure public.prevent_audit_log_deletion();

-- Updated at trigger for audit_settings
create trigger audit_settings_updated_at before update on public.audit_settings
  for each row execute procedure public.handle_updated_at();

-- Function to get entity display name
create or replace function public.get_entity_display_name(
  p_entity_type text,
  p_entity_id uuid
)
returns text as $$
declare
  v_name text;
begin
  case p_entity_type
    when 'contact' then
      select first_name || coalesce(' ' || last_name, '') into v_name
      from public.contacts where id = p_entity_id;
    when 'lead' then
      select first_name || coalesce(' ' || last_name, '') into v_name
      from public.leads where id = p_entity_id;
    when 'account' then
      select name into v_name from public.accounts where id = p_entity_id;
    when 'deal' then
      select name into v_name from public.deals where id = p_entity_id;
    when 'task' then
      select subject into v_name from public.tasks where id = p_entity_id;
    when 'campaign' then
      select name into v_name from public.campaigns where id = p_entity_id;
    when 'product' then
      select name into v_name from public.products where id = p_entity_id;
    else
      v_name := null;
  end case;

  return v_name;
end;
$$ language plpgsql security definer;

-- Function to create an audit log entry
create or replace function public.create_audit_log(
  p_tenant_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_operation public.audit_operation,
  p_user_id uuid,
  p_changes jsonb,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_source text default 'web',
  p_ip_address inet default null,
  p_user_agent text default null
)
returns uuid as $$
declare
  v_log_id uuid;
  v_user_email text;
  v_user_name text;
  v_entity_name text;
  v_settings public.audit_settings%rowtype;
  v_retention_until timestamptz;
begin
  -- Get audit settings for tenant
  select * into v_settings from public.audit_settings where tenant_id = p_tenant_id;

  -- If no settings, use defaults
  if not found then
    v_retention_until := now() + interval '365 days';
  else
    -- Check if we should track this operation
    if p_operation = 'create' and not v_settings.track_creates then
      return null;
    end if;
    if p_operation = 'update' and not v_settings.track_updates then
      return null;
    end if;
    if p_operation = 'delete' and not v_settings.track_deletes then
      return null;
    end if;

    -- Check if we should track this entity type
    if v_settings.tracked_entities is not null and
       array_length(v_settings.tracked_entities, 1) > 0 and
       not (p_entity_type = any(v_settings.tracked_entities)) then
      return null;
    end if;

    v_retention_until := now() + (v_settings.retention_days || ' days')::interval;
  end if;

  -- Get user info
  if p_user_id is not null then
    select email, full_name into v_user_email, v_user_name
    from public.users where id = p_user_id;
  end if;

  -- Get entity display name
  v_entity_name := public.get_entity_display_name(p_entity_type, p_entity_id);

  -- Insert audit log
  insert into public.audit_logs (
    tenant_id,
    entity_type,
    entity_id,
    entity_name,
    operation,
    user_id,
    user_email,
    user_name,
    changes,
    old_values,
    new_values,
    source,
    ip_address,
    user_agent,
    retention_until
  ) values (
    p_tenant_id,
    p_entity_type,
    p_entity_id,
    v_entity_name,
    p_operation,
    p_user_id,
    v_user_email,
    v_user_name,
    p_changes,
    p_old_values,
    p_new_values,
    p_source,
    p_ip_address,
    p_user_agent,
    v_retention_until
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$ language plpgsql security definer;

-- Function to compare two JSONB objects and return changes
create or replace function public.get_field_changes(
  p_old_values jsonb,
  p_new_values jsonb,
  p_excluded_fields text[] default array[]::text[]
)
returns jsonb as $$
declare
  v_changes jsonb := '[]'::jsonb;
  v_key text;
  v_old_value jsonb;
  v_new_value jsonb;
begin
  -- Handle nulls
  if p_old_values is null and p_new_values is null then
    return '[]'::jsonb;
  end if;

  if p_old_values is null then
    p_old_values := '{}'::jsonb;
  end if;

  if p_new_values is null then
    p_new_values := '{}'::jsonb;
  end if;

  -- Compare all keys from both old and new values
  for v_key in
    select distinct key from (
      select jsonb_object_keys(p_old_values) as key
      union
      select jsonb_object_keys(p_new_values) as key
    ) keys
    where key not in (select unnest(p_excluded_fields))
      and key not in ('id', 'tenant_id', 'created_at', 'updated_at')
  loop
    v_old_value := p_old_values->v_key;
    v_new_value := p_new_values->v_key;

    -- Compare values
    if (v_old_value is distinct from v_new_value) then
      v_changes := v_changes || jsonb_build_object(
        'field', v_key,
        'old_value', v_old_value,
        'new_value', v_new_value,
        'field_label', initcap(replace(v_key, '_', ' '))
      );
    end if;
  end loop;

  return v_changes;
end;
$$ language plpgsql immutable;

-- Generic audit trigger function for any table
create or replace function public.audit_trigger_function()
returns trigger as $$
declare
  v_entity_type text;
  v_entity_id uuid;
  v_tenant_id uuid;
  v_user_id uuid;
  v_operation public.audit_operation;
  v_changes jsonb;
  v_old_values jsonb;
  v_new_values jsonb;
  v_excluded_fields text[];
begin
  -- Determine entity type from table name
  v_entity_type := TG_TABLE_NAME;

  -- Handle plural table names
  if v_entity_type like '%s' then
    v_entity_type := left(v_entity_type, length(v_entity_type) - 1);
  end if;

  -- Get excluded fields from settings
  select excluded_fields into v_excluded_fields
  from public.audit_settings
  where tenant_id = coalesce(new.tenant_id, old.tenant_id);

  if v_excluded_fields is null then
    v_excluded_fields := array[]::text[];
  end if;

  -- Determine operation and values
  if TG_OP = 'INSERT' then
    v_operation := 'create';
    v_entity_id := new.id;
    v_tenant_id := new.tenant_id;
    v_old_values := null;
    v_new_values := to_jsonb(new);
    v_changes := '[]'::jsonb; -- No changes for create, just the new record

    -- Try to get user from auth context
    v_user_id := auth.uid();

  elsif TG_OP = 'UPDATE' then
    v_operation := 'update';
    v_entity_id := new.id;
    v_tenant_id := new.tenant_id;
    v_old_values := to_jsonb(old);
    v_new_values := to_jsonb(new);
    v_changes := public.get_field_changes(v_old_values, v_new_values, v_excluded_fields);

    -- Skip if no actual changes
    if v_changes = '[]'::jsonb then
      return new;
    end if;

    v_user_id := auth.uid();

  elsif TG_OP = 'DELETE' then
    v_operation := 'delete';
    v_entity_id := old.id;
    v_tenant_id := old.tenant_id;
    v_old_values := to_jsonb(old);
    v_new_values := null;
    v_changes := '[]'::jsonb;

    v_user_id := auth.uid();
  end if;

  -- Create the audit log
  perform public.create_audit_log(
    p_tenant_id := v_tenant_id,
    p_entity_type := v_entity_type,
    p_entity_id := v_entity_id,
    p_operation := v_operation,
    p_user_id := v_user_id,
    p_changes := v_changes,
    p_old_values := v_old_values,
    p_new_values := v_new_values,
    p_source := 'system'
  );

  -- Return appropriate value
  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- Create audit triggers for main entities
-- Note: These triggers run AFTER the operation to capture the final state

create trigger accounts_audit_trigger
  after insert or update or delete on public.accounts
  for each row execute procedure public.audit_trigger_function();

create trigger contacts_audit_trigger
  after insert or update or delete on public.contacts
  for each row execute procedure public.audit_trigger_function();

create trigger leads_audit_trigger
  after insert or update or delete on public.leads
  for each row execute procedure public.audit_trigger_function();

create trigger deals_audit_trigger
  after insert or update or delete on public.deals
  for each row execute procedure public.audit_trigger_function();

create trigger tasks_audit_trigger
  after insert or update or delete on public.tasks
  for each row execute procedure public.audit_trigger_function();

-- Function to export audit logs for GDPR data access requests
create or replace function public.export_user_audit_data(
  p_user_id uuid,
  p_tenant_id uuid
)
returns jsonb as $$
declare
  v_result jsonb;
begin
  -- Verify the requesting user has access
  if not exists (
    select 1 from public.users
    where id = auth.uid()
    and tenant_id = p_tenant_id
    and role in ('admin', 'sales_manager')
  ) then
    raise exception 'Unauthorized: Only admins can export audit data';
  end if;

  select jsonb_build_object(
    'user_id', p_user_id,
    'exported_at', now(),
    'total_actions', count(*),
    'actions', jsonb_agg(
      jsonb_build_object(
        'id', id,
        'entity_type', entity_type,
        'entity_id', entity_id,
        'entity_name', entity_name,
        'operation', operation,
        'changed_at', changed_at,
        'changes', changes,
        'source', source
      ) order by changed_at desc
    )
  )
  into v_result
  from public.audit_logs
  where tenant_id = p_tenant_id
  and user_id = p_user_id;

  return v_result;
end;
$$ language plpgsql security definer;

-- Function to clean up expired audit logs (run via cron job)
create or replace function public.cleanup_expired_audit_logs()
returns integer as $$
declare
  v_deleted_count integer;
begin
  -- Delete logs where retention period has passed
  with deleted as (
    delete from public.audit_logs
    where retention_until is not null
    and retention_until < now()
    and is_immutable = false -- Extra safety check
    returning id
  )
  select count(*) into v_deleted_count from deleted;

  return v_deleted_count;
end;
$$ language plpgsql security definer;

-- Initialize default audit settings for existing tenants
insert into public.audit_settings (tenant_id)
select id from public.tenants
on conflict (tenant_id) do nothing;
