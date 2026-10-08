import { describe, it, expect, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import AppButton from '../AppButton.vue'

const mountButton = (props = {}, slots: Record<string, string> = {}) =>
  mount(AppButton, { props, slots, global: { stubs: { RouterLink: RouterLinkStub } } })

describe('AppButton', () => {
  it('renders a button of type "button" by default, so it never submits a form by accident', () => {
    const wrapper = mountButton({}, { default: 'Save' })

    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.text()).toBe('Save')
  })

  it('is soft by default and supports filled, outlined, text and float variants', () => {
    expect(mountButton({}, { default: 'a' }).classes()).toContain('soft')
    expect(mountButton({ variant: 'filled' }, { default: 'a' }).classes()).toContain('filled')
    expect(mountButton({ variant: 'outlined' }, { default: 'a' }).classes()).toContain('outlined')
    expect(mountButton({ variant: 'text' }, { default: 'a' }).classes()).toContain('text')
    expect(mountButton({ variant: 'float' }, { default: 'a' }).classes()).toContain('float')
  })

  it('is medium by default and supports small and large', () => {
    expect(mountButton({}, { default: 'a' }).classes()).toContain('md')
    expect(mountButton({ size: 'sm' }, { default: 'a' }).classes()).toContain('sm')
    expect(mountButton({ size: 'lg' }, { default: 'a' }).classes()).toContain('lg')
  })

  it('shows an icon next to the label', () => {
    const wrapper = mountButton({ icon: '/plus.svg' }, { default: 'Add' })

    expect(wrapper.find('.app-button-icon').exists()).toBe(true)
    expect(wrapper.attributes('style')).toContain('/plus.svg')
    expect(wrapper.classes()).not.toContain('icon-only')
  })

  it('is icon-only without a label slot, and exposes its label to assistive tech', () => {
    const wrapper = mountButton({ icon: '/trash.svg', label: 'Delete' })

    expect(wrapper.classes()).toContain('icon-only')
    expect(wrapper.attributes('aria-label')).toBe('Delete')
    expect(wrapper.attributes('title')).toBe('Delete')
  })

  it('does not add aria-label or title when there is visible text', () => {
    const wrapper = mountButton({ icon: '/plus.svg', label: 'ignored' }, { default: 'Add' })

    expect(wrapper.attributes('aria-label')).toBeUndefined()
  })

  it('warns about an icon-only button without a label', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mountButton({ icon: '/plus.svg' })

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs a `label`'))
    warn.mockRestore()
  })

  it('renders a link when given `to`', () => {
    const wrapper = mountButton({ to: '/tags' }, { default: 'Tags' })

    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/tags')
  })

  it('uses a custom color through --btn-color', () => {
    const wrapper = mountButton({ color: '#0369A1' }, { default: 'a' })

    expect(wrapper.attributes('style')).toContain('--btn-color: #0369A1')
  })

  it('applies the danger tone', () => {
    expect(mountButton({ danger: true }, { default: 'Delete' }).classes()).toContain('danger')
  })

  it('does not fire click when disabled', async () => {
    const onClick = vi.fn()
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      attrs: { onClick },
      slots: { default: 'Save' },
    })

    await wrapper.trigger('click')

    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('passes class and listeners through to the root element', async () => {
    const onClick = vi.fn()
    const wrapper = mount(AppButton, { attrs: { class: 'save-draft', onClick }, slots: { default: 'Save' } })

    await wrapper.trigger('click')

    expect(wrapper.classes()).toContain('save-draft')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('submits a form when type is submit', () => {
    expect(mountButton({ type: 'submit' }, { default: 'Go' }).attributes('type')).toBe('submit')
  })
})
