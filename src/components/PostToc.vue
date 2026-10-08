<template>
  <nav v-if="items.length" class="toc" aria-label="Table of contents">
    <ul>
      <li v-for="item of items" :key="item.id" :class="{ nested: item.level === 3, active: item.id === activeId }">
        <a :href="`#${item.id}`" @click.prevent="goTo(item.id)">{{ item.text }}</a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick } from 'vue'

import type { TocItem } from '@/lib/markdown'

const props = defineProps<{ items: TocItem[] }>()

const activeId = ref('')

let observer: IntersectionObserver | null = null

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  activeId.value = id
}

function observe() {
  observer?.disconnect()
  observer = null

  if (typeof IntersectionObserver === 'undefined') return

  activeId.value = props.items[0]?.id ?? ''

  // A heading becomes active once it crosses the top fifth of the viewport
  // and stays active until the next one does.
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) activeId.value = entry.target.id
      }
    },
    { rootMargin: '0px 0px -80% 0px' },
  )

  for (const item of props.items) {
    const heading = document.getElementById(item.id)
    if (heading) observer.observe(heading)
  }
}

// The headings live in v-html content, so wait for the DOM to be patched
// before looking them up.
watch(() => props.items, () => nextTick(observe), { immediate: true, flush: 'post' })

onBeforeUnmount(() => observer?.disconnect())
</script>

<style lang="scss" scoped>
.toc {
  @apply hidden xl:block fixed top-48 w-48 text-sm;
  left: calc(50% + 396px + 3rem);

  ul {
    @apply flex flex-col gap-2 border-l border-slate-300 pl-4;
  }

  .nested {
    @apply pl-3;
  }

  a {
    @apply text-slate-400 transition-colors hover:text-slate-800;
  }

  .active a {
    @apply text-slate-800 font-medium;
  }
}
</style>
