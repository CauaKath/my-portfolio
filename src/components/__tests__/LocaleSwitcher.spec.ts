import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import LocaleSwitcher from '../LocaleSwitcher.vue'
import { i18n, setLocale } from '@/i18n'

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
  })

  it('shows the current language and hides the list until opened', () => {
    const wrapper = mount(LocaleSwitcher)

    expect(wrapper.find('.locale-trigger').text()).not.toContain('English')
    expect(wrapper.find('.locale-trigger img').exists()).toBe(true)
    expect(wrapper.find('.locale-menu').exists()).toBe(false)
  })

  it('lists both languages with flags and marks the current one', async () => {
    const wrapper = mount(LocaleSwitcher)

    await wrapper.find('.locale-trigger').trigger('click')

    const options = wrapper.findAll('.locale-option')

    expect(options.map((option) => option.text())).toEqual(['English', 'Português'])
    expect(options.every((option) => option.find('img').exists())).toBe(true)
    expect(options[0].attributes('aria-selected')).toBe('true')
  })

  it('switches the whole app, persists the choice and closes', async () => {
    const wrapper = mount(LocaleSwitcher)

    await wrapper.find('.locale-trigger').trigger('click')
    await wrapper.findAll('.locale-option')[1].trigger('click')

    expect(i18n.global.locale.value).toBe('pt-BR')
    expect(document.documentElement.lang).toBe('pt-BR')
    expect(localStorage.getItem('locale')).toBe('pt-BR')
    expect(wrapper.find('.locale-menu').exists()).toBe(false)
    expect(wrapper.find('.locale-trigger').text()).not.toContain('Português')
  })
})
