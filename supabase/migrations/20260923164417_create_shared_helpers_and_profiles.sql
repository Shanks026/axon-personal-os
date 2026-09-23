-- Feature 02 Phase 1: shared helpers + profiles (see .claude/docs/data-model.md)

create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text check (char_length(full_name) <= 120),
  avatar_url      text,
  fy_start_month  smallint not null default 4 check (fy_start_month between 1 and 12),
  week_starts_on  smallint not null default 1 check (week_starts_on between 0 and 6),
  timezone        text not null default 'UTC',
  theme           text not null default 'system' check (theme in ('light','dark','system')),
  last_space_id   uuid,             -- FK added in Feature 03
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, timezone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

-- Trigger-only function: nobody may call it through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
