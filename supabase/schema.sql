create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('cloud-cost-workbooks', 'cloud-cost-workbooks', false)
on conflict (id) do nothing;

create table if not exists public.workbooks (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text not null unique,
  sheet_name text not null,
  payload jsonb not null,
  uploaded_by text not null default '',
  uploaded_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists workbooks_active_uploaded_idx
on public.workbooks (is_active, uploaded_at desc);

create table if not exists public.review_states (
  workbook_id uuid not null references public.workbooks(id) on delete cascade,
  row_id text not null,
  row_number integer not null,
  verified boolean not null default false,
  account_evidence_url text,
  updated_at timestamptz not null default now(),
  primary key (workbook_id, row_id)
);

create table if not exists public.provider_links (
  workbook_id uuid not null references public.workbooks(id) on delete cascade,
  provider text not null,
  url text not null,
  updated_at timestamptz not null default now(),
  primary key (workbook_id, provider)
);

create table if not exists public.review_audit_logs (
  id bigint generated always as identity primary key,
  workbook_id uuid references public.workbooks(id) on delete cascade,
  action text not null,
  actor text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.workbooks enable row level security;
alter table public.review_states enable row level security;
alter table public.provider_links enable row level security;
alter table public.review_audit_logs enable row level security;

create policy "service role manages workbooks"
on public.workbooks
for all
to service_role
using (true)
with check (true);

create policy "service role manages review states"
on public.review_states
for all
to service_role
using (true)
with check (true);

create policy "service role manages provider links"
on public.provider_links
for all
to service_role
using (true)
with check (true);

create policy "service role manages audit logs"
on public.review_audit_logs
for all
to service_role
using (true)
with check (true);

create policy "service role manages workbook objects"
on storage.objects
for all
to service_role
using (bucket_id = 'cloud-cost-workbooks')
with check (bucket_id = 'cloud-cost-workbooks');
