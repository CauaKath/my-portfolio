import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const listPosts = vi.fn()
vi.mock('@/services/posts', () => ({ listPosts: () => listPosts() }))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import Blog from '../Blog.vue'
import type { IPost } from '@/interfaces/post'

function makePost(n: number, overrides: Partial<IPost> = {}): IPost {
  return {
    id: String(n),
    slug: `post-${n}`,
    title: `Post ${n}`,
    description: `Description ${n}`,
    body: 'body',
    cover_url: null,
    tags: [],
    status: 'PUBLISHED',
    published_at: `2026-08-${String(n).padStart(2, '0')}T10:00:00Z`,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

function mountBlog() {
  return mount(Blog, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('Blog', () => {
  it('shows skeletons in the real layout before data arrives', () => {
    listPosts.mockReturnValue(new Promise(() => {}))
    const wrapper = mountBlog()

    expect(wrapper.findAll('.recent .post')).toHaveLength(3)
    expect(wrapper.findAll('.all .post')).toHaveLength(3)
    expect(wrapper.find('.recent').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.all').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Loading posts')
  })

  it('swaps the skeletons for the posts once loaded', async () => {
    listPosts.mockResolvedValue([1, 2, 3, 4].map((n) => makePost(n)))
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.skeleton').exists()).toBe(false)
    expect(wrapper.find('.recent').attributes('aria-busy')).toBe('false')
    expect(wrapper.text()).not.toContain('Loading posts')
  })

  it('keeps the section headers visible while loading', () => {
    listPosts.mockReturnValue(new Promise(() => {}))
    const wrapper = mountBlog()

    expect(wrapper.text()).toContain('RECENT POSTS')
    expect(wrapper.text()).toContain('ALL POSTS')
  })

  it('splits posts into one featured, two secondary, and the rest', async () => {
    listPosts.mockResolvedValue([1, 2, 3, 4, 5, 6].map((n) => makePost(n)))
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.findAll('.recent .post')).toHaveLength(3)
    expect(wrapper.findAll('.all .post')).toHaveLength(3)
  })

  it('handles fewer posts than the featured layout needs', async () => {
    listPosts.mockResolvedValue([makePost(1)])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.findAll('.recent .post')).toHaveLength(1)
    expect(wrapper.findAll('.all .post')).toHaveLength(0)
  })

  it('shows an empty state when there are no posts', async () => {
    listPosts.mockResolvedValue([])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.empty').exists()).toBe(true)
  })

  it('shows an error state when the fetch fails', async () => {
    listPosts.mockRejectedValue(new Error('network down'))
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.error').text()).toContain('network down')
  })

  it('filters the all-posts grid by title', async () => {
    listPosts.mockResolvedValue([
      makePost(1, { title: 'Pilha X Fila' }),
      makePost(2, { title: 'Vue Router' }),
      makePost(3, { title: 'Postgres RLS' }),
      makePost(4, { title: 'Tailwind tips' }),
      makePost(5, { title: 'Vue reactivity' }),
    ])
    const wrapper = mountBlog()
    await flushPromises()

    await wrapper.find('.search-input input').setValue('vue')
    await flushPromises()

    const titles = wrapper.findAll('.all .post-title').map((t) => t.text())
    expect(titles).toEqual(['Vue reactivity'])
  })

  it('matches description as well as title', async () => {
    listPosts.mockResolvedValue([
      makePost(1),
      makePost(2),
      makePost(3),
      makePost(4, { title: 'Nothing', description: 'about kubernetes' }),
    ])
    const wrapper = mountBlog()
    await flushPromises()

    await wrapper.find('.search-input input').setValue('kubernetes')
    await flushPromises()

    expect(wrapper.findAll('.all .post')).toHaveLength(1)
  })

  it('hides the Tags button from non-admins', async () => {
    listPosts.mockResolvedValue([])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.tags-button').exists()).toBe(false)
  })

  it('hides the New post button from non-admins', async () => {
    listPosts.mockResolvedValue([])
    const wrapper = mountBlog()
    await flushPromises()

    expect(wrapper.find('.add-button').exists()).toBe(false)
  })
})
