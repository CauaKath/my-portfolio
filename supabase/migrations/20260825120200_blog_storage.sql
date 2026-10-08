-- Cover images. Public read so <img> works for anonymous visitors;
-- writes restricted to the admin.

insert into storage.buckets (id, name, public)
values ('post-covers', 'post-covers', true)
on conflict (id) do nothing;

create policy post_covers_read on storage.objects
  for select using (bucket_id = 'post-covers');

create policy post_covers_insert on storage.objects
  for insert with check (bucket_id = 'post-covers' and public.is_admin());

create policy post_covers_update on storage.objects
  for update using (bucket_id = 'post-covers' and public.is_admin());

create policy post_covers_delete on storage.objects
  for delete using (bucket_id = 'post-covers' and public.is_admin());
