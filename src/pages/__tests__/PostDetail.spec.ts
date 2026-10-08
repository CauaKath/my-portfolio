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

  it('builds a table of contents from the headings', async () => {
    getPostBySlug.mockResolvedValue({ ...post, body: '## One\n\ntext\n\n## Two\n\ntext' })
    const wrapper = mountDetail()
    await flushPromises()

    const links = wrapper.findAll('.toc a')
    expect(links.map((a) => a.text())).toEqual(['One', 'Two'])
    expect(links[0].attributes('href')).toBe('#one')
    expect(wrapper.find('.post-body h2#one').exists()).toBe(true)
  })

  it('shows a placeholder cover when the post has none', async () => {
    getPostBySlug.mockResolvedValue(post)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.post-cover').classes()).toContain('placeholder')
  })

  it('shows the cover image when set', async () => {
    getPostBySlug.mockResolvedValue({ ...post, cover_url: 'https://cdn/c.png' })
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('.post-cover').classes()).not.toContain('placeholder')
    expect(wrapper.find('.post-cover').attributes('style')).toContain('https://cdn/c.png')
  })

  it('renders tags and read time', async () => {
    getPostBySlug.mockResolvedValue(post)
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.text()).toContain('#tech')
    expect(wrapper.text()).toContain('min read')
  })
})
