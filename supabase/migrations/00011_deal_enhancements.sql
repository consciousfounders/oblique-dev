-- Add additional standard CRM fields to deals table

-- Deal type enum
create type public.deal_type as enum ('new_business', 'renewal', 'upsell', 'cross_sell');

-- Add new columns to deals
alter table public.deals
  add column description text,
  add column lead_source text,
  add column deal_type public.deal_type default 'new_business',
  add column next_step text,
  add column competitors text[],
  add column probability integer;

-- Add index for deal_type
create index deals_deal_type_idx on public.deals(deal_type);

-- Add index for lead_source filtering
create index deals_lead_source_idx on public.deals(lead_source);
