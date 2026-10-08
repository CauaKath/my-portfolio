import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TagForm from '../TagForm.vue'

describe('TagForm', () => {
  it('emits the trimmed values with the default color', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('  Go  ')
    await wrapper.find('.tag-description').setValue(' About Go ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual([
      { name: 'Go', description: 'About Go', color: '#0369A1' },
    ])
  })

  it('refuses to submit without a name', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('.tag-form-error').text()).toMatch(/name/i)
  })

  it('keeps the picker and the hex field in sync', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-color-picker').setValue('#ff0000')
    expect((wrapper.find('.tag-color-hex').element as HTMLInputElement).value).toBe('#ff0000')

    await wrapper.find('.tag-color-hex').setValue('00ff00')
    expect((wrapper.find('.tag-color-picker').element as HTMLInputElement).value).toBe('#00ff00')
  })

  it('submits a hex typed without the leading #', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('Go')
    await wrapper.find('.tag-color-hex').setValue('112233')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ color: '#112233' })
  })

  it('rejects an incomplete hex color', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-name').setValue('Go')
    await wrapper.find('.tag-color-hex').setValue('#12')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('.tag-form-error').text()).toMatch(/hex/i)
  })

  it('prefills from initial values and shows a server error', () => {
    const wrapper = mount(TagForm, {
      props: { initial: { name: 'Go', description: 'd', color: '#112233' }, serverError: 'already exists' },
    })

    expect((wrapper.find('.tag-name').element as HTMLInputElement).value).toBe('Go')
    expect((wrapper.find('.tag-color-hex').element as HTMLInputElement).value).toBe('#112233')
    expect(wrapper.find('.tag-form-error').text()).toBe('already exists')
  })

  it('emits cancel', async () => {
    const wrapper = mount(TagForm)

    await wrapper.find('.tag-cancel').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
