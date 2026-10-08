import { describe, it, expect } from 'vitest'
import { readTimeMinutes } from '../readTime'

describe('readTimeMinutes', () => {
  it('never returns less than one minute', () => {
    expect(readTimeMinutes('')).toBe(1)
    expect(readTimeMinutes('three short words')).toBe(1)
  })

  it('rounds up partial minutes', () => {
    expect(readTimeMinutes('word '.repeat(201))).toBe(2)
  })

  it('counts 200 words as one minute', () => {
    expect(readTimeMinutes('word '.repeat(200))).toBe(1)
  })

  it('ignores repeated whitespace', () => {
    expect(readTimeMinutes('a\n\n\n   b\t\tc')).toBe(1)
  })
})
