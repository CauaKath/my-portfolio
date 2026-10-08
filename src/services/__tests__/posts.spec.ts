import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockUpload = vi.fn()
const mockGetPublicUrl = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      }),
    },
  },
}))

import { listPosts, getPostBySlug, createPost, updatePost, deletePost, uploadCover } from '../posts'

beforeEach(() => {
  vi.clearAllMocks()
  mockRpc.mockResolvedValue({ error: null })
})

describe('listPosts', () => {
  it('issues one unfiltered query and returns the rows', async () => {
    const rows = [{ id: '1', slug: 'a', tags: [] }]
    const order2 = vi.fn().mockResolvedValue({ data: rows, error: null })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    const select = vi.fn().mockReturnValue({ order: order1 })
    mockFrom.mockReturnValue({ select })

    await expect(listPosts()).resolves.toEqual(rows)

    expect(mockFrom).toHaveBeenCalledWith('posts')
    // Drafts are hidden by RLS. If this service ever adds a .eq('status', ...)
    // filter, the security story has moved into the client where it does not
    // work -- and this test fails, because the mocked builder exposes no eq().
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

const tagA = { id: 't1', name: 'Alpha', slug: 'alpha', description: null, color: '#0369A1' }
const tagB = { id: 't2', name: 'Beta', slug: 'beta', description: 'b', color: '#112233' }

describe('tag flattening', () => {
  it('flattens the embedded junction rows into a name-ordered tag list', async () => {
    const row = { id: '1', slug: 'a', tags: [{ tag: tagB }, { tag: tagA }] }
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }) })

    const post = await getPostBySlug('a')

    expect(post?.tags).toEqual([tagA, tagB])
  })

  it('treats a missing tags embed or a dangling link as no tag', async () => {
    const order2 = vi.fn().mockResolvedValue({
      data: [{ id: '1', tags: null }, { id: '2', tags: [{ tag: null }, { tag: tagA }] }],
      error: null,
    })
    const order1 = vi.fn().mockReturnValue({ order: order2 })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order: order1 }) })

    const posts = await listPosts()

    expect(posts.map((p) => p.tags)).toEqual([[], [tagA]])
  })
})

describe('createPost', () => {
  const input = {
    slug: 'a', title: 'A', description: null, body: '',
    cover_url: null, tag_ids: ['t1', 't2'], status: 'DRAFT' as const,
  }

  function mockInsert(result: unknown) {
    const single = vi.fn().mockResolvedValue(result)
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockFrom.mockReturnValue({ insert })

    return insert
  }

  it('inserts the columns without tag_ids, then sets the tags', async () => {
    const row = { id: '1', slug: 'a', title: 'A' }
    const insert = mockInsert({ data: row, error: null })

    await expect(createPost(input)).resolves.toEqual(row)

    const { tag_ids: _omitted, ...columns } = input
    expect(insert).toHaveBeenCalledWith(columns)
    expect(mockRpc).toHaveBeenCalledWith('set_post_tags', { p_post_id: '1', p_tag_ids: ['t1', 't2'] })
  })

  it('surfaces an RLS rejection as an error and sets no tags', async () => {
    mockInsert({ data: null, error: { message: 'new row violates row-level security policy' } })

    await expect(createPost(input)).rejects.toThrow(/row-level security/)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('surfaces a failure to set the tags', async () => {
    mockInsert({ data: { id: '1' }, error: null })
    mockRpc.mockResolvedValue({ error: { message: 'tags failed' } })

    await expect(createPost(input)).rejects.toThrow('tags failed')
  })
})

describe('updatePost', () => {
  function mockUpdate() {
    const single = vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ update })

    return update
  }

  it('updates the columns and replaces the tags', async () => {
    const update = mockUpdate()

    await updatePost('1', { title: 'B', tag_ids: ['t2'] })

    expect(update).toHaveBeenCalledWith({ title: 'B' })
    expect(mockRpc).toHaveBeenCalledWith('set_post_tags', { p_post_id: '1', p_tag_ids: ['t2'] })
  })

  it('leaves the tags alone when tag_ids is not given', async () => {
    mockUpdate()

    await updatePost('1', { title: 'B' })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('clears the tags when given an empty list', async () => {
    mockUpdate()

    await updatePost('1', { tag_ids: [] })

    expect(mockRpc).toHaveBeenCalledWith('set_post_tags', { p_post_id: '1', p_tag_ids: [] })
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
