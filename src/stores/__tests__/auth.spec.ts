import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const getSession = vi.fn()
const onAuthStateChange = vi.fn()
const signInWithOAuth = vi.fn()
const signOutFn = vi.fn()
const maybeSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: unknown) => onAuthStateChange(cb),
      signInWithOAuth: (opts: unknown) => signInWithOAuth(opts),
      signOut: () => signOutFn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }),
    }),
  },
}))

import { useAuthStore } from '../auth'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('useAuthStore', () => {
  it('starts logged out and not admin', () => {
    const store = useAuthStore()

    expect(store.session).toBeNull()
    expect(store.isAdmin).toBe(false)
    expect(store.ready).toBe(false)
  })

  it('marks ready and stays non-admin with no session', async () => {
    getSession.mockResolvedValue({ data: { session: null } })
    const store = useAuthStore()

    await store.init()

    expect(store.ready).toBe(true)
    expect(store.isAdmin).toBe(false)
  })

  it('sets isAdmin when the profile row says so', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null })
    const store = useAuthStore()

    await store.init()

    expect(store.isAdmin).toBe(true)
  })

  it('leaves isAdmin false for a signed-in non-admin', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u2' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: false }, error: null })
    const store = useAuthStore()

    await store.init()

    expect(store.session).not.toBeNull()
    expect(store.isAdmin).toBe(false)
  })

  it('leaves isAdmin false when the profile lookup errors', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u3' } } } })
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'denied' } })
    const store = useAuthStore()

    await store.init()

    expect(store.isAdmin).toBe(false)
  })

  it('clears state on sign out', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    maybeSingle.mockResolvedValue({ data: { is_admin: true }, error: null })
    signOutFn.mockResolvedValue({ error: null })
    const store = useAuthStore()
    await store.init()

    await store.signOut()

    expect(store.session).toBeNull()
    expect(store.isAdmin).toBe(false)
  })
})
