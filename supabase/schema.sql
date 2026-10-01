-- Jeju Dining cloud saves: one row per anonymous player, readable/writable only by that player.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "read own save" on public.saves;
create policy "read own save" on public.saves for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own save" on public.saves;
create policy "insert own save" on public.saves for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "update own save" on public.saves;
create policy "update own save" on public.saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
