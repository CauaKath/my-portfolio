import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const services = { listTags: vi.fn(), createTag: vi.fn() }
vi.mock('@/services/tags', () => ({
  listTags: () => services.listTags(),
  createTag: (input: unknown) => services.createTag(input),
}))
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

import TagPicker from '../TagPicker.vue'

const tags = [
  { id: 't1', name: 'Go', slug: 'go', description: null, color: '#0369A1' },
  { id: 't2', name: 'Vue', slug: 'vue', description: 'The framework', color: '#42B883' },
]

async function mountPicker(modelValue: string[] = []) {
  const wrapper = mount(TagPicker, {
    props: {
      modelValue,
      'onUpdate:modelValue': (value: string[]) => wrapper.setProps({ modelValue: value }),
    },
  })
  await flushPromises()

  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  services.listTags.mockResolvedValue(tags)
})

describe('TagPicker', () => {
  it('lists unselected tags in the menu', async () => {
    const wrapper = await mountPicker(['t1'])

    await wrapper.find('.add-tag').trigger('click')

    expect(wrapper.findAll('.menu-tag').map((t) => t.text())).toEqual(['Vue'])
  })

  it('selects a tag from the menu and closes it', async () => {
    const wrapper = await mountPicker()

    await wrapper.find('.add-tag').trigger('click')
    await wrapper.findAll('.menu-tag')[0].trigger('click')

    expect(wrapper.props('modelValue')).toEqual(['t1'])
    expect(wrapper.find('.menu').exists()).toBe(false)
    expect(wrapper.findAll('.selected-tag')).toHaveLength(1)
  })

  it('removes a selected tag', async () => {
    const wrapper = await mountPicker(['t1', 't2'])

    await wrapper.find('.remove-tag').trigger('click')

    expect(wrapper.props('modelValue')).toEqual(['t2'])
  })

  it('says so when every tag is selected', async () => {
    const wrapper = await mountPicker(['t1', 't2'])

    await wrapper.find('.add-tag').trigger('click')

    expect(wrapper.find('.menu-empty').text()).toBe('All tags selected')
  })

  it('creates a new tag and selects it', async () => {
    const created = { id: 't3', name: 'Rust', slug: 'rust', description: null, color: '#112233' }
    services.createTag.mockResolvedValue(created)
    const wrapper = await mountPicker()

    await wrapper.find('.add-tag').trigger('click')
    await wrapper.find('.new-tag').trigger('click')
    await wrapper.find('.tag-name').setValue('Rust')
    await wrapper.find('.tag-color-hex').setValue('#112233')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(services.createTag).toHaveBeenCalledWith({ name: 'Rust', description: null, color: '#112233' })
    expect(wrapper.props('modelValue')).toEqual(['t3'])
    expect(wrapper.find('.create-box').exists()).toBe(false)
    expect(wrapper.find('.selected-tag').text()).toContain('Rust')
  })

  it('keeps the form open and shows the error when creation fails', async () => {
    services.createTag.mockRejectedValue(new Error('A tag with this name already exists.'))
    const wrapper = await mountPicker()

    await wrapper.find('.add-tag').trigger('click')
    await wrapper.find('.new-tag').trigger('click')
    await wrapper.find('.tag-name').setValue('Go')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.tag-form-error').text()).toBe('A tag with this name already exists.')
    expect(wrapper.props('modelValue')).toEqual([])
  })

  it('shows an error when the tags cannot be loaded', async () => {
    services.listTags.mockRejectedValue(new Error('offline'))
    const wrapper = await mountPicker()

    expect(wrapper.find('.picker-error').text()).toBe('offline')
  })
})
