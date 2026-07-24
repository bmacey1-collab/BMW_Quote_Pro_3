-- BMW Quote Pro v2.3.0 customer, revision, and communications upgrade
-- Run this once in Supabase SQL Editor after the original setup.sql.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;
grant select, insert, update, delete on public.customers to authenticated;

drop policy if exists "Users manage their own customers" on public.customers;
create policy "Users manage their own customers"
on public.customers
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists customers_user_email_idx
on public.customers (user_id, lower(email));

create index if not exists customers_user_phone_idx
on public.customers (user_id, phone);

alter table public.quotes
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists revision_root_id uuid references public.quotes(id) on delete set null,
  add column if not exists revision_number integer not null default 1,
  add column if not exists revised_from_id uuid references public.quotes(id) on delete set null;

create index if not exists quotes_customer_idx
on public.quotes (customer_id, created_at desc);

create index if not exists quotes_revision_root_idx
on public.quotes (revision_root_id, revision_number desc);

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  quote_id uuid references public.quotes(id) on delete set null,
  communication_type text not null default 'email',
  recipient_email text,
  subject text,
  body text,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

alter table public.communications enable row level security;
grant select, insert, update, delete on public.communications to authenticated;

drop policy if exists "Users manage their own communications" on public.communications;
create policy "Users manage their own communications"
on public.communications
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists communications_customer_idx
on public.communications (customer_id, created_at desc);

-- Create customer records for existing quotes when possible.
insert into public.customers (user_id, name, email, phone)
select distinct
  q.user_id,
  q.customer_name,
  nullif(q.customer_email, ''),
  nullif(q.customer_phone, '')
from public.quotes q
where q.customer_id is null
  and coalesce(q.customer_name, q.customer_email, q.customer_phone) is not null
  and not exists (
    select 1
    from public.customers c
    where c.user_id = q.user_id
      and coalesce(lower(c.email), '') = coalesce(lower(q.customer_email), '')
      and coalesce(c.phone, '') = coalesce(q.customer_phone, '')
      and coalesce(c.name, '') = coalesce(q.customer_name, '')
  );

update public.quotes q
set customer_id = c.id
from public.customers c
where q.customer_id is null
  and c.user_id = q.user_id
  and (
    (q.customer_email is not null and lower(c.email) = lower(q.customer_email))
    or
    (q.customer_phone is not null and c.phone = q.customer_phone)
    or
    (q.customer_email is null and q.customer_phone is null and c.name = q.customer_name)
  );
