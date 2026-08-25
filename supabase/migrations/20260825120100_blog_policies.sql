-- Row Level Security. This file is the entire authorization boundary for the
-- blog; nothing in the Vue app enforces access.

-- security definer so it reads profiles as the owner, unaffected by that
-- table's own RLS. set search_path is mandatory: without it a caller can point
-- search_path at a schema holding a forged profiles table and this function
-- would trust it.
create function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin
  );
$$;

alter table public.profiles enable row level security;
alter table public.posts    enable row level security;

-- A user may see their own profile and no one else's, so the admin roster is
-- not enumerable.
create policy profiles_read_own on public.profiles
  for select using (id = auth.uid());

-- The draft-privacy mechanism. An anonymous unfiltered select returns
-- published rows only; drafts are removed before the response is built.
create policy posts_read on public.posts
  for select using (status = 'PUBLISHED' or public.is_admin());

create policy posts_insert on public.posts
  for insert with check (public.is_admin());

create policy posts_update on public.posts
  for update using (public.is_admin()) with check (public.is_admin());

create policy posts_delete on public.posts
  for delete using (public.is_admin());
