-- Blog schema: posts, profiles, and the triggers that maintain them.

create type public.post_status as enum ('DRAFT', 'PUBLISHED');

create table public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text,
  body         text not null default '',
  cover_url    text,
  tags         text[] not null default '{}',
  status       public.post_status not null default 'DRAFT',
  author_id    uuid not null references auth.users default auth.uid(),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Serves the only list query the app makes: published posts, newest first.
create index posts_status_published_at_idx
  on public.posts (status, published_at desc);

-- Every new auth user gets a non-admin profile row. Without this, is_admin()
-- would find no row and the site would have no admin at all.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Maintains updated_at, stamps published_at once, and freezes the slug of a
-- published post so live URLs cannot rot.
create function public.handle_post_write() returns trigger
  language plpgsql set search_path = public as $$
begin
  new.updated_at := now();

  if new.status = 'PUBLISHED' and new.published_at is null then
    new.published_at := now();
  end if;

  if tg_op = 'UPDATE' and old.status = 'PUBLISHED' and new.slug is distinct from old.slug then
    raise exception 'slug is immutable once a post has been published';
  end if;

  return new;
end;
$$;

create trigger posts_before_write
  before insert or update on public.posts
  for each row execute function public.handle_post_write();
