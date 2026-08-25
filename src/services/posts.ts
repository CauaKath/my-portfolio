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
