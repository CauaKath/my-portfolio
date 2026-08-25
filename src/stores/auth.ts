import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const isAdmin = ref(false)
  const ready = ref(false)

  const isLoggedIn = computed(() => session.value !== null)

  // The profiles row is readable only by its owner, so this answers "am I an
  // admin" without exposing the roster. It drives UI visibility only -- every
  // write is independently checked by RLS.
  async function refreshAdmin() {
    if (!session.value) {
      isAdmin.value = false
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.value.user.id)
      .maybeSingle()

    isAdmin.value = !error && Boolean(data?.is_admin)
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await refreshAdmin()

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      session.value = nextSession
      await refreshAdmin()
    })

    ready.value = true
  }

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/blog` },
    })

    if (error) throw new Error(error.message)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) throw new Error(error.message)

    session.value = null
    isAdmin.value = false
  }

  return { session, isAdmin, ready, isLoggedIn, init, signInWithGitHub, signOut }
})
