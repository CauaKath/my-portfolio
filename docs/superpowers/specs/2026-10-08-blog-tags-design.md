# Blog tags: design

Date: 2026-10-08

## Goal

Replace the free-text `posts.tags text[]` with a real `tags` table so tags carry a
description and a color, can be picked (or created) from the post editor, and can be
managed on their own admin page. Readers see colored chips with the description as a tooltip.

## Decisions

- Posts reference tags through a junction table (`post_tags`) with real foreign keys.
- Tags are managed on a dedicated admin page (`/tags`: create, edit, delete) in addition
  to inline creation from the editor.
- Readers see colored chips; the description is a hover tooltip. No click-to-filter.

## Database (Supabase CLI migrations)

- `tags(id, name, slug unique, description, color, created_at)`. `color` is checked as
  `#RRGGBB`. Names are unique case-insensitively.
- `post_tags(post_id -> posts on delete cascade, tag_id -> tags on delete cascade)`,
  primary key `(post_id, tag_id)`.
- `set_post_tags(post_id, tag_ids[])` replaces a post's tags in one transaction. It runs as
  the caller (`security invoker`), so RLS applies and there is no second admin check.
- RLS: anyone reads `tags`; `post_tags` is readable only when the post is readable (a draft's
  tags do not leak); only admins write either table.
- A backfill migration turns every distinct name in `posts.tags` into a `tags` row (default
  color `#2563EB`) and links it. A later, separate migration drops `posts.tags`, so it can be
  applied only after the backfill has been checked.

## App

- `ITag { id, name, slug, description, color }`; `IPost.tags` becomes `ITag[]`;
  `IPostInput` carries `tag_ids` instead of `tags`.
- `services/posts.ts` embeds `post_tags(tag:tags(...))` and flattens it. Writing a post
  calls `set_post_tags` after the insert/update.
- `services/tags.ts`: list (with post counts), create (unique slug), update, delete.
- `lib/tagColor.ts`: hex validation and a black/white text color from luminance.
- Components: `TagChip` (colored chip, tooltip), `TagForm` (name, description, color picker
  synced with a hex field), `TagPicker` (selected chips, dropdown of the rest, "New tag").
- `/tags` page (admin only) with create form, inline edit, delete with a confirmation that
  states how many posts lose the tag. A "Tags" button next to "Add" on the blog home links to it.

## Testing

Unit tests for the color helpers, tags service, posts service flatten/save, picker, form,
tags page and chips on cards and the post page. `verify:rls` gains checks that anonymous
callers can read tags but cannot write them, and cannot read a draft's `post_tags`.

## Rollout

The user applies the migrations with `supabase db push`. The app needs them applied
(including the column drop) before it works, because it no longer selects `posts.tags`.
