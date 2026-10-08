-- Row Level Security for tags. Same rule as the posts policies: nothing in the
-- Vue app enforces access.

alter table public.tags      enable row level security;
alter table public.post_tags enable row level security;

create policy tags_read on public.tags
  for select using (true);

create policy tags_insert on public.tags
  for insert with check (public.is_admin());

create policy tags_update on public.tags
  for update using (public.is_admin()) with check (public.is_admin());

create policy tags_delete on public.tags
  for delete using (public.is_admin());

-- A link is visible exactly when its post is. The subquery runs under the
-- caller's own posts policy, so a draft's tags are not enumerable either.
create policy post_tags_read on public.post_tags
  for select using (exists (select 1 from public.posts where id = post_id));

create policy post_tags_insert on public.post_tags
  for insert with check (public.is_admin());

create policy post_tags_update on public.post_tags
  for update using (public.is_admin()) with check (public.is_admin());

create policy post_tags_delete on public.post_tags
  for delete using (public.is_admin());
