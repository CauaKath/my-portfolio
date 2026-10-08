import { describe, it, expect } from 'vitest'

import { normalize, matches, matchesPost } from '../search'
import type { IPost } from '@/interfaces/post'

const post = {
  title: 'Building a Portfolio',
  description: 'How I made it',
  tags: [{ id: '1', name: 'Vue', slug: 'vue', description: null, color: 'blue' }],
} as IPost

describe('normalize', () => {
  it('lower-cases and strips accents', () => {
    expect(normalize('Currículo')).toBe('curriculo')
  })
})

describe('matches', () => {
  it('matches everything on an empty query', () => {
    expect(matches('  ', 'anything')).toBe(true)
  })

  it('ignores case and accents', () => {
    expect(matches('curriculo', 'Currículo')).toBe(true)
  })

  it('skips null fields and reports a miss', () => {
    expect(matches('xyz', null, undefined, 'abc')).toBe(false)
  })
})

describe('matchesPost', () => {
  it('matches title, description and tag names', () => {
    expect(matchesPost('portfolio', post)).toBe(true)
    expect(matchesPost('made it', post)).toBe(true)
    expect(matchesPost('vue', post)).toBe(true)
    expect(matchesPost('react', post)).toBe(false)
  })
})
