# Blog Authoring — Design

**Date:** 2026-08-25
**Status:** Approved
**Scope:** Turn the static blog page into an authored blog with a single admin author, DRAFT/PUBLISHED states, and public visibility limited to published posts.

## Problem

`src/pages/Blog.vue` renders eight hardcoded copies of `BlogPost.vue`. There is no data layer, no backend, and no auth anywhere in the repo — `vercel.json` is a pure SPA rewrite. The author needs to write and publish articles from a page in the app, keep unfinished work as drafts, and guarantee that only they can create posts and only published posts are visible to the public.

## Key constraint

Authorization cannot be enforced in Vue. Any check in client code is bypassable by editing the bundle or calling the data API directly. Draft-hiding has the same problem: if the browser fetches all posts and filters `status === 'PUBLISHED'` client-side, drafts are present in the network response.

Therefore the draft/published split and the admin gate are enforced by Postgres Row Level Security. Client-side checks in this design exist for UX only and are never the security boundary.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend | Supabase (Postgres + Auth + Storage) | RLS enforces visibility at the database; no server code to write and secure |
| Auth | GitHub OAuth | One-click, no password to manage, fits a site whose homepage is GitHub repos |
| Admin check | `profiles.is_admin` boolean via `is_admin()` helper | Standard Supabase pattern, readable policies, extensible without a policy rewrite |
| Content format | Markdown with live preview | Portable, diffable, fenced code blocks for a technical blog |
| Read time | Computed at render, not stored | Stored values drift on edit |
| Tags | `text[]` column | Display-only in v1; a join table is unjustified |

## Data model

```sql
create type post_status as enum ('DRAFT', 'PUBLISHED');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  is_admin boolean not null default false
);

create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  description  text,
  body         text not null default '',
  cover_url    text,
  tags         text[] not null default '{}',
  status       post_status not null default 'DRAFT',
  author_id    uuid not null references auth.users default auth.uid(),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

- `published_at` is set once, by trigger, on the first DRAFT to PUBLISHED transition. Cards sort and display by it; drafts display `updated_at`.
- `slug` derives from the title: lowercased, accents stripped (`Introdução` to `introducao`), non-alphanumerics collapsed to hyphens. Collisions get a short suffix. Editable while DRAFT, frozen once published so live URLs do not rot.

## Security

```sql
create function is_admin() returns boolean
  language sql security definer stable
  set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

alter table posts    enable row level security;
alter table profiles enable row level security;

create policy profiles_read_own on profiles for select using (id = auth.uid());

create policy posts_read   on posts for select using (status = 'PUBLISHED' or is_admin());
create policy posts_insert on posts for insert with check (is_admin());
create policy posts_update on posts for update using (is_admin()) with check (is_admin());
create policy posts_delete on posts for delete using (is_admin());
```

The `select` policy is the entire draft-privacy mechanism. An anonymous visitor issuing an unfiltered query receives published rows only — Postgres removes drafts before the response is built, so they never reach the client to be discovered in devtools.

Storage bucket `post-covers`: public read; insert, update and delete gated on `is_admin()`.

Router guards on `/blog/new` and `/blog/:slug/edit` are UX only. Bypassing them yields an editor whose every write is rejected by the database.

`is_admin()` is `security definer`, so it reads `profiles` as the function owner and is unaffected by that table's own RLS. `set search_path = public` is mandatory on a `security definer` function: without it a caller can point `search_path` at a schema containing a malicious `profiles` table and the function will trust it.

A trigger on `auth.users` insert creates the matching `profiles` row with `is_admin = false`, so signing in is enough to produce the row. The admin's `profiles.is_admin` is then set once by hand in the Supabase dashboard. Public signup remains enabled because GitHub OAuth requires it; a new signup is a non-admin row with no capabilities.

### On the anon key

This design puts `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the client bundle. This is safe and intended: the anon key carries no authority on its own, and RLS grants access. It is categorically different from the pre-existing `VITE_GITHUB_API_TOKEN` in `src/services/github.ts`, where possession of the token *is* the authority. That token leak is a separate defect, tracked outside this spec.

## Components

New:

```
src/lib/supabase.ts        client singleton
src/lib/markdown.ts        marked -> highlight.js -> DOMPurify
src/lib/slug.ts            title to slug, accent-stripping
src/lib/readTime.ts        word count to minutes
src/stores/auth.ts         Pinia: session, isAdmin, login, logout
src/services/posts.ts      list / getBySlug / create / update / remove / uploadCover
src/interfaces/post.ts     IPost, PostStatus
src/pages/PostDetail.vue   /blog/:slug
src/pages/PostEditor.vue   /blog/new and /blog/:slug/edit
src/pages/Login.vue        /login
supabase/migrations/       schema and policies, committed
```

Changed:

- `src/pages/Blog.vue` — real data, wired search, loading/empty/error states
- `src/components/BlogPost.vue` — takes a `post` prop; drops hardcoded content and the leftover `bg-red-300`
- `src/components/Navbar.vue` — "Sign up" removed (single author); Login becomes conditional New post / Logout
- `src/router/index.ts` — new routes

## Data flow

`Blog.vue` fetches once on mount: posts ordered by `published_at desc`. The newest becomes the `most-recent` card, the next two the `other-recent` stack, the remainder fills the ALL POSTS grid — preserving the existing layout. An authenticated admin receives drafts in the same query; they render in the grid with a DRAFT badge.

Search filters the fetched list in memory on title and description. At portfolio scale this beats a round trip.

The editor has explicit Save draft and Publish actions, plus Unpublish on a published post. There is no autosave. Publishing is a status transition, not a separate table.

## Routing

```
/blog            Blog.vue
/blog/new        PostEditor.vue    must precede /blog/:slug
/blog/:slug      PostDetail.vue
/blog/:slug/edit PostEditor.vue
/login           Login.vue
/:pathMatch(.*)* redirect /wip     stays last
```

`/blog/new` declared after `/blog/:slug` would match "new" as a slug. `/login` needs registering — the navbar already links to it and the catch-all currently swallows it.

## Testing

The repo has no test infrastructure. This adds Vitest, `@vue/test-utils` and jsdom.

- **Unit:** slug generation (accents, collisions, punctuation); read-time math; markdown rendering, including an assertion that `<script>` and `onerror=` are stripped by DOMPurify.
- **Component:** `BlogPost` renders a supplied post; `Blog` splits a fetched list into the 1 + 2 + rest layout and handles empty, loading and error states, against a mocked `services/posts`.
- **Security:** `scripts/verify-rls.ts` hits the live project with the anon key and asserts a known draft is absent from both a list query and a direct by-id fetch. This proves the feature's central security claim and cannot be mocked. Run after the migration and after any policy change.

## Out of scope

Comments; multiple authors and author bylines; tag filtering pages; scheduled publishing; RSS; autosave.

## Manual setup required

Code alone cannot complete this feature. The following are dashboard actions:

1. Create a Supabase project.
2. Register a GitHub OAuth app and paste client id and secret into Supabase Auth providers.
3. Run the committed migrations against the project.
4. Sign in once via GitHub (the insert trigger creates a `profiles` row with `is_admin = false`), then set `is_admin = true` on that row.
5. Populate `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and add both to the Vercel project.
