import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import SkeletonBlock from '../SkeletonBlock.vue'
import BlogPostSkeleton from '../BlogPostSkeleton.vue'
import CardSkeleton from '../CardSkeleton.vue'

describe('SkeletonBlock', () => {
  it('is hidden from assistive technology and takes its size from classes', () => {
    const wrapper = mount(SkeletonBlock, { attrs: { class: 'h-4 w-24' } })

    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['skeleton', 'h-4', 'w-24']))
  })
})

describe('BlogPostSkeleton', () => {
  it.each(['default', 'most-recent', 'other-recent'] as const)('mirrors the %s BlogPost card classes', (type) => {
    const wrapper = mount(BlogPostSkeleton, { props: { type } })

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['post', type]))
    expect(wrapper.find('.post-image').classes()).toContain(type)
    expect(wrapper.find('.post-content').classes()).toContain(type)
  })

  it('is decorative', () => {
    expect(mount(BlogPostSkeleton).attributes('aria-hidden')).toBe('true')
  })
})

describe('CardSkeleton', () => {
  it('mirrors the repository Card structure and is decorative', () => {
    const wrapper = mount(CardSkeleton)

    expect(wrapper.classes()).toContain('card')
    expect(wrapper.find('.card-texts').exists()).toBe(true)
    expect(wrapper.find('.card-content').exists()).toBe(true)
    expect(wrapper.attributes('aria-hidden')).toBe('true')
  })
})
