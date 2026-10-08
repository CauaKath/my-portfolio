import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TagForm from '../TagForm.vue'
import { TAG_COLORS, DEFAULT_TAG_COLOR } from '@/lib/tag'

describe('TagForm', () => {
  it('emits the values with the default color', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('go')
    await wrapper.find('.tag-description').setValue(' About Go ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([
      { name: 'go', description: 'About Go', color: DEFAULT_TAG_COLOR },
    ])
  })

  it('forces the name to lowercase with no spaces while typing', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('Data Structure')

    expect((wrapper.find('.tag-name').element as HTMLInputElement).value).toBe('data-structure')
  })

  it('submits the normalized name without edge hyphens', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('  Data Structure  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ name: 'data-structure' })
  })

  it('refuses to submit without a name', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('.tag-form-error').text()).toMatch(/name/i)
  })

  it('offers exactly the palette colors and marks the selected one', () => {
    const wrapper = mount(TagForm)
    const swatches = wrapper.findAll('.swatch')

    expect(swatches).toHaveLength(TAG_COLORS.length)
    expect(wrapper.findAll('.swatch.selected')).toHaveLength(1)
    expect(swatches[TAG_COLORS.findIndex((color) => color.hex === DEFAULT_TAG_COLOR)].classes()).toContain('selected')
  })

  it('submits the picked swatch color', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('go')
    await wrapper.findAll('.swatch')[3].trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ color: TAG_COLORS[3].hex })
    expect(wrapper.findAll('.swatch')[3].classes()).toContain('selected')
  })

  it('keeps an existing color that is not in the palette until another is picked', async () => {
    const wrapper = mount(TagForm, {
      props: { initial: { name: 'go', description: null, color: '#0369A1' } },
    })

    expect(wrapper.findAll('.swatch.selected')).toHaveLength(0)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ color: '#0369A1' })
  })

  it('previews the tag as a chip', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('rust')

    expect(wrapper.find('.tag-chip').text()).toBe('rust')
  })

  it('prefills from initial values and shows a server error', () => {
    const wrapper = mount(TagForm, {
      props: { initial: { name: 'go', description: 'd', color: TAG_COLORS[2].hex }, serverError: 'already exists' },
    })

    expect((wrapper.find('.tag-name').element as HTMLInputElement).value).toBe('go')
    expect(wrapper.findAll('.swatch')[2].classes()).toContain('selected')
    expect(wrapper.find('.tag-form-error').text()).toBe('already exists')
  })

  it('has icon-only buttons with accessible labels', () => {
    const wrapper = mount(TagForm, { props: { submitLabel: 'Create tag' } })

    expect(wrapper.find('.tag-submit').attributes('aria-label')).toBe('Create tag')
    expect(wrapper.find('.tag-cancel').attributes('aria-label')).toBe('Cancel')
    expect(wrapper.find('.tag-submit').text()).toBe('')
  })

  it('emits cancel', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-cancel').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
