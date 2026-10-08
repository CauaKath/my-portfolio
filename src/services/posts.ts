import { supabase } from '@/lib/supabase'
import { type IPost, type IPostInput, type IPostRow } from '@/interfaces/post'
import type { ITag } from '@/interfaces/tag'

const COLUMNS =
  'id, slug, title, description, body, cover_url, status, published_at, created_at, updated_at, ' +
  'tags:post_tags(tag:tags(id, name, slug, description, color))'

type PostRowWithTags = Omit<IPost, 'tags'> & { tags: { tag: ITag | null }[] | null }

// PostgREST nests the junction rows; callers want a flat, ordered tag list.
function toPost(row: PostRowWithTags): IPost {
  const tags = (row.tags ?? [])
    .map((link) => link.tag)
    .filter((tag): tag is ITag => tag !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return { ...row, tags }
}

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

  return ((data ?? []) as unknown as PostRowWithTags[]).map(toPost)
}

async function getPostBySlug(slug: string): Promise<IPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(COLUMNS)
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return data ? toPost(data as unknown as PostRowWithTags) : null
}

async function listSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from('posts').select('slug')

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: { slug: string }) => row.slug)
}

// A post's tags live in post_tags, so they are written by a function that
// replaces them in one transaction rather than as a column of the post.
async function setPostTags(postId: string, tagIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('set_post_tags', { p_post_id: postId, p_tag_ids: tagIds })

  if (error) throw new Error(error.message)
}

async function createPost(input: IPostInput): Promise<IPostRow> {
  const { tag_ids: tagIds, ...columns } = input

  const { data, error } = await supabase.from('posts').insert(columns).select().single()

  if (error) throw new Error(error.message)

  const created = data as IPostRow
  await setPostTags(created.id, tagIds)

  return created
}

async function updatePost(id: string, input: Partial<IPostInput>): Promise<IPostRow> {
  const { tag_ids: tagIds, ...columns } = input

  const { data, error } = await supabase
    .from('posts')
    .update(columns)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (tagIds) await setPostTags(id, tagIds)

  return data as IPostRow
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
