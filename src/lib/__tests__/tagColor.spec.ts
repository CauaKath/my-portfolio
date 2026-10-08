import { describe, it, expect } from 'vitest'
import { isHexColor, readableTextColor } from '../tagColor'

describe('isHexColor', () => {
  it('accepts #RRGGBB in either case', () => {
    expect(isHexColor('#0369A1')).toBe(true)
    expect(isHexColor('#abcdef')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isHexColor('0369A1')).toBe(false)
    expect(isHexColor('#fff')).toBe(false)
    expect(isHexColor('#12345g')).toBe(false)
    expect(isHexColor('red')).toBe(false)
    expect(isHexColor('')).toBe(false)
  })
})

describe('readableTextColor', () => {
  it('uses white text on dark backgrounds', () => {
    expect(readableTextColor('#000000')).toBe('#FFFFFF')
    expect(readableTextColor('#0369A1')).toBe('#FFFFFF')
  })

  it('uses dark text on light backgrounds', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#0F172A')
    expect(readableTextColor('#FDE047')).toBe('#0F172A')
  })

  it('falls back to dark text for an invalid color', () => {
    expect(readableTextColor('nope')).toBe('#0F172A')
  })
})
