import { describe, it, expect } from 'vitest'
import { slugify, uniqueSlug } from '../slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Pilha X Fila')).toBe('pilha-x-fila')
  })

  it('strips Portuguese accents', () => {
    expect(slugify('Introdução à Programação')).toBe('introducao-a-programacao')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('Vue 3: what?! -- really')).toBe('vue-3-what-really')
  })

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --hello--  ')).toBe('hello')
  })

  it('falls back to "post" when nothing survives', () => {
    expect(slugify('???')).toBe('post')
    expect(slugify('')).toBe('post')
  })

  it('caps length without leaving a trailing hyphen', () => {
    const slug = slugify('a'.repeat(100) + ' tail')
    expect(slug.length).toBeLessThanOrEqual(80)
    expect(slug.endsWith('-')).toBe(false)
  })
})

describe('uniqueSlug', () => {
  it('returns the plain slug when free', () => {
    expect(uniqueSlug('Pilha X Fila', [])).toBe('pilha-x-fila')
  })

  it('suffixes when taken', () => {
    expect(uniqueSlug('Pilha X Fila', ['pilha-x-fila'])).toBe('pilha-x-fila-2')
  })

  it('keeps counting past the first collision', () => {
    expect(uniqueSlug('Pilha X Fila', ['pilha-x-fila', 'pilha-x-fila-2'])).toBe('pilha-x-fila-3')
  })
})
