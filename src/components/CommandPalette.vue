<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="searchOpen" class="palette-backdrop" @mousedown.self="close">
        <div class="palette-dialog" role="dialog" aria-modal="true" :aria-label="t('search.title')">
          <input
            ref="input"
            v-model="query"
            class="palette-input"
            type="text"
            role="combobox"
            aria-controls="palette-list"
            aria-autocomplete="list"
            :aria-expanded="true"
            :aria-activedescendant="results.length ? `palette-item-${active}` : undefined"
            :placeholder="t('search.placeholder')"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="choose(results[active])"
          />

          <ul id="palette-list" class="palette-list" role="listbox">
            <li
              v-for="(item, index) in results"
              :id="`palette-item-${index}`"
              :key="item.key"
              class="palette-item"
              :class="{ active: index === active }"
              role="option"
              :aria-selected="index === active"
              @mousemove="active = index"
              @click="choose(item)"
            >
              <span class="palette-kind" :class="`kind-${item.type}`">{{ item.kind }}</span>
              <span class="palette-label">{{ item.label }}</span>
              <span v-if="item.draft" class="palette-draft">{{ t('search.draft') }}</span>
            </li>

            <li v-if="!results.length" class="palette-empty">{{ postsFailed ? t('search.failed') : t('search.empty') }}</li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { listPosts } from '@/services/posts'
import { matches, matchesPost, searchOpen } from '@/lib/search'
import type { IPost } from '@/interfaces/post'

// Ctrl/Cmd + K palette: jumps to a page or a blog post. Mounted once in App.
// Posts are fetched on first open and kept; row level security already hides
// drafts from anyone but the admin, who sees them flagged.
interface IResult {
  key: string
  type: 'page' | 'post'
  kind: string
  label: string
  path: string
  draft?: boolean
}

const RECENT_POSTS = 5

const { t } = useI18n()
const router = useRouter()

const query = ref('')
const active = ref(0)
const input = ref<HTMLInputElement | null>(null)
const posts = ref<IPost[] | null>(null)
const postsFailed = ref(false)

let previouslyFocused: HTMLElement | null = null
let previousOverflow = ''

const pages = computed(() => [
  { type: 'page' as const, key: 'page-home', kind: t('search.page'), label: t('nav.home'), path: '/' },
  { type: 'page' as const, key: 'page-resume', kind: t('search.page'), label: t('nav.resume'), path: '/resume' },
  { type: 'page' as const, key: 'page-blog', kind: t('search.page'), label: t('nav.blog'), path: '/blog' },
])

const results = computed<IResult[]>(() => {
  const term = query.value
  const pageHits = pages.value.filter((page) => matches(term, page.label))

  // Posts come back newest first, so an empty query shows the latest few.
  const found = (posts.value ?? []).filter((post) => matchesPost(term, post))
  const postHits = (term.trim() ? found : found.slice(0, RECENT_POSTS)).map((post) => ({
    type: 'post' as const,
    key: `post-${post.id}`,
    kind: t('search.post'),
    label: post.title,
    path: `/blog/${post.slug}`,
    draft: post.status === 'DRAFT',
  }))

  return [...pageHits, ...postHits]
})

watch(results, () => (active.value = 0))

function close() {
  searchOpen.value = false
}

function move(step: number) {
  if (!results.value.length) return

  active.value = (active.value + step + results.value.length) % results.value.length
}

function choose(item: IResult | undefined) {
  if (!item) return

  close()
  router.push(item.path)
}

async function loadPosts() {
  if (posts.value) return

  try {
    posts.value = await listPosts()
    postsFailed.value = false
  } catch {
    postsFailed.value = true
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchOpen.value = !searchOpen.value
  } else if (event.key === 'Escape' && searchOpen.value) {
    close()
  } else if (event.key === 'Tab' && searchOpen.value) {
    // The input is the only tab stop in the dialog.
    event.preventDefault()
  }
}

watch(searchOpen, (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement as HTMLElement | null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    query.value = ''
    active.value = 0
    loadPosts()
    nextTick(() => input.value?.focus())
  } else {
    document.body.style.overflow = previousOverflow
    previouslyFocused?.focus?.()
    previouslyFocused = null
  }
})

onMounted(() => window.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)

  if (searchOpen.value) document.body.style.overflow = previousOverflow
})
</script>

<style lang="scss" scoped>
.palette-backdrop {
  @apply fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[15vh] bg-primary-default/50;

  .palette-dialog {
    @apply w-full max-w-[560px] bg-white rounded-lg shadow-lg overflow-hidden;

    .palette-input {
      @apply w-full px-4 py-3 text-base text-slate-800 border-b border-slate-200 outline-none;
    }

    .palette-list {
      @apply max-h-[50vh] overflow-y-auto p-2;

      .palette-item {
        @apply flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer text-sm text-slate-700;

        &.active {
          @apply bg-slate-100 text-slate-900;
        }

        .palette-kind {
          @apply min-w-[4.25rem] shrink-0 inline-flex items-center justify-center whitespace-nowrap text-[10px] leading-none font-semibold uppercase tracking-wide rounded-full px-2 py-1 pl-[calc(0.5rem+0.025em)];

          &.kind-page {
            @apply text-blue-700 bg-blue-100;
          }

          &.kind-post {
            @apply text-emerald-700 bg-emerald-100;
          }
        }

        .palette-label {
          @apply truncate;
        }

        .palette-draft {
          @apply ml-auto text-xs text-amber-600;
        }
      }

      .palette-empty {
        @apply px-3 py-6 text-center text-sm text-slate-500;
      }
    }
  }
}

.palette-enter-active, .palette-leave-active {
  transition: opacity 0.15s ease;

  .palette-dialog {
    transition: transform 0.15s ease;
  }
}

.palette-enter-from, .palette-leave-to {
  opacity: 0;

  .palette-dialog {
    transform: scale(0.98);
  }
}

@media (prefers-reduced-motion: reduce) {
  .palette-enter-active, .palette-leave-active, .palette-enter-active .palette-dialog, .palette-leave-active .palette-dialog {
    transition: none;
  }
}
</style>
