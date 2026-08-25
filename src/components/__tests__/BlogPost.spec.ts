import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import BlogPost from '../BlogPost.vue'
import type { IPost } from '@/interfaces/post'

const post: IPost = {
  id: '1',
  slug: 'pilha-x-fila',
  title: 'Pilha X Fila',
  description: 'Qual a diferença?',
  body: 'word '.repeat(400),
  cover_url: 'https://cdn/cover.png',
  tags: ['tech', 'data-structure'],
  status: 'PUBLISHED',
  published_at: '2026-08-13T10:00:00Z',
  created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-13T10:00:00Z',
}

function mountPost(overrides: Partial<IPost> = {}) {
  return mount(BlogPost, {
    props: { post: { ...post, ...overrides } },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('BlogPost', () => {
  it('renders title and description from the post', () => {
    const wrapper = mountPost()

    expect(wrapper.text()).toContain('Pilha X Fila')
    expect(wrapper.text()).toContain('Qual a diferença?')
  })

  it('renders each tag with a hash prefix', () => {
    const tags = mountPost().findAll('.post-tags span').map((t) => t.text())

    expect(tags).toEqual(['#tech', '#data-structure'])
  })

  it('shows computed read time', () => {
    expect(mountPost().text()).toContain('2 min read')
  })

  it('links to the post slug', () => {
    const link = mountPost().findComponent(RouterLinkStub)

    expect(link.props('to')).toBe('/blog/pilha-x-fila')
  })

  it('uses the cover image when present', () => {
    const style = mountPost().find('.post-image').attributes('style')

    expect(style).toContain('https://cdn/cover.png')
  })

  it('falls back to the default banner when cover is null', () => {
    const style = mountPost({ cover_url: null }).find('.post-image').attributes('style')

    expect(style).toContain('banner')
  })

  it('shows a DRAFT badge only for drafts', () => {
    expect(mountPost({ status: 'DRAFT' }).find('.draft-badge').exists()).toBe(true)
    expect(mountPost().find('.draft-badge').exists()).toBe(false)
  })

  it('handles a null description without printing "null"', () => {
    expect(mountPost({ description: null }).text()).not.toContain('null')
  })
})
