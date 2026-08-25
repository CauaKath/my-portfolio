# my-portfolio

Personal portfolio and blog. Vue 3, TypeScript, Vite, Tailwind, Supabase.

## Development

```bash
npm install
cp .env.example .env   # fill in the Supabase values
npm run dev
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm test` | Run the unit and component tests |
| `npm run type-check` | `vue-tsc` only |
| `npm run verify:rls` | Check that Row Level Security hides drafts from anonymous visitors |

## Blog

The blog has a single author. Posts are markdown, stored in Supabase, and start
as `DRAFT`; only `PUBLISHED` posts are visible to the public. That visibility
rule is enforced by Postgres Row Level Security, not by the Vue app — see
`supabase/migrations/0002_blog_policies.sql`.

First-time setup: `docs/blog-setup.md`.
Design rationale: `docs/superpowers/specs/2026-08-25-blog-authoring-design.md`.
