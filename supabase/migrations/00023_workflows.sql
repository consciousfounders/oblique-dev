-- Workflow Automation Engine
-- Enables building automated workflows triggered by CRM events

-- Workflow trigger types
create type public.workflow_trigger_type as enum (
  'record_created',     -- When a record is created (lead, contact, deal, etc.)
  'record_updated',     -- When a record is updated
  'field_changed',      -- When a specific field value changes
  'stage_changed',      -- When a deal stage changes
  'date_based',         -- X days before/after a date field
  'manual',             -- Manually triggered by user
  'webhook'             -- External webhook trigger
);

-- Workflow action types
create type public.workflow_action_type as enum (
  'create_task',        -- Create a task
  'send_email',         -- Send email using template
  'update_field',       -- Update a field value
  'assign_owner',       -- Assign to user/team
  'send_notification',  -- Send in-app notification
  'webhook_call',       -- Call external webhook
  'create_record'       -- Create a related record
);

-- Workflow execution status
create type public.workflow_execution_status as enum (
  'pending',
  'running',
  'completed',
  'failed',
  'skipped'
);

-- Main workflows table
create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants on delete cascade not null,
  name text not null,
  description text,
  trigger_type public.workflow_trigger_type not null,
  trigger_config jsonb not null default '{}',
  -- trigger_config structure varies by trigger_type:
  -- record_created: { entity_type: 'lead' | 'contact' | 'deal' | 'account' }
  -- record_updated: { entity_type: 'lead' | 'contact' | 'deal' | 'account' }
  -- field_changed: { entity_type: string, field_name: string, from_value?: string, to_value?: string }
  -- stage_changed: { pipeline_id?: string, from_stage?: string, to_stage?: string }
  -- date_based: { entity_type: string, date_field: string, offset_days: number, offset_direction: 'before' | 'after' }
  -- manual: { entity_type: string }
  -- webhook: { secret_key: string }
  entity_type text not null, -- The entity type this workflow applies to
  is_active boolean default true not null,
  run_once_per_record boolean default false not null, -- Prevent duplicate executions
  position integer default 0 not null, -- For ordering
  created_by uuid references public.users,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Workflow conditions (filters for when workflow should run)
create table public.workflow_conditions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows on delete cascade not null,
  condition_group integer default 0 not null, -- For grouping AND/OR conditions
  field_name text not null,
  operator text not null, -- equals, not_equals, contains, greater_than, less_than, is_null, is_not_null, in, not_in
  field_value text,
  field_values text[], -- For 'in' and 'not_in' operators
  logical_operator text default 'AND' not null, -- AND / OR between conditions in same group
  position integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Workflow actions (what to do when workflow runs)
create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows on delete cascade not null,
  action_type public.workflow_action_type not null,
  action_config jsonb not null default '{}',
  -- action_config structure varies by action_type:
  -- create_task: { subject: string, description?: string, task_type: string, priority: string, due_days?: number, assign_to?: string }
  -- send_email: { template_id?: string, subject: string, body: string, to_field: string }
  -- update_field: { field_name: string, field_value: string }
  -- assign_owner: { user_id?: string, team_id?: string, assignment_rule?: 'round_robin' | 'load_balanced' }
  -- send_notification: { title: string, message: string, user_ids?: string[], notify_owner: boolean }
  -- webhook_call: { url: string, method: 'GET' | 'POST' | 'PUT', headers?: object, body_template?: string }
  -- create_record: { entity_type: string, field_mappings: object }
  position integer default 0 not null,
  delay_minutes integer default 0 not null, -- Delay before executing action
  stop_on_error boolean default false not null, -- Stop workflow if this action fails
  created_at timestamptz default now() not null
);

-- Workflow execution logs
create table public.workflow_executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows on delete cascade not null,
  tenant_id uuid references public.tenants on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  trigger_event text not null, -- What triggered this execution
  trigger_data jsonb, -- Data that triggered the workflow
  status public.workflow_execution_status default 'pending' not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz default now() not null
);

-- Individual action execution logs within a workflow execution
create table public.workflow_action_logs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid references public.workflow_executions on delete cascade not null,
  action_id uuid references public.workflow_actions on delete set null,
  action_type public.workflow_action_type not null,
  status public.workflow_execution_status default 'pending' not null,
  input_data jsonb, -- What was passed to the action
  output_data jsonb, -- What the action returned
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now() not null
);

-- Track which records have had workflows run (for run_once_per_record)
create table public.workflow_record_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.workflows on delete cascade not null,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz default now() not null,
  unique(workflow_id, entity_type, entity_id)
);

-- Indexes for performance
create index workflows_tenant_id_idx on public.workflows(tenant_id);
create index workflows_entity_type_idx on public.workflows(entity_type);
create index workflows_trigger_type_idx on public.workflows(trigger_type);
create index workflows_active_idx on public.workflows(tenant_id, is_active) where is_active = true;

create index workflow_conditions_workflow_id_idx on public.workflow_conditions(workflow_id);
create index workflow_conditions_group_idx on public.workflow_conditions(workflow_id, condition_group);

create index workflow_actions_workflow_id_idx on public.workflow_actions(workflow_id);
create index workflow_actions_position_idx on public.workflow_actions(workflow_id, position);

create index workflow_executions_workflow_id_idx on public.workflow_executions(workflow_id);
create index workflow_executions_tenant_id_idx on public.workflow_executions(tenant_id);
create index workflow_executions_entity_idx on public.workflow_executions(entity_type, entity_id);
create index workflow_executions_status_idx on public.workflow_executions(status);
create index workflow_executions_created_at_idx on public.workflow_executions(created_at);

create index workflow_action_logs_execution_id_idx on public.workflow_action_logs(execution_id);
create index workflow_action_logs_status_idx on public.workflow_action_logs(status);

create index workflow_record_runs_lookup_idx on public.workflow_record_runs(workflow_id, entity_type, entity_id);

-- Enable RLS
alter table public.workflows enable row level security;
alter table public.workflow_conditions enable row level security;
alter table public.workflow_actions enable row level security;
alter table public.workflow_executions enable row level security;
alter table public.workflow_action_logs enable row level security;
alter table public.workflow_record_runs enable row level security;

-- RLS Policies for workflows
create policy "Users can view own tenant workflows"
  on public.workflows for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "Admins can manage workflows"
  on public.workflows for all
  using (
    tenant_id in (
      select tenant_id from public.users
      where id = auth.uid() and role in ('admin', 'sales_manager')
    )
  );

-- RLS Policies for workflow_conditions
create policy "Users can view workflow conditions in own tenant"
  on public.workflow_conditions for select
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage workflow conditions"
  on public.workflow_conditions for all
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role in ('admin', 'sales_manager')
      )
    )
  );

-- RLS Policies for workflow_actions
create policy "Users can view workflow actions in own tenant"
  on public.workflow_actions for select
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "Admins can manage workflow actions"
  on public.workflow_actions for all
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (
        select tenant_id from public.users
        where id = auth.uid() and role in ('admin', 'sales_manager')
      )
    )
  );

-- RLS Policies for workflow_executions
create policy "Users can view workflow executions in own tenant"
  on public.workflow_executions for select
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "System can insert workflow executions"
  on public.workflow_executions for insert
  with check (tenant_id in (select tenant_id from public.users where id = auth.uid()));

create policy "System can update workflow executions"
  on public.workflow_executions for update
  using (tenant_id in (select tenant_id from public.users where id = auth.uid()));

-- RLS Policies for workflow_action_logs
create policy "Users can view action logs in own tenant"
  on public.workflow_action_logs for select
  using (
    execution_id in (
      select id from public.workflow_executions
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "System can manage action logs"
  on public.workflow_action_logs for all
  using (
    execution_id in (
      select id from public.workflow_executions
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- RLS Policies for workflow_record_runs
create policy "Users can view record runs in own tenant"
  on public.workflow_record_runs for select
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

create policy "System can manage record runs"
  on public.workflow_record_runs for all
  using (
    workflow_id in (
      select id from public.workflows
      where tenant_id in (select tenant_id from public.users where id = auth.uid())
    )
  );

-- Updated at triggers
create trigger workflows_updated_at before update on public.workflows
  for each row execute procedure public.handle_updated_at();

-- Function to get active workflows for an event
create or replace function public.get_active_workflows_for_event(
  p_tenant_id uuid,
  p_trigger_type public.workflow_trigger_type,
  p_entity_type text
)
returns setof public.workflows as $$
begin
  return query
  select w.*
  from public.workflows w
  where w.tenant_id = p_tenant_id
    and w.is_active = true
    and w.trigger_type = p_trigger_type
    and w.entity_type = p_entity_type
  order by w.position asc;
end;
$$ language plpgsql security definer;

-- Function to check if workflow has already run for a record
create or replace function public.has_workflow_run_for_record(
  p_workflow_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean as $$
begin
  return exists (
    select 1 from public.workflow_record_runs
    where workflow_id = p_workflow_id
      and entity_type = p_entity_type
      and entity_id = p_entity_id
  );
end;
$$ language plpgsql security definer;

-- Function to mark workflow as run for a record
create or replace function public.mark_workflow_run_for_record(
  p_workflow_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns void as $$
begin
  insert into public.workflow_record_runs (workflow_id, entity_type, entity_id)
  values (p_workflow_id, p_entity_type, p_entity_id)
  on conflict (workflow_id, entity_type, entity_id) do nothing;
end;
$$ language plpgsql security definer;

-- Cleanup function for old execution logs (run periodically)
create or replace function public.cleanup_workflow_logs()
returns void as $$
begin
  -- Delete execution logs older than 90 days
  delete from public.workflow_executions
  where created_at < now() - interval '90 days';

  -- Delete orphaned action logs
  delete from public.workflow_action_logs
  where execution_id not in (select id from public.workflow_executions);
end;
$$ language plpgsql security definer;
