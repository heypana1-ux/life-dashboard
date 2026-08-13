-- Scoreboard schema for Life Dashboard.
-- Run this once in the Supabase SQL editor (same project as your sync setup).
-- It creates: a per-user leaderboard row, private leagues joined by a share code,
-- and the RLS policies + helper functions so users only ever see the scores of people
-- they share a league with (or who opted into the global ranking).

-- ---------- Tables ----------
create table if not exists public.leaderboard (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  overall      int  not null default 0,
  categories   jsonb not null default '{}',   -- { "productivity": 72, "sleep": 80, ... }
  global       boolean not null default false, -- opted into the worldwide ranking
  updated_at   timestamptz not null default now()
);
alter table public.leaderboard enable row level security;

create table if not exists public.leagues (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,             -- short code to share with friends
  name       text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.leagues enable row level security;

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
alter table public.league_members enable row level security;

-- ---------- Helper functions (SECURITY DEFINER, gated by auth.uid()) ----------
create or replace function public.is_member(l uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from league_members where league_id = l and user_id = auth.uid());
$$;

create or replace function public.shares_league(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from league_members a
    join league_members b on a.league_id = b.league_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ---------- RLS policies ----------
drop policy if exists "leaderboard read" on public.leaderboard;
create policy "leaderboard read" on public.leaderboard for select
  using ( global = true or user_id = auth.uid() or public.shares_league(user_id) );

drop policy if exists "leaderboard insert self" on public.leaderboard;
create policy "leaderboard insert self" on public.leaderboard for insert
  with check ( user_id = auth.uid() );

drop policy if exists "leaderboard update self" on public.leaderboard;
create policy "leaderboard update self" on public.leaderboard for update
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );

drop policy if exists "members read" on public.league_members;
create policy "members read" on public.league_members for select
  using ( user_id = auth.uid() or public.is_member(league_id) );

drop policy if exists "members leave" on public.league_members;
create policy "members leave" on public.league_members for delete
  using ( user_id = auth.uid() );

drop policy if exists "leagues read if member" on public.leagues;
create policy "leagues read if member" on public.leagues for select
  using ( public.is_member(id) );

-- ---------- RPCs ----------
create or replace function public.create_league(p_name text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare new_league public.leagues;
begin
  insert into public.leagues(code, name, created_by)
    values (upper(substr(md5(gen_random_uuid()::text), 1, 6)),
            coalesce(nullif(trim(p_name), ''), 'League'), auth.uid())
    returning * into new_league;
  insert into public.league_members(league_id, user_id) values (new_league.id, auth.uid());
  return new_league;
end;
$$;

create or replace function public.join_league(p_code text)
returns public.leagues language plpgsql security definer set search_path = public as $$
declare lg public.leagues;
begin
  select * into lg from public.leagues where code = upper(trim(p_code));
  if lg.id is null then raise exception 'league not found'; end if;
  insert into public.league_members(league_id, user_id) values (lg.id, auth.uid())
    on conflict do nothing;
  return lg;
end;
$$;

create or replace function public.my_leagues()
returns setof public.leagues language sql security definer stable set search_path = public as $$
  select l.* from public.leagues l
  join public.league_members m on m.league_id = l.id
  where m.user_id = auth.uid();
$$;

create or replace function public.league_board(p_league uuid)
returns setof public.leaderboard language sql security definer stable set search_path = public as $$
  select lb.* from public.leaderboard lb
  join public.league_members m on m.user_id = lb.user_id
  where m.league_id = p_league and public.is_member(p_league);
$$;
