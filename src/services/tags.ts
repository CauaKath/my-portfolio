import { supabase } from '@/lib/supabase'
import { uniqueSlug } from '@/lib/slug'
import { isHexColor } from '@/lib/tagColor'
import type { ITag, ITagInput, ITagWithCount } from '@/interfaces/tag'

const COLUMNS = 'id, name, slug, description, color'

// Postgres unique_violation. The only unique constraint a user can hit here is
// the case-insensitive name index; slugs are made unique before inserting.
const UNIQUE_VIOLATION = '23505'

function fail(error: { message: string; code?: string }): never {
  if (error.code === UNIQUE_VIOLATION) throw new Error('A tag with this name already exists.')

  throw new Error(error.message)
}

// Client-side checks are for feedback; the table's own check constraint and
// RLS are what actually enforce this.
function validate(input: ITagInput): ITagInput {
  const name = input.name.trim()

  if (!name) throw new Error('A tag needs a name.')
  if (!isHexColor(input.color)) throw new Error('Color must be a hex value like #0369A1.')

  return { name, description: input.description?.trim() || null, color: input.color }
}

async function listTags(): Promise<ITag[]> {
  const { data, error } = await supabase.from('tags').select(COLUMNS).order('name')

  if (error) fail(error)

  return (data ?? []) as ITag[]
}

async function listTagsWithCount(): Promise<ITagWithCount[]> {
  const { data, error } = await supabase
    .from('tags')
    .select(`${COLUMNS}, post_tags(count)`)
    .order('name')

  if (error) fail(error)

  return (data ?? []).map((row: ITag & { post_tags?: { count: number }[] }) => {
    const { post_tags, ...tag } = row

    return { ...tag, post_count: post_tags?.[0]?.count ?? 0 }
  })
}

async function createTag(input: ITagInput): Promise<ITag> {
  const values = validate(input)

  const { data: taken, error: takenError } = await supabase.from('tags').select('slug')
  if (takenError) fail(takenError)

  const slug = uniqueSlug(values.name, (taken ?? []).map((row: { slug: string }) => row.slug))

  const { data, error } = await supabase
    .from('tags')
    .insert({ ...values, slug })
    .select(COLUMNS)
    .single()

  if (error) fail(error)

  return data as ITag
}

// The slug is left alone on rename: it is an identifier, and nothing links to
// it yet, but changing it silently would be a surprise once something does.
async function updateTag(id: string, input: ITagInput): Promise<ITag> {
  const values = validate(input)

  const { data, error } = await supabase
    .from('tags')
    .update(values)
    .eq('id', id)
    .select(COLUMNS)
    .single()

  if (error) fail(error)

  return data as ITag
}

async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)

  if (error) fail(error)
}

export { listTags, listTagsWithCount, createTag, updateTag, deleteTag }
