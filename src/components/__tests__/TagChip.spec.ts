import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import TagChip from '../TagChip.vue'

function mountChip(tag: { name: string; color: string; description: string | null }) {
  return mount(TagChip, { props: { tag } })
}

describe('TagChip', () => {
  it('shows the name tinted with the tag color', () => {
    const chip = mountChip({ name: 'Go', color: '#0369A1', description: null })

    expect(chip.text()).toBe('Go')
    expect(chip.attributes('style')).toContain('background-color: rgb(3, 105, 161)')
  })

  it('picks a readable text color', () => {
    const dark = mountChip({ name: 'a', color: '#000000', description: null })
    const light = mountChip({ name: 'a', color: '#FDE047', description: null })

    expect(dark.attributes('style')).toContain('color: rgb(255, 255, 255)')
    expect(light.attributes('style')).toContain('color: rgb(15, 23, 42)')
  })

  it('exposes the description as a tooltip', () => {
    const chip = mountChip({ name: 'Go', color: '#0369A1', description: 'Posts about Go' })

    expect(chip.attributes('title')).toBe('Posts about Go')
  })

  it('has no tooltip without a description', () => {
    expect(mountChip({ name: 'Go', color: '#0369A1', description: null }).attributes('title')).toBeUndefined()
  })
})
