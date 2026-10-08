import { ref } from 'vue'

import type { IPost } from '@/interfaces/post'

// Lower-cased and stripped of accents, so "curriculo" finds "Currículo".
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = normalize(query.trim())

  if (!needle) return true

  return fields.some((field) => field && normalize(field).includes(needle))
}

function matchesPost(query: string, post: IPost): boolean {
  return matches(query, post.title, post.description, ...post.tags.map((tag) => tag.name))
}

// Shared by the palette and the navbar button that opens it.
const searchOpen = ref(false)

function openSearch() {
  searchOpen.value = true
}

export { normalize, matches, matchesPost, searchOpen, openSearch }
