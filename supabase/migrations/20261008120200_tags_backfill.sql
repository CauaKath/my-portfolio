-- Moves the names in posts.tags into the tags table and links them. Safe to
-- re-run: every insert is on conflict do nothing. posts.tags is dropped by the
-- next migration, so check the result before applying that one.

create extension if not exists unaccent with schema extensions;

-- Mirrors slugify() in src/lib/slug.ts. Lives in pg_temp so it disappears
-- with the session instead of becoming part of the schema.
create or replace function pg_temp.tag_slug(name text) returns text
  language sql immutable as $$
  select coalesce(
    nullif(trim(both '-' from regexp_replace(lower(extensions.unaccent(btrim(name))), '[^a-z0-9]+', '-', 'g')), ''),
    'tag'
  );
$$;

insert into public.tags (name, slug)
select distinct on (pg_temp.tag_slug(t)) btrim(t), pg_temp.tag_slug(t)
from public.posts, unnest(tags) as t
where btrim(t) <> ''
order by pg_temp.tag_slug(t), btrim(t)
on conflict do nothing;

insert into public.post_tags (post_id, tag_id)
select distinct p.id, tg.id
from public.posts p
cross join lateral unnest(p.tags) as t
join public.tags tg on tg.slug = pg_temp.tag_slug(t)
where btrim(t) <> ''
on conflict do nothing;
