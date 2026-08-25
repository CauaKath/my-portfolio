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
