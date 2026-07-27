-- BMW Quote Pro 3.0 Beta 4
-- Shared Program Center and program incentives

create table if not exists public.v3_programs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_month text not null,
  model_year integer,
  model_code text not null default '',
  model_name text not null default '',
  status text not null default 'review',
  effective_date date,
  expiration_date date,
  program_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.v3_program_incentives (
  id uuid primary key,
  program_id uuid not null references public.v3_programs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null default 0,
  applies_to text not null default 'all',
  category text not null default 'customer',
  program_code text not null default '',
  incentive_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists v3_programs_user_month_code_idx
on public.v3_programs(user_id, program_month, model_code);

create index if not exists v3_programs_user_month_idx
on public.v3_programs(user_id, program_month);

create index if not exists v3_program_incentives_program_idx
on public.v3_program_incentives(program_id);

alter table public.v3_programs enable row level security;
alter table public.v3_program_incentives enable row level security;

drop policy if exists "Users read own v3 programs" on public.v3_programs;
create policy "Users read own v3 programs"
on public.v3_programs for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own v3 programs" on public.v3_programs;
create policy "Users insert own v3 programs"
on public.v3_programs for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own v3 programs" on public.v3_programs;
create policy "Users update own v3 programs"
on public.v3_programs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own v3 programs" on public.v3_programs;
create policy "Users delete own v3 programs"
on public.v3_programs for delete
using (auth.uid() = user_id);

drop policy if exists "Users read own v3 program incentives" on public.v3_program_incentives;
create policy "Users read own v3 program incentives"
on public.v3_program_incentives for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own v3 program incentives" on public.v3_program_incentives;
create policy "Users insert own v3 program incentives"
on public.v3_program_incentives for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own v3 program incentives" on public.v3_program_incentives;
create policy "Users update own v3 program incentives"
on public.v3_program_incentives for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own v3 program incentives" on public.v3_program_incentives;
create policy "Users delete own v3 program incentives"
on public.v3_program_incentives for delete
using (auth.uid() = user_id);
