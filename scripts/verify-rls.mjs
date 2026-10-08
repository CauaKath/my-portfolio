// Proves the security claim this feature rests on: an anonymous visitor
// cannot see drafts. Run after applying the migrations, and after any change
// to a policy in supabase/migrations/.
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

// Tags are public; writing them is not. A draft's post_tags rows must be as
// invisible as the draft itself.
const { error: tagsError } = await anon.from('tags').select('id').limit(1)
check('anonymous can read tags', !tagsError, tagsError?.message)

const { error: tagInsertError } = await anon
  .from('tags')
  .insert({ name: `rls-probe-${Date.now()}`, slug: `rls-probe-${Date.now()}` })
check('anonymous cannot insert a tag', Boolean(tagInsertError), 'insert unexpectedly succeeded')

const { data: links } = await anon.from('post_tags').select('post_id')
const visibleIds = new Set((posts ?? []).map((post) => post.id))
const orphanLinks = (links ?? []).filter((link) => !visibleIds.has(link.post_id))
check(
  'anonymous sees no post_tags rows of posts it cannot see',
  orphanLinks.length === 0,
  orphanLinks.length ? `${orphanLinks.length} link(s) leaked` : '',
)

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`)
  failures.forEach((failure) => console.error(`  - ${failure}`))
  process.exit(1)
}

console.log('\nAll RLS checks passed.')
