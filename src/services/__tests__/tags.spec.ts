import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { from: (...args: unknown[]) => mockFrom(...args) } }))

import { listTags, listTagsWithCount, createTag, updateTag, deleteTag } from '../tags'

const tag = { id: '1', name: 'Go', slug: 'go', description: null, color: '#0369A1' }

beforeEach(() => vi.clearAllMocks())

describe('listTags', () => {
  it('returns tags ordered by name', async () => {
    const order = vi.fn().mockResolvedValue({ data: [tag], error: null })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) })

    await expect(listTags()).resolves.toEqual([tag])
    expect(mockFrom).toHaveBeenCalledWith('tags')
    expect(order).toHaveBeenCalledWith('name')
  })

  it('throws when Supabase reports an error', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) })

    await expect(listTags()).rejects.toThrow('boom')
  })
})

describe('listTagsWithCount', () => {
  it('flattens the embedded count into post_count', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ ...tag, post_tags: [{ count: 3 }] }, { ...tag, id: '2', post_tags: [] }],
      error: null,
    })
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ order }) })

    await expect(listTagsWithCount()).resolves.toEqual([
      { ...tag, post_count: 3 },
      { ...tag, id: '2', post_count: 0 },
    ])
  })
})

describe('createTag', () => {
  function mockCreate(taken: string[], insertResult: unknown) {
    const single = vi.fn().mockResolvedValue(insertResult)
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })

    mockFrom
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ data: taken.map((slug) => ({ slug })), error: null }) })
      .mockReturnValueOnce({ insert })

    return insert
  }

  it('derives a unique slug and trims the values', async () => {
    const insert = mockCreate(['go'], { data: tag, error: null })

    await createTag({ name: '  Go ', description: ' d ', color: '#0369A1' })

    expect(insert).toHaveBeenCalledWith({ name: 'go', description: 'd', color: '#0369A1', slug: 'go-2' })
  })

  it('stores the name lowercase with hyphens instead of spaces', async () => {
    const insert = mockCreate([], { data: tag, error: null })

    await createTag({ name: 'Data Structure', description: null, color: '#0369A1' })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: 'data-structure', slug: 'data-structure' }))
  })

  it('stores an empty description as null', async () => {
    const insert = mockCreate([], { data: tag, error: null })

    await createTag({ name: 'Go', description: '   ', color: '#0369A1' })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ description: null }))
  })

  it('refuses a blank name without calling Supabase', async () => {
    await expect(createTag({ name: '  ', description: null, color: '#0369A1' })).rejects.toThrow(/name/)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('refuses an invalid color without calling Supabase', async () => {
    await expect(createTag({ name: 'Go', description: null, color: 'blue' })).rejects.toThrow(/hex/)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('turns a unique violation into a friendly message', async () => {
    mockCreate([], { data: null, error: { code: '23505', message: 'duplicate key ...' } })

    await expect(createTag({ name: 'Go', description: null, color: '#0369A1' })).rejects.toThrow(
      'A tag with this name already exists.',
    )
  })
})

describe('updateTag', () => {
  it('updates by id without touching the slug', async () => {
    const single = vi.fn().mockResolvedValue({ data: tag, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ update })

    await updateTag('1', { name: 'Golang', description: null, color: '#112233' })

    expect(update).toHaveBeenCalledWith({ name: 'golang', description: null, color: '#112233' })
    expect(eq).toHaveBeenCalledWith('id', '1')
  })
})

describe('deleteTag', () => {
  it('deletes by id', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) })

    await deleteTag('1')

    expect(eq).toHaveBeenCalledWith('id', '1')
  })

  it('throws on error', async () => {
    const eq = vi.fn().mockResolvedValue({ error: { message: 'denied' } })
    mockFrom.mockReturnValue({ delete: vi.fn().mockReturnValue({ eq }) })

    await expect(deleteTag('1')).rejects.toThrow('denied')
  })
})
