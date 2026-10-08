-- Tags with a description and a color, linked to posts through a junction
-- table so deleting a tag cleans up after itself and a tag cannot be misspelled.

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  color       text not null default '#0369A1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now()
);

-- "Go" and "go" are the same tag.
create unique index tags_name_lower_idx on public.tags (lower(name));

create table public.post_tags (
  post_id uuid not null references public.posts on delete cascade,
  tag_id  uuid not null references public.tags on delete cascade,
  primary key (post_id, tag_id)
);

-- The primary key serves lookups by post; this serves "which posts use a tag".
create index post_tags_tag_id_idx on public.post_tags (tag_id);

-- Replaces a post's tags in one transaction. security invoker on purpose: RLS
-- then decides who may do this, so the admin rule lives only in the policies.
create function public.set_post_tags(p_post_id uuid, p_tag_ids uuid[]) returns void
  language plpgsql security invoker set search_path = public as $$
begin
  delete from public.post_tags
  where post_id = p_post_id
    and tag_id <> all (coalesce(p_tag_ids, '{}'));

  insert into public.post_tags (post_id, tag_id)
  select p_post_id, unnest(coalesce(p_tag_ids, '{}'))
  on conflict do nothing;
end;
$$;
