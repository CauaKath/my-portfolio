import { describe, it, expect } from 'vitest'
import { TAG_COLORS, DEFAULT_TAG_COLOR, normalizeTagName, finalTagName } from '../tag'
import { isHexColor } from '../tagColor'

describe('TAG_COLORS', () => {
  it('only holds valid, unique hex colors', () => {
    const hexes = TAG_COLORS.map((color) => color.hex)

    expect(hexes.every(isHexColor)).toBe(true)
    expect(new Set(hexes).size).toBe(hexes.length)
  })

  it('has fourteen colors and a default that is one of them', () => {
    expect(TAG_COLORS).toHaveLength(14)
    expect(TAG_COLORS.map((color) => color.hex)).toContain(DEFAULT_TAG_COLOR)
  })
})

describe('normalizeTagName', () => {
  it('lowercases', () => {
    expect(normalizeTagName('Go')).toBe('go')
  })

  it('turns spaces into hyphens', () => {
    expect(normalizeTagName('Data Structure')).toBe('data-structure')
    expect(normalizeTagName('a   b')).toBe('a-b')
    expect(normalizeTagName('a\tb')).toBe('a-b')
  })

  it('keeps a trailing hyphen so typing a multi-word name works', () => {
    expect(normalizeTagName('data ')).toBe('data-')
  })

  it('collapses repeated hyphens', () => {
    expect(normalizeTagName('a--b')).toBe('a-b')
  })
})

describe('finalTagName', () => {
  it('also strips hyphens at the ends', () => {
    expect(finalTagName('  Data Structure  ')).toBe('data-structure')
    expect(finalTagName('-go-')).toBe('go')
  })

  it('returns an empty string for blank input', () => {
    expect(finalTagName('   ')).toBe('')
  })
})
