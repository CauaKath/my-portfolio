import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises, VueWrapper } from '@vue/test-utils'

const services = {
  listTagsWithCount: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}
vi.mock('@/services/tags', () => ({
  listTagsWithCount: () => services.listTagsWithCount(),
  createTag: (i: unknown) => services.createTag(i),
  updateTag: (id: string, i: unknown) => services.updateTag(id, i),
  deleteTag: (id: string) => services.deleteTag(id),
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import Tags from '../Tags.vue'
import { DEFAULT_TAG_COLOR } from '@/lib/tag'

const go = { id: 't1', name: 'Go', slug: 'go', description: 'Posts about Go', color: '#0369A1', post_count: 2 }
const vue = { id: 't2', name: 'Vue', slug: 'vue', description: null, color: '#42B883', post_count: 0 }

let mounted: VueWrapper | null = null

function mountTags() {
  mounted = mount(Tags, { global: { stubs: { RouterLink: RouterLinkStub } } })

  return mounted
}

// The confirmation dialog is teleported to <body>.
const q = (selector: string) => document.body.querySelector<HTMLElement>(selector)

beforeEach(() => {
  vi.clearAllMocks()
  services.listTagsWithCount.mockResolvedValue([go, vue])
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('Tags page', () => {
  it('lists tags with description and post count', async () => {
    const wrapper = mountTags()
    await flushPromises()

    const rows = wrapper.findAll('.tag-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Go')
    expect(rows[0].text()).toContain('Posts about Go')
    expect(rows[0].text()).toContain('2 posts')
    expect(rows[1].text()).toContain('0 posts')
  })

  it('shows an empty state', async () => {
    services.listTagsWithCount.mockResolvedValue([])
    const wrapper = mountTags()
    await flushPromises()

    expect(wrapper.find('.status').text()).toBe('No tags yet.')
  })

  it('shows a load error', async () => {
    services.listTagsWithCount.mockRejectedValue(new Error('offline'))
    const wrapper = mountTags()
    await flushPromises()

    expect(wrapper.find('.page-error').text()).toBe('offline')
  })

  it('creates a tag and reloads the list', async () => {
    services.createTag.mockResolvedValue({})
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.find('.new-tag').trigger('click')
    await wrapper.find('.create-box .tag-name').setValue('Rust')
    await wrapper.find('.create-box form').trigger('submit')
    await flushPromises()

    expect(services.createTag).toHaveBeenCalledWith({ name: 'rust', description: null, color: DEFAULT_TAG_COLOR })
    expect(services.listTagsWithCount).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.create-box').exists()).toBe(false)
  })

  it('keeps the form open and shows the error when creating fails', async () => {
    services.createTag.mockRejectedValue(new Error('A tag with this name already exists.'))
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.find('.new-tag').trigger('click')
    await wrapper.find('.create-box .tag-name').setValue('Go')
    await wrapper.find('.create-box form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.create-box .tag-form-error').text()).toBe('A tag with this name already exists.')
  })

  it('edits a tag inline', async () => {
    services.updateTag.mockResolvedValue({})
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.edit-tag')[0].trigger('click')
    await wrapper.find('.tag-row .tag-name').setValue('Golang')
    await wrapper.find('.tag-row form').trigger('submit')
    await flushPromises()

    expect(services.updateTag).toHaveBeenCalledWith('t1', {
      name: 'golang', description: 'Posts about Go', color: '#0369A1',
    })
    expect(wrapper.find('.tag-row form').exists()).toBe(false)
  })

  it('asks for confirmation in a modal instead of deleting right away', async () => {
    const wrapper = mountTags()
    await flushPromises()

    expect(q('.confirm-dialog')).toBeNull()

    await wrapper.findAll('.delete-tag')[0].trigger('click')

    expect(q('.confirm-dialog')).not.toBeNull()
    expect(q('.confirm-body')!.textContent).toContain('Go')
    expect(q('.confirm-body')!.textContent).toContain('removed from 2 posts')
    expect(services.deleteTag).not.toHaveBeenCalled()
  })

  it('says no post uses a tag that has none', async () => {
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[1].trigger('click')

    expect(q('.confirm-body')!.textContent).toContain('No post uses it.')
  })

  it('deletes, reloads and closes when the modal is confirmed', async () => {
    services.deleteTag.mockResolvedValue(undefined)
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[0].trigger('click')
    q('.confirm-ok')!.click()
    await flushPromises()

    expect(services.deleteTag).toHaveBeenCalledWith('t1')
    expect(services.listTagsWithCount).toHaveBeenCalledTimes(2)
    expect(q('.confirm-dialog')).toBeNull()
  })

  it('keeps the modal open and shows the error when deleting fails', async () => {
    services.deleteTag.mockRejectedValue(new Error('denied'))
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[0].trigger('click')
    q('.confirm-ok')!.click()
    await flushPromises()

    expect(q('.confirm-dialog')).not.toBeNull()
    expect(q('.confirm-error')!.textContent).toBe('denied')
  })

  it('does not delete when the modal is cancelled', async () => {
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[0].trigger('click')
    q('.confirm-cancel')!.click()
    await flushPromises()

    expect(services.deleteTag).not.toHaveBeenCalled()
    expect(q('.confirm-dialog')).toBeNull()
  })
})
