# Blog Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the static blog page into an authored blog where the sole admin writes markdown posts, keeps them as DRAFT, and publishes them — with the public able to read published posts only.

**Architecture:** Supabase (Postgres + Auth + Storage) is the backend; no server code is written. Postgres Row Level Security is the only authorization boundary — the `posts` SELECT policy is what hides drafts, so drafts are removed by the database before a response is built and never reach the client. Vue-side auth checks and router guards exist purely so the UI is coherent; they are never relied on for access control. Content is markdown, rendered through marked → highlight.js → DOMPurify.

**Tech Stack:** Vue 3 (mixed Options API / `<script setup>`), TypeScript, Vite, Tailwind + SCSS, Pinia, vue-router, `@supabase/supabase-js`, marked, marked-highlight, highlight.js, DOMPurify, Vitest + @vue/test-utils + jsdom.

**Spec:** `docs/superpowers/specs/2026-08-25-blog-authoring-design.md`

## Global Constraints

- **Authorization is never client-side.** No task may implement a security check in Vue. Router guards and `v-if="isAdmin"` are UX only. Every task that reads or writes posts assumes RLS is the enforcement.
- **Never filter drafts client-side for privacy.** `listPosts()` issues one unfiltered query; the database decides what comes back. Client code may split the returned list for layout, never for secrecy.
- **All rendered markdown passes through DOMPurify** before reaching `v-html`. No exceptions.
- **Existing visual design is preserved.** Class names, layout structure and the 1 + 2 + rest card arrangement in `src/pages/Blog.vue` stay as they are; only data sources change.
- **Node 20.18.0, npm 10.8.2.** Existing deps stay at their current majors: vue ^3.4.29, vue-router ^4.3.3, pinia ^2.1.7, vite ^5.3.1, typescript ~5.4.0, tailwindcss ^3.4.6.
- **Supabase env vars:** exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Both are safe in the client bundle. Do not add a service-role key to any client-reachable file.
- **Commit after every task.** Conventional Commits.

---

### Task 1: Test infrastructure, slug and read-time utilities

Pure functions first, because everything downstream uses them and they need no mocking.

**Files:**
- Modify: `package.json` (devDeps + `test` script)
- Modify: `vite.config.ts` (add vitest `test` block)
- Create: `src/lib/slug.ts`
- Create: `src/lib/readTime.ts`
- Test: `src/lib/__tests__/slug.spec.ts`, `src/lib/__tests__/readTime.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `slugify(title: string): string`; `uniqueSlug(title: string, taken: string[]): string`; `readTimeMinutes(body: string): number`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D vitest@^1.6.0 @vue/test-utils@^2.4.6 jsdom@^24.1.0
```

- [ ] **Step 2: Add the test script to `package.json`**

In `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Add `/// <reference types="vitest" />` as the very first line of the file, then add a `test` key to the `defineConfig` object, as a sibling of `plugins` and `resolve`:

```ts
  test: {
    environment: 'jsdom',
    globals: true,
  },
```

While in this file, delete the entire `define` block. It is broken — `define` values must be JSON-stringified, and the key `'VITE_GITHUB_API_TOKEN'` defines a bare global rather than `import.meta.env.VITE_GITHUB_API_TOKEN`, which is what `src/services/github.ts` actually reads. Vite already exposes `.env` values natively, so the block is dead code that only confuses the next reader.

- [ ] **Step 4: Write the failing tests**

`src/lib/__tests__/slug.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from '../slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Pilha X Fila')).toBe('pilha-x-fila')
  })

  it('strips Portuguese accents', () => {
    expect(slugify('Introdução à Programação')).toBe('introducao-a-programacao')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('Vue 3: what?! -- really')).toBe('vue-3-what-really')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello')
  })

  it('falls back to "post" when nothing survives', () => {
    expect(slugify('???')).toBe('post')
    expect(slugify('')).toBe('post')
  })

  it('caps length without leaving a trailing hyphen', () => {
    const slug = slugify('a'.repeat(100) + ' tail')
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('uniqueSlug', () => {
  it('returns the plain slug when free', () => {
    expect(uniqueSlug('Pilha X Fila', [])).toBe('pilha-x-fila')
  })

  it('suffixes when taken', () => {
    expect(uniqueSlug('Pilha X Fila', ['pilha-x-fila'])).toBe('pilha-x-fila-2')
  })

  it('keeps counting past the first collision', () => {
    expect(uniqueSlug('Pilha X Fila', ['pilha-x-fila', 'pilha-x-fila-2'])).toBe('pilha-x-fila-3')
  })
})
```

`src/lib/__tests__/readTime.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { readTimeMinutes } from '../readTime'

describe('readTimeMinutes', () => {
  it('never returns less than one minute', () => {
    expect(readTimeMinutes('')).toBe(1)
    expect(readTimeMinutes('three short words')).toBe(1)
  })

  it('rounds up partial minutes', () => {
    expect(readTimeMinutes('word '.repeat(201))).toBe(2)
  })

  it('counts 200 words as one minute', () => {
    expect(readTimeMinutes('word '.repeat(200))).toBe(1)
  })

  it('ignores repeated whitespace', () => {
    expect(readTimeMinutes('a\n\n\n   b\t\tc')).toBe(1)
  })
})
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../slug"` and `"../readTime"`.

- [ ] **Step 6: Implement `src/lib/slug.ts`**

```ts
const MAX_SLUG_LENGTH = 80

function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')

  return slug || 'post'
}

function uniqueSlug(title: string, taken: string[]): string {
  const base = slugify(title)

  if (!taken.includes(base)) return base

  let suffix = 2
  while (taken.includes(`${base}-${suffix}`)) suffix += 1

  return `${base}-${suffix}`
}

export { slugify, uniqueSlug }
```

- [ ] **Step 7: Implement `src/lib/readTime.ts`**

```ts
const WORDS_PER_MINUTE = 200

function readTimeMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length

  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))
}

export { readTimeMinutes }
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — 10 tests across 2 files.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/lib
git commit -m "feat: add slug and read-time utilities with Vitest setup"
```

---

### Task 2: Markdown rendering pipeline

**Files:**
- Create: `src/lib/markdown.ts`
- Test: `src/lib/__tests__/markdown.spec.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `renderMarkdown(source: string): string` — returns sanitized HTML safe for `v-html`

- [ ] **Step 1: Install dependencies**

```bash
npm install marked@^12.0.2 marked-highlight@^2.1.2 highlight.js@^11.9.0 dompurify@^3.1.6
```

- [ ] **Step 2: Write the failing test**

`src/lib/__tests__/markdown.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    expect(renderMarkdown('# Título')).toContain('<h1')
    expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>')
  })

  it('highlights fenced code blocks', () => {
    const html = renderMarkdown('```js\nconst a = 1\n```')
    expect(html).toContain('hljs')
    expect(html).toContain('language-js')
  })

  it('falls back to plaintext for an unknown language without throwing', () => {
    // marked-highlight still emits `language-notalanguage` as a class; what
    // matters is that hljs.getLanguage() returning undefined does not throw.
    const html = renderMarkdown('```notalanguage\nx\n```')
    expect(html).toContain('<code')
    expect(html).toContain('x')
  })

  it('strips script tags', () => {
    const html = renderMarkdown('hello <script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
  })

  it('strips event handler attributes', () => {
    const html = renderMarkdown('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('onerror')
  })

  it('strips javascript: URLs', () => {
    const html = renderMarkdown('[click](javascript:alert(1))')
    expect(html).not.toContain('javascript:')
  })

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/markdown.spec.ts`
Expected: FAIL — `Failed to resolve import "../markdown"`.

- [ ] **Step 4: Implement `src/lib/markdown.ts`**

```ts
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'

      return hljs.highlight(code, { language }).value
    },
  }),
)

function renderMarkdown(source: string): string {
  if (!source) return ''

  const raw = marked.parse(source, { async: false }) as string

  return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] })
}

export { renderMarkdown }
```

Note on the sanitize call: DOMPurify's default allow-list already keeps `class`, which is what carries the `hljs language-*` classes, and already drops `javascript:` hrefs and `on*` handlers. `ADD_ATTR` only re-permits `target`/`rel` so external links in posts can open in a new tab.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/markdown.spec.ts`
Expected: PASS — 7 tests.

- [ ] **Step 6: Import a highlight.js theme**

Append to `src/assets/global.css`:

```css
@import 'highlight.js/styles/github-dark.css';
```

If `global.css` already has `@import` lines, this must sit with them at the top of the file — CSS requires `@import` before other rules, and `postcss-import` (already a dependency) will inline it at build time.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib src/assets/global.css
git commit -m "feat: add sanitized markdown rendering with syntax highlighting"
```

---

### Task 3: Database schema, RLS policies and storage

Deliverable is committed SQL. It is verified end-to-end by Task 11's RLS script, which is the only thing that can prove the policies work.

**Files:**
- Create: `supabase/migrations/0001_blog_schema.sql`
- Create: `supabase/migrations/0002_blog_policies.sql`
- Create: `supabase/migrations/0003_blog_storage.sql`

**Interfaces:**
- Consumes: nothing
- Produces: tables `public.posts`, `public.profiles`; enum `public.post_status`; function `public.is_admin()`; storage bucket `post-covers`

- [ ] **Step 1: Write `supabase/migrations/0001_blog_schema.sql`**

```sql
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
```

- [ ] **Step 2: Write `supabase/migrations/0002_blog_policies.sql`**

```sql
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
```

- [ ] **Step 3: Write `supabase/migrations/0003_blog_storage.sql`**

```sql
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
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations
git commit -m "feat: add blog schema, RLS policies and cover storage bucket"
```

---

### Task 4: Supabase client, environment and post types

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/interfaces/post.ts`
- Create: `.env.example`
- Modify: `env.d.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `supabase` client singleton; types `PostStatus`, `IPost`, `IPostInput`

- [ ] **Step 1: Install the Supabase client**

```bash
npm install @supabase/supabase-js@^2.45.0
```

- [ ] **Step 2: Create `.env.example`**

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`.gitignore` already ignores `.env`, so only this example is committed. The anon key is designed to be public and is safe in the bundle; RLS is what grants access.

- [ ] **Step 3: Type the env vars in `env.d.ts`**

Replace the file contents with:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 4: Create `src/interfaces/post.ts`**

```ts
type PostStatus = 'DRAFT' | 'PUBLISHED'

interface IPost {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  body: string;
  cover_url: string | null;
  tags: string[];
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IPostInput {
  slug: string;
  title: string;
  description: string | null;
  body: string;
  cover_url: string | null;
  tags: string[];
  status: PostStatus;
}

export type { PostStatus, IPost, IPostInput };
```

Nullable fields are `| null` rather than optional because Postgres returns `null`, not `undefined` — the same mismatch that already exists in `src/interfaces/github.ts`.

- [ ] **Step 5: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill both in.',
  )
}

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export { supabase }
```

- [ ] **Step 6: Verify the type-check passes**

Run: `npm run type-check`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example env.d.ts src/lib/supabase.ts src/interfaces/post.ts
git commit -m "feat: add Supabase client and post types"
```

---

### Task 5: Posts service

**Files:**
- Create: `src/services/posts.ts`
- Test: `src/services/__tests__/posts.spec.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`; `IPost`, `IPostInput` from `src/interfaces/post.ts`
- Produces:
  - `listPosts(): Promise<IPost[]>`
  - `getPostBySlug(slug: string): Promise<IPost | null>`
  - `createPost(input: IPostInput): Promise<IPost>`
  - `updatePost(id: string, input: Partial<IPostInput>): Promise<IPost>`
  - `deletePost(id: string): Promise<void>`
  - `listSlugs(): Promise<string[]>`
  - `uploadCover(file: File): Promise<string>`

- [ ] **Step 1: Write the failing test**

`src/services/__tests__/posts.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  },
}))

import { listPosts, getPostBySlug, createPost, deletePost, uploadCover } from '../posts'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listPosts', () => {
  it('issues one unfiltered query and returns the rows', async () => {
    const rows = [{ id: '1', slug: 'a' }]
    const order2 = vi.fn().mockResolvedValue({ data: rows, error: null })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    mockFrom.mockReturnValue({ select })

    await expect(listPosts()).resolves.toEqual(rows)

    expect(mockFrom).toHaveBeenCalledWith('posts')
    // Drafts are hidden by RLS. If this service ever adds a .eq('status', ...)
    // filter, the security story has moved into the client where it does not
    // work — and this test fails, because the mocked builder exposes no eq().
    expect(select).toHaveBeenCalledTimes(1)
    expect(Object.keys(select.mock.results[0].value)).toEqual(['order'])
  })

  it('returns an empty array when the query yields no rows', async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: null })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: order1 }) })

    await expect(listPosts()).resolves.toEqual([])
  })

  it('throws when Supabase reports an error', async () => {
    const order2 = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: order1 }) })

    await expect(listPosts()).rejects.toThrow('boom')
  })
})

describe('getPostBySlug', () => {
  it('returns null when no row matches', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })

    await expect(getPostBySlug('missing')).resolves.toBeNull()
    expect(eq).toHaveBeenCalledWith('slug', 'missing')
  })
})

describe('createPost', () => {
  it('returns the inserted row', async () => {
    const row = { id: '1', slug: 'a', title: 'A' }
    const single = vi.fn().mockResolvedValue({ data: row, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ insert })

    const input = {
      slug: 'a', title: 'A', description: null, body: '',
      cover_url: null, tags: [], status: 'DRAFT' as const,
    }

    await expect(createPost(input)).resolves.toEqual(row)
    expect(insert).toHaveBeenCalledWith(input)
  })

  it('surfaces an RLS rejection as an error', async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy' },
    })
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) }),
    })

    const input = {
      slug: 'a', title: 'A', description: null, body: '',
      cover_url: null, tags: [], status: 'DRAFT' as const,
    }

    await expect(createPost(input)).rejects.toThrow(/row-level security/)
  })
})

describe('deletePost', () => {
  it('throws when the delete errors', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'nope' } })
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) })

    await expect(deletePost('1')).rejects.toThrow('nope')
  })
})

describe('uploadCover', () => {
  it('rejects a non-image file before uploading', async () => {
    const file = new File(['x'], 'x.txt', { type: 'text/plain' })

    await expect(uploadCover(file)).rejects.toThrow(/image/i)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('rejects a file over the size limit before uploading', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })

    await expect(uploadCover(big)).rejects.toThrow(/too large/i)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('returns the public URL on success', async () => {
    mockUpload.mockResolvedValue({ data: { path: 'covers/x.png' }, error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn/x.png' } })

    const file = new File(['x'], 'x.png', { type: 'image/png' })

    await expect(uploadCover(file)).resolves.toBe('https://cdn/x.png')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/posts.spec.ts`
Expected: FAIL — `Failed to resolve import "../posts"`.

- [ ] **Step 3: Implement `src/services/posts.ts`**

```ts
import { supabase } from '@/lib/supabase'
import { type IPost, type IPostInput } from '@/interfaces/post'

const COLUMNS =
  'id, slug, title, description, body, cover_url, tags, status, published_at, created_at, updated_at'

const COVER_BUCKET = 'post-covers'
const MAX_COVER_BYTES = 5 * 1024 * 1024

// No status filter anywhere in this file, deliberately. Row Level Security
// decides which rows come back: anonymous callers receive published posts
// only, the admin additionally receives drafts. Filtering here instead would
// mean drafts had already been sent to the browser.
async function listPosts(): Promise<IPost[]> {
  const { data, error } = await supabase
    .from('posts')
    .select(COLUMNS)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []) as IPost[]
}

async function getPostBySlug(slug: string): Promise<IPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return (data as IPost) ?? null
}

async function listSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('posts').select('slug')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: { slug: string }) => row.slug)
}

async function createPost(input: IPostInput): Promise<IPost> {
  const { data, error } = await supabase.from('posts').insert(input).select().single()

  if (error) throw new Error(error.message)

  return data as IPost
}

async function updatePost(id: string, input: Partial<IPostInput>): Promise<IPost> {
  const { data, error } = await supabase
    .from('posts')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  return data as IPost
}

async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', id)

  if (error) throw new Error(error.message)
}

// Client-side checks here are for feedback, not enforcement: the bucket's
// own policies reject a non-admin upload regardless.
async function uploadCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Cover must be an image file.')
  }

  if (file.size > MAX_COVER_BYTES) {
    throw new Error('Cover is too large. Maximum size is 5MB.')
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path)

  return data.publicUrl
}

export { listPosts, getPostBySlug, listSlugs, createPost, updatePost, deletePost, uploadCover }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/posts.spec.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services
git commit -m "feat: add posts service backed by Supabase"
```

---

### Task 6: Auth store, login page, navbar and router wiring

**Files:**
- Create: `src/stores/auth.ts`
- Create: `src/pages/Login.vue`
- Modify: `src/router/index.ts`
- Modify: `src/components/Navbar.vue`
- Modify: `src/main.ts`
- Test: `src/stores/__tests__/auth.spec.ts`

**Interfaces:**
- Consumes: `supabase` from `src/lib/supabase.ts`
- Produces: `useAuthStore()` with `session`, `isAdmin`, `ready`, `init()`, `signInWithGitHub()`, `signOut()`

- [ ] **Step 1: Write the failing test**

`src/stores/__tests__/auth.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const getSession = vi.fn()
const onAuthStateChange = vi.fn()
const signInWithOAuth = vi.fn()
const signOutFn = vi.fn()
const maybeSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
      signInWithOAuth: (opts: unknown) => signInWithOAuth(opts),
      signOut: () => signOutFn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }),
    }),
  },
}))

import { useAuthStore } from '../auth'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('useAuthStore', () => {
  it('starts logged out and not admin', () => {
    const store = useAuthStore()

    expect(store.session).toBeNull()
    expect(store.isAdmin).toBe(false)
    expect(store.ready).toBe(false)
  })

  it('marks ready and stays non-admin with no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const store = useAuthStore()

    await store.init()

    expect(store.ready).toBe(true)
    expect(store.isAdmin).toBe(false)
  })

  it('sets isAdmin when the profile row says so', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null })
    const store = useAuthStore()

    await store.init()

    expect(store.isAdmin).toBe(true)
  })

  it('leaves isAdmin false for a signed-in non-admin', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: false }, error: null })
    const store = useAuthStore()

    await store.init()

    expect(store.session).not.toBeNull()
    expect(store.isAdmin).toBe(false)
  })

  it('leaves isAdmin false when the profile lookup errors', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u3' } } } })
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'denied' } })
    const store = useAuthStore()

    await store.init()

    expect(store.isAdmin).toBe(false)
  })

  it('clears state on sign out', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null })
    signOutFn.mockResolvedValue({ error: null })
    const store = useAuthStore()
    await store.init()

    await store.signOut()

    expect(store.session).toBeNull()
    expect(store.isAdmin).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/stores/__tests__/auth.spec.ts`
Expected: FAIL — `Failed to resolve import "../auth"`.

- [ ] **Step 3: Implement `src/stores/auth.ts`**

```ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const isAdmin = ref(false)
  const ready = ref(false)

  const isLoggedIn = computed(() => session.value !== null)

  // The profiles row is readable only by its owner, so this answers "am I an
  // admin" without exposing the roster. It drives UI visibility only — every
  // write is independently checked by RLS.
  async function refreshAdmin() {
    if (!session.value) {
      isAdmin.value = false
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.value.user.id)
      .maybeSingle()

    isAdmin.value = !error && Boolean(data?.is_admin)
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await refreshAdmin()

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      session.value = nextSession
      await refreshAdmin()
    })

    ready.value = true
  }

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/blog` },
    })

    if (error) throw new Error(error.message)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) throw new Error(error.message)

    session.value = null
    isAdmin.value = false
  }

  return { session, isAdmin, ready, isLoggedIn, init, signInWithGitHub, signOut }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/stores/__tests__/auth.spec.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Create `src/pages/Login.vue`**

```vue
<template>
  <div class="login">
    <div class="login-card">
      <h1>Sign in</h1>
      <p>This blog has a single author. Signing in gives you nothing unless you are it.</p>

      <button class="github-btn" :disabled="loading" @click="signIn">
        <img src="@/assets/github-icon.png" alt="">
        <span>{{ loading ? 'Redirecting…' : 'Continue with GitHub' }}</span>
      </button>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const error = ref('')

async function signIn() {
  loading.value = true
  error.value = ''

  try {
    await auth.signInWithGitHub()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign in failed.'
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  @apply flex justify-center items-center bg-background min-h-[calc(100vh-100px-60px)] p-4;

  .login-card {
    @apply bg-white rounded-lg shadow-lg p-8 flex flex-col gap-4 max-w-md w-full;

    h1 {
      @apply text-2xl font-bold text-primary-default;
    }

    p {
      @apply text-sm text-gray_text;
    }

    .github-btn {
      @apply flex items-center justify-center gap-2 bg-primary-default text-white rounded-full px-6 py-3 disabled:opacity-60;

      img {
        @apply w-5 h-5;
      }
    }

    .error {
      @apply text-sm text-red-600;
    }
  }
}
</style>
```

- [ ] **Step 6: Wire the routes in `src/router/index.ts`**

Replace the file contents with:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import WIP from '../pages/WIP.vue'
import Blog from '../pages/Blog.vue'
import PostDetail from '../pages/PostDetail.vue'
import PostEditor from '../pages/PostEditor.vue'
import Login from '../pages/Login.vue'

import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/blog', name: 'blog', component: Blog },
    // Must precede /blog/:slug, otherwise "new" matches as a slug.
    { path: '/blog/new', name: 'post-new', component: PostEditor, meta: { requiresAdmin: true } },
    { path: '/blog/:slug', name: 'post-detail', component: PostDetail, props: true },
    { path: '/blog/:slug/edit', name: 'post-edit', component: PostEditor, props: true, meta: { requiresAdmin: true } },
    { path: '/login', name: 'login', component: Login },
    { path: '/wip', name: 'wip', component: WIP },
    { path: '/:pathMatch(.*)*', redirect: '/wip' },
  ],
})

// UX only. This guard keeps a non-admin from staring at an editor whose every
// save would be rejected; it is not an access control. RLS is.
router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return true

  const auth = useAuthStore()
  if (!auth.ready) await auth.init()

  return auth.isAdmin ? true : { name: 'login' }
})

export default router
```

- [ ] **Step 7: Initialise the store in `src/main.ts`**

Replace the file contents with:

```ts
import './assets/global.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())

// Resolve the session before the first route renders, so the navbar and the
// admin guard do not flicker between logged-out and logged-in.
useAuthStore()
  .init()
  .finally(() => {
    app.use(router)
    app.mount('#app')
  })
```

- [ ] **Step 8: Update `src/components/Navbar.vue`**

In the `<template>`, replace the `.auth` div:

```html
      <div class="auth">
        <template v-if="auth.isAdmin">
          <RouterLink class="navbar-link" to="/blog/new">New post</RouterLink>
          <button class="register-btn" @click="auth.signOut()">Log out</button>
        </template>
        <RouterLink v-else class="navbar-link" to="/login">Login</RouterLink>
      </div>
```

In the burger menu list, replace the two Login/Sign up `<li>` elements:

```html
        <template v-if="auth.isAdmin">
          <li class="menu-modal-item" @click="toggleMenu">
            <RouterLink to="/blog/new">New post</RouterLink>
          </li>
          <li class="menu-modal-item" @click="toggleMenu">
            <button @click="auth.signOut()">Log out</button>
          </li>
        </template>
        <li v-else class="menu-modal-item" @click="toggleMenu">
          <RouterLink to="/login">Login</RouterLink>
        </li>
```

In the `<script>`, add the store to the component. Keep the existing Options API shape:

```ts
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Navbar',
  components: {
    RouterLink,
  },
  setup() {
    return { auth: useAuthStore() }
  },
  data() {
    return {
      navigationList: [
        { name: 'Resumé', path: '/resume' },
        { name: 'Blog', path: '/blog' },
        { name: 'Games', path: '/games' },
        { name: 'Portfolio', path: '/portfolio' },
      ],
      isMenuOpen: false,
    }
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen
    }
  }
}
```

"Sign up" is gone: this blog has one author, and an inviting signup button that grants nothing is a worse experience than no button.

- [ ] **Step 9: Run the full test suite**

Run: `npm test`
Expected: PASS. Type-check will still fail until Tasks 7–10 create `PostDetail.vue` and `PostEditor.vue` — that is expected at this point and resolves in Task 10.

- [ ] **Step 10: Commit**

```bash
git add src/stores src/pages/Login.vue src/router/index.ts src/main.ts src/components/Navbar.vue
git commit -m "feat: add GitHub OAuth auth store, login page and admin routing"
```

---

### Task 7: BlogPost card renders real data

**Files:**
- Modify: `src/components/BlogPost.vue`
- Test: `src/components/__tests__/BlogPost.spec.ts`

**Interfaces:**
- Consumes: `IPost` from `src/interfaces/post.ts`; `readTimeMinutes` from `src/lib/readTime.ts`
- Produces: `<BlogPost :post="post" :type="'default' | 'most-recent' | 'other-recent'" />`

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/BlogPost.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import BlogPost from '../BlogPost.vue'
import type { IPost } from '@/interfaces/post'

const post: IPost = {
  id: '1',
  slug: 'pilha-x-fila',
  title: 'Pilha X Fila',
  description: 'Qual a diferença?',
  body: 'word '.repeat(400),
  cover_url: 'https://cdn/cover.png',
  tags: ['tech', 'data-structure'],
  status: 'PUBLISHED',
  published_at: '2026-08-13T10:00:00Z',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
}

function mountPost(overrides: Partial<IPost> = {}) {
  return mount(BlogPost, {
    props: { post: { ...post, ...overrides } },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('BlogPost', () => {
  it('renders title and description from the post', () => {
    const wrapper = mountPost()

    expect(wrapper.text()).toContain('Pilha X Fila')
    expect(wrapper.text()).toContain('Qual a diferença?')
  })

  it('renders each tag with a hash prefix', () => {
    const tags = mountPost().findAll('.post-tags span').map((t) => t.text())

    expect(tags).toEqual(['#tech', '#data-structure'])
  })

  it('shows computed read time', () => {
    expect(mountPost().text()).toContain('2 min read')
  })

  it('links to the post slug', () => {
    const link = mountPost().findComponent(RouterLinkStub)

    expect(link.props('to')).toBe('/blog/pilha-x-fila')
  })

  it('uses the cover image when present', () => {
    const style = mountPost().find('.post-image').attributes('style')

    expect(style).toContain('https://cdn/cover.png')
  })

  it('falls back to the default banner when cover is null', () => {
    const style = mountPost({ cover_url: null }).find('.post-image').attributes('style')

    expect(style).toContain('banner')
  })

  it('shows a DRAFT badge only for drafts', () => {
    expect(mountPost({ status: 'DRAFT' }).find('.draft-badge').exists()).toBe(true)
    expect(mountPost().find('.draft-badge').exists()).toBe(false)
  })

  it('handles a null description without printing "null"', () => {
    expect(mountPost({ description: null }).text()).not.toContain('null')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/__tests__/BlogPost.spec.ts`
Expected: FAIL — the component has no `post` prop and renders hardcoded text.

- [ ] **Step 3: Rewrite `src/components/BlogPost.vue`**

Replace the `<template>` and `<script>` blocks. Leave the `<style>` block untouched apart from the two edits called out in Step 4.

```vue
<template>
  <RouterLink class="post" :class="type" :to="`/blog/${post.slug}`">
    <div class="post-image" :class="type" :style="coverStyle"></div>

    <div class="post-content" :class="type">
      <div class="post-main">
        <div class="post-texts">
          <span class="post-date">
            {{ displayDate }} • {{ readTime }} min read
            <span v-if="post.status === 'DRAFT'" class="draft-badge">DRAFT</span>
          </span>
          <span class="post-title">{{ post.title }}</span>
          <span class="post-description">{{ post.description ?? '' }}</span>
        </div>
      </div>

      <div class="post-tags" :class="type">
        <span v-for="tag of post.tags" :key="tag">#{{ tag }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import { readTimeMinutes } from '@/lib/readTime'
import type { IPost } from '@/interfaces/post'
import defaultBanner from '@/assets/banner.jpg'

const props = withDefaults(
  defineProps<{
    post: IPost
    type?: 'default' | 'most-recent' | 'other-recent'
  }>(),
  { type: 'default' },
)

const readTime = computed(() => readTimeMinutes(props.post.body))

const coverStyle = computed(() => ({
  backgroundImage: `url('${props.post.cover_url ?? defaultBanner}')`,
}))

// Drafts have no published_at, so fall back to when they were last touched.
const displayDate = computed(() => {
  const iso = props.post.published_at ?? props.post.updated_at

  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
</script>
```

- [ ] **Step 4: Fix two style rules**

In the `<style>` block of the same file:

1. In `.post`, delete the `bg-red-300` line — leftover debug colour.
2. In `.post-image`, delete the `bg-[url('../assets/banner.jpg')]` line. The image now comes from the inline `coverStyle` binding; leaving the Tailwind rule would fight it.

Then add a rule for the badge inside `.post-texts`, as a sibling of `.post-date`:

```scss
        .draft-badge {
          @apply
            ml-2
            bg-primary-default
            text-white
            text-xs
            px-2
            py-0.5
            rounded;
        }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/__tests__/BlogPost.spec.ts`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/BlogPost.vue src/components/__tests__
git commit -m "feat: render BlogPost card from post data"
```

---

### Task 8: Blog listing page with live data and search

**Files:**
- Modify: `src/pages/Blog.vue`
- Test: `src/pages/__tests__/Blog.spec.ts`

**Interfaces:**
- Consumes: `listPosts` from `src/services/posts.ts`; `BlogPost` component; `useAuthStore`
- Produces: the `/blog` route

- [ ] **Step 1: Write the failing test**

`src/pages/__tests__/Blog.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const listPosts = vi.fn()
vi.mock('@/services/posts', () => ({ listPosts: () => listPosts() }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import Blog from '../Blog.vue'
import type { IPost } from '@/interfaces/post'

function makePost(n: number, overrides: Partial<IPost> = {}): IPost {
  return {
    id: String(n),
    slug: `post-${n}`,
    title: `Post ${n}`,
    description: `Description ${n}`,
    body: 'body',
    cover_url: null,
    tags: [],
    status: 'PUBLISHED',
    published_at: `2026-08-${String(n).padStart(2, '0')}T10:00:00Z`,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

function mountBlog() {
  return mount(Blog, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('Blog', () => {
  it('shows a loading state before data arrives', () => {
    listPosts.mockReturnValue(new Promise(() => {}))

    expect(mountBlog().find('.loading').exists()).toBe(true)
  })

  it('splits posts into one featured, two secondary, and the rest', async () => {
    listPosts.mockResolvedValue([1, 2, 3, 4, 5, 6].map((n) => makePost(n)))
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.findAll('.recent .post')).toHaveLength(3)
    expect(wrapper.findAll('.all .post')).toHaveLength(3)
  })

  it('handles fewer posts than the featured layout needs', async () => {
    listPosts.mockResolvedValue([makePost(1)])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.findAll('.recent .post')).toHaveLength(1)
    expect(wrapper.findAll('.all .post')).toHaveLength(0)
  })

  it('shows an empty state when there are no posts', async () => {
    listPosts.mockResolvedValue([])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.empty').exists()).toBe(true)
  })

  it('shows an error state when the fetch fails', async () => {
    listPosts.mockRejectedValue(new Error('network down'))
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.error').text()).toContain('network down')
  })

  it('filters the all-posts grid by title', async () => {
    listPosts.mockResolvedValue([
      makePost(1, { title: 'Pilha X Fila' }),
      makePost(2, { title: 'Vue Router' }),
      makePost(3, { title: 'Postgres RLS' }),
      makePost(4, { title: 'Tailwind tips' }),
      makePost(5, { title: 'Vue reactivity' }),
    ])
    const wrapper = mountBlog()
    await flushPromises()

    await wrapper.find('.search-input input').setValue('vue')
    await flushPromises()

    const titles = wrapper.findAll('.all .post-title').map((t) => t.text())
    expect(titles).toEqual(['Vue reactivity'])
  })

  it('matches description as well as title', async () => {
    listPosts.mockResolvedValue([
      makePost(1),
      makePost(2),
      makePost(3),
      makePost(4, { title: 'Nothing', description: 'about kubernetes' }),
    ])
    const wrapper = mountBlog()
    await flushPromises()

    await wrapper.find('.search-input input').setValue('kubernetes')
    await flushPromises()

    expect(wrapper.findAll('.all .post')).toHaveLength(1)
  })

  it('hides the New post button from non-admins', async () => {
    listPosts.mockResolvedValue([])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.add-button').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/__tests__/Blog.spec.ts`
Expected: FAIL — the page renders eight hardcoded cards and calls no service.

- [ ] **Step 3: Rewrite the `<template>` of `src/pages/Blog.vue`**

Leave the entire `<style>` block as it is. Replace `<template>` and `<script>`:

```vue
<template>
  <div class="blog">
    <div class="banner">
      <div>
        <h1>Welcome to my Blog</h1>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading posts…</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="recent">
        <div class="recent-header">
          <span>RECENT POSTS</span>

          <div class="search-box">
            <RouterLink v-if="auth.isAdmin" class="add-button" to="/blog/new">
              <img src="@/assets/add.svg" alt="">
              <span>Add</span>
            </RouterLink>
          </div>
        </div>

        <div v-if="posts.length === 0" class="empty">
          No posts yet.
        </div>

        <div v-else class="posts">
          <BlogPost v-if="featured" :post="featured" type="most-recent" />

          <div v-if="secondary.length" class="second-and-third">
            <BlogPost v-for="post of secondary" :key="post.id" :post="post" type="other-recent" />
          </div>
        </div>
      </div>

      <hr class="divider">

      <div class="all">
        <div class="all-header">
          <span>ALL POSTS</span>

          <div class="search-input">
            <img src="@/assets/search-gray.svg" alt="">
            <input v-model="query" type="text" placeholder="Search for posts" />
          </div>
        </div>

        <div class="posts">
          <BlogPost v-for="post of filtered" :key="post.id" :post="post" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import BlogPost from '@/components/BlogPost.vue'
import { listPosts } from '@/services/posts'
import { useAuthStore } from '@/stores/auth'
import type { IPost } from '@/interfaces/post'

const auth = useAuthStore()

const posts = ref<IPost[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')

// The service returns whatever RLS allowed through: published posts for
// everyone, plus drafts when an admin is signed in. Splitting below is for
// layout only — it is never what keeps drafts private.
const featured = computed(() => posts.value[0] ?? null)
const secondary = computed(() => posts.value.slice(1, 3))
const rest = computed(() => posts.value.slice(3))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()

  if (!q) return rest.value

  return rest.value.filter((post) =>
    `${post.title} ${post.description ?? ''}`.toLowerCase().includes(q),
  )
})

onMounted(async () => {
  try {
    posts.value = await listPosts()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load posts.'
  } finally {
    loading.value = false
  }
})
</script>
```

- [ ] **Step 4: Add styles for the three new states**

Inside the `.blog` block in `<style>`, as siblings of `.banner`:

```scss
  .loading, .empty, .error {
    @apply
      w-[80%]
      text-base
      text-gray_text
      text-center
      py-8;
  }

  .error {
    @apply text-red-600;
  }
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/pages/__tests__/Blog.spec.ts`
Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Blog.vue src/pages/__tests__
git commit -m "feat: load blog listing from Supabase with search and states"
```

---

### Task 9: Post detail page

**Files:**
- Create: `src/pages/PostDetail.vue`
- Test: `src/pages/__tests__/PostDetail.spec.ts`

**Interfaces:**
- Consumes: `getPostBySlug` from `src/services/posts.ts`; `renderMarkdown`; `readTimeMinutes`; `useAuthStore`
- Produces: the `/blog/:slug` route

- [ ] **Step 1: Write the failing test**

`src/pages/__tests__/PostDetail.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const getPostBySlug = vi.fn()
vi.mock('@/services/posts', () => ({ getPostBySlug: (slug: string) => getPostBySlug(slug) }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import PostDetail from '../PostDetail.vue'
import type { IPost } from '@/interfaces/post'

const post: IPost = {
  id: '1',
  slug: 'pilha-x-fila',
  title: 'Pilha X Fila',
  description: 'Qual a diferença?',
  body: '# Heading\n\nSome **bold** text.',
  cover_url: null,
  tags: ['tech'],
  status: 'PUBLISHED',
  published_at: '2026-08-13T10:00:00Z',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
}

function mountDetail() {
  return mount(PostDetail, {
    props: { slug: 'pilha-x-fila' },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('PostDetail', () => {
  it('renders the markdown body as HTML', async () => {
    getPostBySlug.mockResolvedValue(post)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.post-body').html()).toContain('<h1')
    expect(wrapper.find('.post-body').html()).toContain('<strong>bold</strong>')
  })

  it('sanitizes malicious markdown before rendering', async () => {
    getPostBySlug.mockResolvedValue({ ...post, body: '<img src=x onerror="alert(1)">' })
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.post-body').html()).not.toContain('onerror')
  })

  it('shows a not-found state for an unknown slug', async () => {
    getPostBySlug.mockResolvedValue(null)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.not-found').exists()).toBe(true)
  })

  it('shows an error state when the fetch fails', async () => {
    getPostBySlug.mockRejectedValue(new Error('offline'))
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.error').text()).toContain('offline')
  })

  it('hides the edit link from non-admins', async () => {
    getPostBySlug.mockResolvedValue(post)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.edit-link').exists()).toBe(false)
  })

  it('renders tags and read time', async () => {
    getPostBySlug.mockResolvedValue(post)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.text()).toContain('#tech')
    expect(wrapper.text()).toContain('min read')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/__tests__/PostDetail.spec.ts`
Expected: FAIL — `Failed to resolve import "../PostDetail.vue"`.

- [ ] **Step 3: Implement `src/pages/PostDetail.vue`**

```vue
<template>
  <div class="detail">
    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else-if="!post" class="not-found">
      <h1>Post not found</h1>
      <RouterLink to="/blog">Back to the blog</RouterLink>
    </div>

    <article v-else class="article">
      <div v-if="post.cover_url" class="cover" :style="{ backgroundImage: `url('${post.cover_url}')` }"></div>

      <header>
        <span class="post-date">
          {{ displayDate }} • {{ readTime }} min read
          <span v-if="post.status === 'DRAFT'" class="draft-badge">DRAFT</span>
        </span>

        <h1>{{ post.title }}</h1>
        <p v-if="post.description">{{ post.description }}</p>

        <div class="tags">
          <span v-for="tag of post.tags" :key="tag">#{{ tag }}</span>
        </div>

        <RouterLink v-if="auth.isAdmin" class="edit-link" :to="`/blog/${post.slug}/edit`">
          Edit this post
        </RouterLink>
      </header>

      <!-- renderMarkdown runs its output through DOMPurify; see src/lib/markdown.ts -->
      <div class="post-body" v-html="renderedBody"></div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { getPostBySlug } from '@/services/posts'
import { renderMarkdown } from '@/lib/markdown'
import { readTimeMinutes } from '@/lib/readTime'
import { useAuthStore } from '@/stores/auth'
import type { IPost } from '@/interfaces/post'

const props = defineProps<{ slug: string }>()

const auth = useAuthStore()

const post = ref<IPost | null>(null)
const loading = ref(true)
const error = ref('')

const renderedBody = computed(() => (post.value ? renderMarkdown(post.value.body) : ''))
const readTime = computed(() => (post.value ? readTimeMinutes(post.value.body) : 1))

const displayDate = computed(() => {
  if (!post.value) return ''

  const iso = post.value.published_at ?? post.value.updated_at

  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

onMounted(async () => {
  try {
    // An unknown slug and a draft belonging to someone else are
    // indistinguishable here, which is the correct behaviour: RLS returns no
    // row either way, so a draft's existence never leaks.
    post.value = await getPostBySlug(props.slug)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load this post.'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.detail {
  @apply bg-background min-h-[calc(100vh-100px-60px)] py-16 flex justify-center;

  .loading, .error, .not-found {
    @apply text-base text-gray_text text-center py-8;
  }

  .error {
    @apply text-red-600;
  }

  .article {
    @apply w-[80%] max-w-3xl bg-white rounded-md p-8 flex flex-col gap-6;

    .cover {
      @apply w-full h-[300px] rounded-md bg-center bg-cover;
    }

    header {
      @apply flex flex-col gap-3;

      .post-date {
        @apply text-sm bg-gradient-to-r from-register-from to-register-to inline-block text-transparent bg-clip-text;
      }

      .draft-badge {
        @apply ml-2 bg-primary-default text-white text-xs px-2 py-0.5 rounded;
      }

      h1 {
        @apply text-4xl font-bold text-primary-default;
      }

      p {
        @apply text-base text-gray_text;
      }

      .tags {
        @apply flex gap-2 text-sm text-primary-default;

        span {
          @apply border-2 border-primary-default px-2 py-1 rounded-md;
        }
      }

      .edit-link {
        @apply text-sm text-gray_text underline w-fit;
      }
    }
  }
}

// Not scoped-safe on its own: v-html content carries no scope attribute, so
// these rules need :deep to reach the rendered markdown.
.post-body :deep(h1) { @apply text-3xl font-bold text-primary-default mt-6 mb-2; }
.post-body :deep(h2) { @apply text-2xl font-bold text-primary-default mt-6 mb-2; }
.post-body :deep(h3) { @apply text-xl font-bold text-primary-default mt-4 mb-2; }
.post-body :deep(p) { @apply text-base text-primary-default my-3 leading-relaxed; }
.post-body :deep(ul) { @apply list-disc pl-6 my-3; }
.post-body :deep(ol) { @apply list-decimal pl-6 my-3; }
.post-body :deep(a) { @apply text-register-to underline; }
.post-body :deep(blockquote) { @apply border-l-4 border-light_border pl-4 italic text-gray_text my-4; }
.post-body :deep(pre) { @apply rounded-md p-4 overflow-x-auto my-4; }
.post-body :deep(code) { @apply text-sm; }
.post-body :deep(img) { @apply max-w-full rounded-md my-4; }
.post-body :deep(table) { @apply w-full border-collapse my-4; }
.post-body :deep(th), .post-body :deep(td) { @apply border border-light_border px-3 py-2 text-sm; }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/__tests__/PostDetail.spec.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/pages/PostDetail.vue src/pages/__tests__/PostDetail.spec.ts
git commit -m "feat: add post detail page with sanitized markdown rendering"
```

---

### Task 10: Post editor

**Files:**
- Create: `src/pages/PostEditor.vue`
- Test: `src/pages/__tests__/PostEditor.spec.ts`

**Interfaces:**
- Consumes: `getPostBySlug`, `listSlugs`, `createPost`, `updatePost`, `deletePost`, `uploadCover`; `uniqueSlug`; `renderMarkdown`
- Produces: the `/blog/new` and `/blog/:slug/edit` routes

- [ ] **Step 1: Write the failing test**

`src/pages/__tests__/PostEditor.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const services = {
  getPostBySlug: vi.fn(),
  listSlugs: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  uploadCover: vi.fn(),
}

vi.mock('@/services/posts', () => ({
  getPostBySlug: (s: string) => services.getPostBySlug(s),
  listSlugs: () => services.listSlugs(),
  createPost: (i: unknown) => services.createPost(i),
  updatePost: (id: string, i: unknown) => services.updatePost(id, i),
  deletePost: (id: string) => services.deletePost(id),
  uploadCover: (f: unknown) => services.uploadCover(f),
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})

import PostEditor from '../PostEditor.vue'

function mountEditor(props: Record<string, unknown> = {}) {
  return mount(PostEditor, {
    props,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  services.listSlugs.mockResolvedValue([])
})

describe('PostEditor in create mode', () => {
  it('starts blank with no slug prop', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    expect((wrapper.find('input.title-input').element as HTMLInputElement).value).toBe('')
    expect(services.getPostBySlug).not.toHaveBeenCalled()
  })

  it('refuses to save without a title', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.createPost).not.toHaveBeenCalled()
    expect(wrapper.find('.form-error').text()).toMatch(/title/i)
  })

  it('creates a DRAFT with a slug derived from the title', async () => {
    services.createPost.mockResolvedValue({ id: '1', slug: 'pilha-x-fila' })
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('Pilha X Fila')
    await wrapper.find('textarea.body-input').setValue('conteúdo')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'pilha-x-fila', title: 'Pilha X Fila', status: 'DRAFT' }),
    )
  })

  it('avoids a slug collision with an existing post', async () => {
    services.listSlugs.mockResolvedValue(['pilha-x-fila'])
    services.createPost.mockResolvedValue({ id: '1', slug: 'pilha-x-fila-2' })
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('Pilha X Fila')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'pilha-x-fila-2' }),
    )
  })

  it('creates with PUBLISHED status when publishing', async () => {
    services.createPost.mockResolvedValue({ id: '1', slug: 'a' })
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('A')
    await wrapper.find('.publish').trigger('click')
    await flushPromises()

    expect(services.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PUBLISHED' }),
    )
  })

  it('parses comma-separated tags into an array', async () => {
    services.createPost.mockResolvedValue({ id: '1', slug: 'a' })
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('A')
    await wrapper.find('input.tags-input').setValue('tech, data-structure , ,tech')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['tech', 'data-structure'] }),
    )
  })

  it('surfaces an RLS rejection to the user', async () => {
    services.createPost.mockRejectedValue(new Error('new row violates row-level security policy'))
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('A')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toMatch(/row-level security/)
  })

  it('renders a live preview of the markdown body', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('textarea.body-input').setValue('**bold**')
    await flushPromises()

    expect(wrapper.find('.preview').html()).toContain('<strong>bold</strong>')
  })

  it('sanitizes the preview too', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('textarea.body-input').setValue('<img src=x onerror="alert(1)">')
    await flushPromises()

    expect(wrapper.find('.preview').html()).not.toContain('onerror')
  })
})

describe('PostEditor in edit mode', () => {
  const existing = {
    id: '1',
    slug: 'pilha-x-fila',
    title: 'Pilha X Fila',
    description: 'd',
    body: 'b',
    cover_url: null,
    tags: ['tech'],
    status: 'PUBLISHED' as const,
    published_at: '2026-08-13T10:00:00Z',
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-13T10:00:00Z',
  }

  it('loads the existing post into the form', async () => {
    services.getPostBySlug.mockResolvedValue(existing)
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    expect((wrapper.find('input.title-input').element as HTMLInputElement).value).toBe('Pilha X Fila')
  })

  it('updates rather than creating', async () => {
    services.getPostBySlug.mockResolvedValue(existing)
    services.updatePost.mockResolvedValue({ ...existing, title: 'Changed' })
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    await wrapper.find('input.title-input').setValue('Changed')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.updatePost).toHaveBeenCalled()
    expect(services.createPost).not.toHaveBeenCalled()
  })

  it('does not resend the slug of a published post', async () => {
    services.getPostBySlug.mockResolvedValue(existing)
    services.updatePost.mockResolvedValue(existing)
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    await wrapper.find('input.title-input').setValue('A totally different title')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    const payload = services.updatePost.mock.calls[0][1] as Record<string, unknown>
    expect(payload).not.toHaveProperty('slug')
  })

  it('offers Unpublish for a published post', async () => {
    services.getPostBySlug.mockResolvedValue(existing)
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    expect(wrapper.find('.unpublish').exists()).toBe(true)
  })

  it('does not offer Unpublish for a draft', async () => {
    services.getPostBySlug.mockResolvedValue({ ...existing, status: 'DRAFT' })
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    expect(wrapper.find('.unpublish').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/pages/__tests__/PostEditor.spec.ts`
Expected: FAIL — `Failed to resolve import "../PostEditor.vue"`.

- [ ] **Step 3: Implement `src/pages/PostEditor.vue`**

```vue
<template>
  <div class="editor">
    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <div class="editor-header">
        <h1>{{ isEditing ? 'Edit post' : 'New post' }}</h1>

        <div class="actions">
          <button class="save-draft" :disabled="saving" @click="save('DRAFT')">Save draft</button>
          <button v-if="!isPublished" class="publish" :disabled="saving" @click="save('PUBLISHED')">Publish</button>
          <button v-else class="unpublish" :disabled="saving" @click="save('DRAFT')">Unpublish</button>
          <button v-if="isEditing" class="delete" :disabled="saving" @click="remove">Delete</button>
        </div>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <div class="fields">
        <input class="title-input" v-model="title" type="text" placeholder="Title" />
        <input class="description-input" v-model="description" type="text" placeholder="Short description" />
        <input class="tags-input" v-model="tagsRaw" type="text" placeholder="Tags, comma separated" />

        <div class="cover-field">
          <label>
            <span>{{ coverUrl ? 'Replace cover' : 'Upload cover' }}</span>
            <input type="file" accept="image/*" @change="onCoverSelected" />
          </label>
          <img v-if="coverUrl" :src="coverUrl" alt="Cover preview" />
        </div>
      </div>

      <div class="panes">
        <textarea class="body-input" v-model="body" placeholder="Write your post in markdown…"></textarea>
        <!-- renderMarkdown sanitizes via DOMPurify before this reaches v-html -->
        <div class="preview" v-html="preview"></div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import {
  getPostBySlug,
  listSlugs,
  createPost,
  updatePost,
  deletePost,
  uploadCover,
} from '@/services/posts'
import { renderMarkdown } from '@/lib/markdown'
import { uniqueSlug } from '@/lib/slug'
import type { PostStatus } from '@/interfaces/post'

const props = defineProps<{ slug?: string }>()

const router = useRouter()

const id = ref<string | null>(null)
const title = ref('')
const description = ref('')
const body = ref('')
const tagsRaw = ref('')
const coverUrl = ref<string | null>(null)
const status = ref<PostStatus>('DRAFT')
const existingSlug = ref<string | null>(null)

const loading = ref(true)
const saving = ref(false)
const formError = ref('')

const isEditing = computed(() => Boolean(props.slug))
const isPublished = computed(() => status.value === 'PUBLISHED')
const preview = computed(() => renderMarkdown(body.value))

const tags = computed(() => {
  const seen = new Set<string>()

  return tagsRaw.value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (!tag || seen.has(tag)) return false
      seen.add(tag)
      return true
    })
})

onMounted(async () => {
  try {
    if (props.slug) {
      const post = await getPostBySlug(props.slug)

      if (!post) {
        formError.value = 'Post not found.'
      } else {
        id.value = post.id
        title.value = post.title
        description.value = post.description ?? ''
        body.value = post.body
        tagsRaw.value = post.tags.join(', ')
        coverUrl.value = post.cover_url
        status.value = post.status
        existingSlug.value = post.slug
      }
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Could not load the post.'
  } finally {
    loading.value = false
  }
})

async function onCoverSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) return

  formError.value = ''

  try {
    coverUrl.value = await uploadCover(file)
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Cover upload failed.'
  }
}

async function save(nextStatus: PostStatus) {
  if (!title.value.trim()) {
    formError.value = 'A title is required.'
    return
  }

  saving.value = true
  formError.value = ''

  const base = {
    title: title.value.trim(),
    description: description.value.trim() || null,
    body: body.value,
    cover_url: coverUrl.value,
    tags: tags.value,
    status: nextStatus,
  }

  try {
    if (id.value) {
      // The slug of a published post is frozen by a database trigger, and
      // changing a live URL is undesirable anyway, so it is never resent.
      await updatePost(id.value, base)
      router.push(`/blog/${existingSlug.value}`)
    } else {
      const taken = await listSlugs()
      const created = await createPost({ ...base, slug: uniqueSlug(base.title, taken) })
      router.push(`/blog/${created.slug}`)
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Save failed.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!id.value) return
  if (!window.confirm('Delete this post permanently?')) return

  saving.value = true

  try {
    await deletePost(id.value)
    router.push('/blog')
  } catch (err) {
    formError.value = err instanceof Error ? err.message : 'Delete failed.'
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.editor {
  @apply bg-background min-h-[calc(100vh-100px-60px)] p-8 flex flex-col gap-6;

  .loading {
    @apply text-base text-gray_text text-center py-8;
  }

  .editor-header {
    @apply flex justify-between items-center flex-wrap gap-4;

    h1 {
      @apply text-2xl font-bold text-primary-default;
    }

    .actions {
      @apply flex gap-3 flex-wrap;

      button {
        @apply text-sm px-4 py-2 rounded-full disabled:opacity-60;
      }

      .save-draft {
        @apply border border-primary-default text-primary-default;
      }

      .publish, .unpublish {
        @apply bg-gradient-to-r from-register-from to-register-to text-white;
      }

      .delete {
        @apply border border-red-600 text-red-600;
      }
    }
  }

  .form-error {
    @apply text-sm text-red-600;
  }

  .fields {
    @apply flex flex-col gap-3;

    input[type='text'] {
      @apply w-full bg-white rounded-md px-4 py-3 outline-none text-primary-default;
    }

    .title-input {
      @apply text-xl font-bold;
    }

    .cover-field {
      @apply flex items-center gap-4;

      label {
        @apply text-sm text-primary-default border border-primary-default rounded-full px-4 py-2 cursor-pointer;

        input {
          @apply hidden;
        }
      }

      img {
        @apply h-16 w-28 object-cover rounded-md;
      }
    }
  }

  .panes {
    @apply flex gap-6 items-stretch flex-1;

    .body-input {
      @apply w-1/2 min-h-[60vh] bg-white rounded-md p-4 outline-none font-mono text-sm text-primary-default resize-none;
    }

    .preview {
      @apply w-1/2 min-h-[60vh] bg-white rounded-md p-4 overflow-y-auto;
    }
  }
}

@media screen and (max-width: 780px) {
  .editor .panes {
    @apply flex-col;

    .body-input, .preview {
      @apply w-full min-h-[40vh];
    }
  }
}

.preview :deep(h1) { @apply text-2xl font-bold text-primary-default mt-4 mb-2; }
.preview :deep(h2) { @apply text-xl font-bold text-primary-default mt-4 mb-2; }
.preview :deep(p) { @apply text-base text-primary-default my-2; }
.preview :deep(ul) { @apply list-disc pl-6 my-2; }
.preview :deep(ol) { @apply list-decimal pl-6 my-2; }
.preview :deep(a) { @apply text-register-to underline; }
.preview :deep(pre) { @apply rounded-md p-3 overflow-x-auto my-3; }
.preview :deep(img) { @apply max-w-full rounded-md my-2; }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/pages/__tests__/PostEditor.spec.ts`
Expected: PASS — 14 tests.

- [ ] **Step 5: Run the full suite and the type-check**

Run: `npm test && npm run type-check`
Expected: both PASS. All pages referenced by the router now exist.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PostEditor.vue src/pages/__tests__/PostEditor.spec.ts
git commit -m "feat: add post editor with draft, publish and cover upload"
```

---

### Task 11: RLS verification script and setup documentation

The one check that proves the feature's security claim. It cannot be mocked — mocking it would only assert that the mock behaves as written.

**Files:**
- Create: `scripts/verify-rls.mjs`
- Create: `docs/blog-setup.md`
- Modify: `package.json` (`verify:rls` script)
- Modify: `README.md`

**Interfaces:**
- Consumes: a live Supabase project with the migrations applied
- Produces: `npm run verify:rls`

- [ ] **Step 1: Write `scripts/verify-rls.mjs`**

```js
// Proves the security claim this feature rests on: an anonymous visitor
// cannot see drafts. Run after applying the migrations, and after any change
// to a policy in supabase/migrations/0002_blog_policies.sql.
//
//   npm run verify:rls
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const env = {}

  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    // fall through to process.env
  }

  return { ...env, ...process.env }
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.')
  process.exit(1)
}

const anon = createClient(url, anonKey)
const failures = []

function check(name, passed, detail) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}`)
  if (!passed) failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
}

const { data: posts, error: listError } = await anon
  .from('posts')
  .select('id, slug, status')

check('anonymous can list posts', !listError, listError?.message)

const drafts = (posts ?? []).filter((post) => post.status !== 'PUBLISHED')
check(
  'anonymous list contains no drafts',
  drafts.length === 0,
  drafts.length ? `${drafts.length} draft(s) leaked: ${drafts.map((d) => d.slug).join(', ')}` : '',
)

// A draft id supplied by the operator closes the hole a list query cannot:
// direct fetch by primary key.
const draftId = process.argv[2]

if (draftId) {
  const { data: direct } = await anon.from('posts').select('id').eq('id', draftId).maybeSingle()
  check('anonymous cannot fetch a known draft by id', direct === null)
} else {
  console.log('SKIP  direct draft fetch — pass a draft id: npm run verify:rls -- <draft-uuid>')
}

const { error: insertError } = await anon
  .from('posts')
  .insert({ slug: `rls-probe-${Date.now()}`, title: 'RLS probe', body: '' })

check('anonymous cannot insert a post', Boolean(insertError), 'insert unexpectedly succeeded')

const { data: profiles } = await anon.from('profiles').select('id')
check('anonymous cannot enumerate profiles', (profiles ?? []).length === 0)

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`)
  failures.forEach((failure) => console.error(`  - ${failure}`))
  process.exit(1)
}

console.log('\nAll RLS checks passed.')
```

- [ ] **Step 2: Add the script to `package.json`**

In `"scripts"`:

```json
"verify:rls": "node scripts/verify-rls.mjs"
```

- [ ] **Step 3: Write `docs/blog-setup.md`**

````markdown
# Blog setup

The code is complete, but the blog cannot work until a Supabase project exists
behind it. These five steps are dashboard work and have to be done by hand once.

## 1. Create the Supabase project

Sign up at supabase.com, create a project, and note the project URL and the
`anon` public key from Project Settings → API.

## 2. Register a GitHub OAuth app

On GitHub: Settings → Developer settings → OAuth Apps → New OAuth App.

- Homepage URL: your site's URL
- Authorization callback URL: `https://<project-ref>.supabase.co/auth/v1/callback`

Copy the client ID and client secret into Supabase → Authentication →
Providers → GitHub, and enable the provider.

Then set Authentication → URL Configuration → Site URL to your deployed site,
and add `http://localhost:5173` to the additional redirect URLs so local
development can complete a sign-in.

## 3. Apply the migrations

In the Supabase SQL editor, run the three files in `supabase/migrations/` in
numeric order:

1. `0001_blog_schema.sql`
2. `0002_blog_policies.sql`
3. `0003_blog_storage.sql`

## 4. Make yourself the admin

Sign in to the site once through GitHub. The `on_auth_user_created` trigger
creates your `profiles` row with `is_admin = false`. Then, in the SQL editor:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'your@email.address');
```

Everyone else who ever signs in stays a non-admin row that can do nothing.

## 5. Configure environment variables

Locally, copy `.env.example` to `.env` and fill in both values. On Vercel, add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings →
Environment Variables, then redeploy.

Both values are safe in the client bundle: the anon key carries no authority by
itself, and Row Level Security is what grants access.

## 6. Verify the security claim

```bash
npm run verify:rls
```

Create a draft first, copy its id from the Supabase table editor, and pass it
in to exercise the direct-fetch check as well:

```bash
npm run verify:rls -- <draft-uuid>
```

Every check must pass. Re-run this after any change to
`supabase/migrations/0002_blog_policies.sql`.
````

- [ ] **Step 4: Write `README.md`**

```markdown
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
```

- [ ] **Step 5: Run the full suite one last time**

Run: `npm test && npm run type-check && npm run build`
Expected: all three PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts docs/blog-setup.md README.md package.json
git commit -m "feat: add RLS verification script and setup documentation"
```

---

## Deferred

Not part of this plan; noted so they are not silently lost.

- **`VITE_GITHUB_API_TOKEN` is exposed in the client bundle** (`src/services/github.ts:4`). A user-scoped GitHub PAT is inlined into the deployed JavaScript by Vite. It should be removed in favour of the unauthenticated `/users/CauaKath/repos` endpoint, and the token rotated. Task 1 removes the broken `define` block that references it, but not the token usage itself.
- **`language.toLowerCase()` crashes on a null language** (`src/components/Card.vue:65`). GitHub returns `null` for repos with no detected language; the whole card list fails to render.
- **`if (recentRepos && orgRepos)`** (`src/pages/Home.vue:81`) discards both results when either fetch fails.
- Unscoped `<style>` blocks in the pre-existing components, and the duplicated `calc(100vh-100px-60px)` magic numbers.
- Tag filtering pages, comments, RSS, scheduled publishing.
