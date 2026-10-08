import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, RouterLinkStub, flushPromises } from '@vue/test-utils'

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

function mountTags() {
  return mount(Tags, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  services.listTagsWithCount.mockResolvedValue([go, vue])
  vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
  window.confirm = vi.fn().mockReturnValue(true)
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

  it('deletes after confirming and says how many posts lose the tag', async () => {
    services.deleteTag.mockResolvedValue(undefined)
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[0].trigger('click')
    await flushPromises()

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('removed from 2 posts'))
    expect(services.deleteTag).toHaveBeenCalledWith('t1')
  })

  it('does not delete when the confirmation is declined', async () => {
    window.confirm = vi.fn().mockReturnValue(false)
    const wrapper = mountTags()
    await flushPromises()

    await wrapper.findAll('.delete-tag')[0].trigger('click')

    expect(services.deleteTag).not.toHaveBeenCalled()
  })
})
