import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises, VueWrapper } from '@vue/test-utils'
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
const tagServices = {
  listTags: vi.fn(),
  createTag: vi.fn(),
}
vi.mock('@/services/tags', () => ({
  listTags: () => tagServices.listTags(),
  createTag: (i: unknown) => tagServices.createTag(i),
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const push = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')
  return { ...actual, useRouter: () => ({ push }) }
})

import PostEditor from '../PostEditor.vue'

const tagList = [
  { id: 't1', name: 'tech', slug: 'tech', description: 'All things tech', color: '#0369A1' },
  { id: 't2', name: 'data-structure', slug: 'data-structure', description: null, color: '#FDE047' },
]

let mounted: VueWrapper | null = null

function mountEditor(props: Record<string, unknown> = {}) {
  mounted = mount(PostEditor, {
    props,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

  return mounted
}

// The delete confirmation is teleported to <body>.
const q = (selector: string) => document.body.querySelector<HTMLElement>(selector)

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  services.listSlugs.mockResolvedValue([])
  tagServices.listTags.mockResolvedValue(tagList)
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

  it('creates the post with the tags picked from the list', async () => {
    services.createPost.mockResolvedValue({ id: '1', slug: 'a' })
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('input.title-input').setValue('A')
    await wrapper.find('.add-tag').trigger('click')
    await wrapper.findAll('.menu-tag')[1].trigger('click')
    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.createPost).toHaveBeenCalledWith(expect.objectContaining({ tag_ids: ['t2'] }))
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
    await wrapper.find('.tab-preview').trigger('click')
    await flushPromises()

    expect(wrapper.find('.preview').html()).toContain('<strong>bold</strong>')
  })

  it('toggles between the editor and the preview', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    expect(wrapper.find('.preview').exists()).toBe(false)
    expect(wrapper.find('textarea.body-input').attributes('style') ?? '').not.toContain('display: none')

    await wrapper.find('.tab-preview').trigger('click')
    expect(wrapper.find('.preview').exists()).toBe(true)
    expect(wrapper.find('textarea.body-input').attributes('style')).toContain('display: none')

    await wrapper.find('.tab-edit').trigger('click')
    expect(wrapper.find('.preview').exists()).toBe(false)
    expect(wrapper.find('textarea.body-input').attributes('style') ?? '').not.toContain('display: none')
  })

  it('sanitizes the preview too', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.find('textarea.body-input').setValue('<img src=x onerror="alert(1)">')
    await wrapper.find('.tab-preview').trigger('click')
    await flushPromises()

    expect(wrapper.find('.preview').html()).not.toContain('onerror')
  })
})

describe('PostEditor cover', () => {
  it('shows a placeholder and no remove action when there is no cover', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    expect(wrapper.find('.post-cover').classes()).toContain('placeholder')
    expect(wrapper.find('.cover-remove').exists()).toBe(false)
    expect(wrapper.find('.cover-button').attributes('aria-label')).toBe('Upload cover')
  })

  it('removes the cover and saves the post with a null cover_url', async () => {
    services.getPostBySlug.mockResolvedValue({
      id: '1', slug: 'a', title: 'A', description: null, body: '', tags: [],
      cover_url: 'https://cdn/c.png', status: 'DRAFT',
      published_at: null, created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
    })
    services.updatePost.mockResolvedValue({})
    const wrapper = mountEditor({ slug: 'a' })
    await flushPromises()

    expect(wrapper.find('.cover-button').attributes('aria-label')).toBe('Replace cover')
    await wrapper.find('.cover-remove').trigger('click')

    expect(wrapper.find('.post-cover').classes()).toContain('placeholder')

    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.updatePost).toHaveBeenCalledWith('1', expect.objectContaining({ cover_url: null }))
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
    tags: [tagList[0]],
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

  it('loads the existing tags and sends their ids on save', async () => {
    services.getPostBySlug.mockResolvedValue(existing)
    services.updatePost.mockResolvedValue(existing)
    const wrapper = mountEditor({ slug: 'pilha-x-fila' })
    await flushPromises()

    expect(wrapper.findAll('.selected-tag').map((t) => t.text())).toEqual(['tech×'])

    await wrapper.find('.save-draft').trigger('click')
    await flushPromises()

    expect(services.updatePost).toHaveBeenCalledWith('1', expect.objectContaining({ tag_ids: ['t1'] }))
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

describe('PostEditor delete confirmation', () => {
  const existing = {
    id: '1', slug: 'a', title: 'A', description: null, body: '', tags: [],
    cover_url: null, status: 'DRAFT' as const,
    published_at: null, created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
  }

  async function openDialog() {
    services.getPostBySlug.mockResolvedValue(existing)
    const wrapper = mountEditor({ slug: 'a' })
    await flushPromises()
    await wrapper.find('.delete').trigger('click')

    return wrapper
  }

  it('opens a modal instead of deleting right away', async () => {
    await openDialog()

    expect(q('.confirm-dialog')).not.toBeNull()
    expect(q('.confirm-title')!.textContent).toBe('Delete post')
    expect(services.deletePost).not.toHaveBeenCalled()
  })

  it('deletes and goes back to the blog when confirmed', async () => {
    services.deletePost.mockResolvedValue(undefined)
    await openDialog()

    q('.confirm-ok')!.click()
    await flushPromises()

    expect(services.deletePost).toHaveBeenCalledWith('1')
    expect(push).toHaveBeenCalledWith('/blog')
  })

  it('does nothing when cancelled', async () => {
    await openDialog()

    q('.confirm-cancel')!.click()
    await flushPromises()

    expect(services.deletePost).not.toHaveBeenCalled()
    expect(q('.confirm-dialog')).toBeNull()
  })

  it('keeps the modal open and shows the error when deleting fails', async () => {
    services.deletePost.mockRejectedValue(new Error('denied'))
    await openDialog()

    q('.confirm-ok')!.click()
    await flushPromises()

    expect(q('.confirm-error')!.textContent).toBe('denied')
    expect(push).not.toHaveBeenCalled()
  })
})
