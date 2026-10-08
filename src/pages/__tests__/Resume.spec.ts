import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

import Resume from '../Resume.vue'
import { setLocale } from '@/i18n'

describe('Resume page', () => {
  beforeEach(() => setLocale('en'))

  it('renders the terminal view and the printable sheet', () => {
    const wrapper = mount(Resume)

    expect(wrapper.find('.terminal').exists()).toBe(true)
    expect(wrapper.find('.sheet').exists()).toBe(true)
    expect(wrapper.find('.terminal .name').text()).toBe('Cauã Guilherme Kath')
  })

  it('lists experience as git log lines with a hash, HEAD on the newest', () => {
    const commits = mount(Resume).findAll('.terminal .commit')

    expect(commits).toHaveLength(3)
    expect(commits[0].find('.hash').text()).toMatch(/^[0-9a-f]{7}$/)
    expect(commits[0].find('.refs').text()).toContain('HEAD -> main')
    expect(commits[1].find('.refs').exists()).toBe(false)
  })

  it('shows the skills as JSON', () => {
    const json = mount(Resume).find('.terminal .json').text()

    expect(json).toContain('"stack"')
    expect(json).toContain('"Java"')
  })

  it('follows the selected language', async () => {
    const wrapper = mount(Resume)

    setLocale('pt-BR')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.terminal .accent').text()).toContain('Desenvolvedor Back-end Pleno')
  })
})
