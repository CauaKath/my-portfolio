<template>
  <div ref="root" class="locale-switcher">
    <button
      class="locale-trigger"
      type="button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="t('nav.language')"
      :title="t('nav.language')"
      @click="open = !open"
    >
      <img :src="current.flag" alt="" class="locale-flag" />
      <span class="locale-caret" aria-hidden="true">▾</span>
    </button>

    <ul v-if="open" class="locale-menu" role="listbox" :aria-label="t('nav.language')">
      <li
        v-for="option of options"
        :key="option.code"
        class="locale-option"
        :class="{ selected: option.code === locale }"
        role="option"
        tabindex="0"
        :aria-selected="option.code === locale"
        @click="choose(option.code)"
        @keydown.enter.prevent="choose(option.code)"
        @keydown.space.prevent="choose(option.code)"
      >
        <img :src="option.flag" alt="" class="locale-flag" />
        <span>{{ option.name }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'

import { setLocale, type Locale } from '@/i18n'
import usFlag from '@/assets/flags/us.svg'
import brFlag from '@/assets/flags/br.svg'

const { t, locale } = useI18n()

// Each language is named in itself, so it stays readable whatever the current
// language is. Flags are SVGs: Windows renders flag emoji as plain letters.
const options: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: usFlag },
  { code: 'pt-BR', name: 'Português', flag: brFlag },
]

const current = computed(() => options.find((option) => option.code === locale.value) ?? options[0])

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function choose(code: Locale) {
  setLocale(code)
  open.value = false
}

function onDocumentPointerDown(event: Event) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style lang="scss">
.locale-switcher {
  @apply relative text-sm;

  .locale-trigger {
    @apply flex items-center gap-2 px-2 h-9 rounded-md cursor-pointer;
    color: var(--btn-color, currentColor);

    &:hover {
      @apply bg-white/10;
    }
  }

  .locale-flag {
    @apply w-5 h-[14px] rounded-[2px] object-cover shrink-0;
  }

  .locale-caret {
    @apply text-xs opacity-70;
  }

  .locale-menu {
    @apply
      absolute
      right-0
      top-full
      mt-1
      min-w-full
      py-1
      rounded-md
      bg-white
      text-primary-default
      shadow-lg
      z-50;
  }

  .locale-option {
    @apply flex items-center gap-2 px-3 py-2 cursor-pointer whitespace-nowrap;

    &:hover, &:focus-visible {
      @apply bg-background outline-none;
    }

    &.selected {
      @apply font-bold;
    }
  }
}
</style>
