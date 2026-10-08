import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'

const listPosts = vi.fn()
vi.mock('@/services/posts', () => ({ listPosts: () => listPosts() }))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import CommandPalette from '../CommandPalette.vue'
import { searchOpen, openSearch } from '@/lib/search'
import type { IPost } from '@/interfaces/post'

const post = (id: string, title: string, status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED') =>
  ({ id, slug: `slug-${id}`, title, description: null, tags: [], status }) as unknown as IPost

let wrapper: VueWrapper | null = null

const q = (selector: string) => document.body.querySelector<HTMLElement>(selector)
const labels = () => [...document.body.querySelectorAll('.palette-label')].map((el) => el.textContent)
const press = (init: KeyboardEventInit) => window.dispatchEvent(new KeyboardEvent('keydown', init))

async function mountPalette() {
  wrapper = mount(CommandPalette)
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  searchOpen.value = false
  listPosts.mockResolvedValue([post('1', 'Vue tips'), post('2', 'Secret', 'DRAFT')])
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.innerHTML = ''
  document.body.style.overflow = ''
})

describe('CommandPalette', () => {
  it('is closed until Ctrl+K', async () => {
    await mountPalette()
    expect(q('.palette-dialog')).toBeNull()

    press({ key: 'k', ctrlKey: true })
    await flushPromises()

    expect(q('.palette-dialog')).not.toBeNull()
  })

  it('opens from the shared open function and closes on Esc', async () => {
    await mountPalette()
    openSearch()
    await flushPromises()
    expect(q('.palette-dialog')).not.toBeNull()

    press({ key: 'Escape' })
    await flushPromises()
    expect(searchOpen.value).toBe(false)
  })

  it('lists pages and posts, flagging drafts', async () => {
    await mountPalette()
    openSearch()
    await flushPromises()

    expect(labels()).toEqual(['Home', 'Resumé', 'Blog', 'Vue tips', 'Secret'])
    expect(q('.palette-draft')).not.toBeNull()
  })

  it('filters by query', async () => {
    await mountPalette()
    openSearch()
    await flushPromises()

    const input = q('.palette-input') as HTMLInputElement
    input.value = 'vue'
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(labels()).toEqual(['Vue tips'])
  })

  it('navigates to the selected result on Enter', async () => {
    await mountPalette()
    openSearch()
    await flushPromises()

    const input = q('.palette-input') as HTMLInputElement
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/resume')
    expect(searchOpen.value).toBe(false)
  })

  it('shows an empty state', async () => {
    await mountPalette()
    openSearch()
    await flushPromises()

    const input = q('.palette-input') as HTMLInputElement
    input.value = 'zzzz'
    input.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(q('.palette-empty')!.textContent).toBe('No results.')
  })
})
