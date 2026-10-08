<template>
  <div class="post-cover" :class="{ placeholder: !url }" :style="url ? { backgroundImage: `url('${url}')` } : undefined">
    <svg v-if="!url" class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>

    <!-- Overlay content, such as the editor's cover actions -->
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ url: string | null }>()
</script>

<style lang="scss" scoped>
.post-cover {
  @apply relative w-full h-[300px] rounded-t-lg bg-center bg-cover;

  &.placeholder {
    @apply flex items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-300;

    .placeholder-icon {
      @apply w-12 h-12;
    }
  }
}
</style>
