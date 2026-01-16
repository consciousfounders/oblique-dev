-- Custom field types
create type public.custom_field_type as enum (
  'text',
  'textarea',
  'number',
  'decimal',
  'currency',
  'date',
  'datetime',
  'picklist',
  'multi_picklist',
  'checkbox',
  'url',
  'email',
  'phone',
  'lookup'
);

-- Module types for custom fields
create type public.custom_field_module as enum (
  'accounts',
  'contacts',
  'leads',
  'deals'
);

-- Custom field definitions table
create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  module public.custom_field_module not null,
  -- Field identification
  name text not null, -- internal name (snake_case)
  label text not null, -- display label
  description text,
  -- Field type and configuration
  field_type public.custom_field_type not null,
  -- Validation rules
  is_required boolean default false not null,
  is_unique boolean default false not null,
  default_value text,
  -- For number/decimal/currency fields
  min_value numeric,
  max_value numeric,
  decimal_places integer default 2,
  currency_code text default 'USD',
  -- For text fields
  min_length integer,
  max_length integer,
  pattern text, -- regex pattern
  pattern_error_message text,
  -- For picklist fields (stored as JSONB array)
  picklist_options jsonb, -- [{"label": "Option 1", "value": "opt1", "color": "#ff0000", "is_default": false}, ...]
  allow_multiple boolean default false not null, -- for multi_picklist
  -- For lookup fields
  lookup_module public.custom_field_module, -- which module to look up
  -- Visibility and permissions
  is_active boolean default true not null,
  visible_to_roles text[], -- null means visible to all
  editable_by_roles text[], -- null means editable by all
  -- Field ordering
  position integer not null,
  -- Field grouping
  field_group text, -- optional group name for organizing fields
  -- Metadata
  created_by uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure unique field names per module per tenant
  unique(tenant_id, module, name)
);

-- Custom field values table (stores actual values)
create table public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  field_id uuid references public.custom_fields on delete cascade not null,
  -- Entity reference
  entity_id uuid not null, -- ID of the account/contact/lead/deal
  module public.custom_field_module not null, -- denormalized for easier queries
  -- Value storage (using JSONB for flexibility)
  value jsonb, -- stores the actual value
  -- For lookup fields, store the referenced entity ID
  lookup_value_id uuid,
  -- Metadata
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  -- Ensure one value per field per entity
  unique(field_id, entity_id)
);

-- Indexes for performance
create index custom_fields_tenant_id_idx on public.custom_fields(tenant_id);
create index custom_fields_module_idx on public.custom_fields(tenant_id, module);
create index custom_fields_position_idx on public.custom_fields(tenant_id, module, position);
create index custom_fields_active_idx on public.custom_fields(tenant_id, module, is_active);

create index custom_field_values_tenant_id_idx on public.custom_field_values(tenant_id);
create index custom_field_values_field_id_idx on public.custom_field_values(field_id);
create index custom_field_values_entity_idx on public.custom_field_values(module, entity_id);
create index custom_field_values_lookup_idx on public.custom_field_values(lookup_value_id) where lookup_value_id is not null;

-- Enable RLS
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;

-- RLS Policies for custom_fields
create policy "Users can view own tenant custom fields"
  on public.custom_fields for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can insert custom fields"
  on public.custom_fields for insert
  with check (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update custom fields"
  on public.custom_fields for update
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can delete custom fields"
  on public.custom_fields for delete
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policies for custom_field_values
create policy "Users can view own tenant custom field values"
  on public.custom_field_values for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can insert own tenant custom field values"
  on public.custom_field_values for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can update own tenant custom field values"
  on public.custom_field_values for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Users can delete own tenant custom field values"
  on public.custom_field_values for delete
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- Updated at triggers
create trigger custom_fields_updated_at before update on public.custom_fields
  for each row execute procedure public.handle_updated_at();

create trigger custom_field_values_updated_at before update on public.custom_field_values
  for each row execute procedure public.handle_updated_at();

-- Function to get custom fields with values for an entity
create or replace function public.get_entity_custom_fields(
  p_module public.custom_field_module,
  p_entity_id uuid
)
returns jsonb as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'field_id', cf.id,
      'name', cf.name,
      'label', cf.label,
      'field_type', cf.field_type,
      'is_required', cf.is_required,
      'default_value', cf.default_value,
      'picklist_options', cf.picklist_options,
      'lookup_module', cf.lookup_module,
      'value', cfv.value,
      'lookup_value_id', cfv.lookup_value_id,
      'position', cf.position,
      'field_group', cf.field_group
    ) order by cf.position
  ) into v_result
  from public.custom_fields cf
  left join public.custom_field_values cfv
    on cfv.field_id = cf.id
    and cfv.entity_id = p_entity_id
  where cf.module = p_module
    and cf.is_active = true
    and cf.tenant_id in (select tenant_id from public.users where id = auth.uid());

  return coalesce(v_result, '[]'::jsonb);
end;
$$ language plpgsql security definer;

-- Function to save custom field values for an entity
create or replace function public.save_entity_custom_fields(
  p_module public.custom_field_module,
  p_entity_id uuid,
  p_values jsonb -- [{"field_id": "...", "value": ..., "lookup_value_id": "..."}]
)
returns jsonb as $$
declare
  v_tenant_id uuid;
  v_field_value record;
  v_field record;
begin
  -- Get tenant_id for the current user
  select tenant_id into v_tenant_id
  from public.users
  where id = auth.uid();

  if v_tenant_id is null then
    return jsonb_build_object('success', false, 'error', 'User not found');
  end if;

  -- Process each field value
  for v_field_value in select * from jsonb_to_recordset(p_values) as x(field_id uuid, value jsonb, lookup_value_id uuid)
  loop
    -- Verify field exists and belongs to tenant
    select * into v_field
    from public.custom_fields
    where id = v_field_value.field_id
      and tenant_id = v_tenant_id
      and module = p_module
      and is_active = true;

    if v_field.id is null then
      continue; -- skip invalid fields
    end if;

    -- Upsert the value
    insert into public.custom_field_values (
      tenant_id,
      field_id,
      entity_id,
      module,
      value,
      lookup_value_id
    ) values (
      v_tenant_id,
      v_field_value.field_id,
      p_entity_id,
      p_module,
      v_field_value.value,
      v_field_value.lookup_value_id
    )
    on conflict (field_id, entity_id)
    do update set
      value = excluded.value,
      lookup_value_id = excluded.lookup_value_id,
      updated_at = now();
  end loop;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- Function to reorder custom fields
create or replace function public.reorder_custom_fields(
  p_module public.custom_field_module,
  p_field_ids uuid[] -- array of field IDs in desired order
)
returns jsonb as $$
declare
  v_tenant_id uuid;
  v_position integer := 0;
  v_field_id uuid;
begin
  -- Get tenant_id for the current user (must be admin)
  select tenant_id into v_tenant_id
  from public.users
  where id = auth.uid() and role = 'admin';

  if v_tenant_id is null then
    return jsonb_build_object('success', false, 'error', 'Admin access required');
  end if;

  -- Update positions
  foreach v_field_id in array p_field_ids
  loop
    update public.custom_fields
    set position = v_position
    where id = v_field_id
      and tenant_id = v_tenant_id
      and module = p_module;
    v_position := v_position + 1;
  end loop;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;
