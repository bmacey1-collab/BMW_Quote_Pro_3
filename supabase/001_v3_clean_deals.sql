-- BMW Quote Pro 3.0 clean deal storage
create table if not exists public.v3_deals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_number text not null,
  client_name text,
  vehicle text,
  deal_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.v3_deals enable row level security;

drop policy if exists "Users read own v3 deals" on public.v3_deals;
create policy "Users read own v3 deals"
on public.v3_deals for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own v3 deals" on public.v3_deals;
create policy "Users insert own v3 deals"
on public.v3_deals for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own v3 deals" on public.v3_deals;
create policy "Users update own v3 deals"
on public.v3_deals for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own v3 deals" on public.v3_deals;
create policy "Users delete own v3 deals"
on public.v3_deals for delete
using (auth.uid() = user_id);

create index if not exists v3_deals_user_updated_idx
on public.v3_deals(user_id, updated_at desc);
