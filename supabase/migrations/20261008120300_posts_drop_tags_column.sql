-- Destructive: posts.tags is replaced by post_tags. Apply only after the
-- backfill migration has been checked, for example:
--   select p.slug, p.tags, array_agg(t.name) from posts p
--   left join post_tags pt on pt.post_id = p.id
--   left join tags t on t.id = pt.tag_id group by p.id;

alter table public.posts drop column tags;
