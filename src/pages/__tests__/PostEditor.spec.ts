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
