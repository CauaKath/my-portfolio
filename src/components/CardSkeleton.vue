<template>
  <div class="card" aria-hidden="true">
    <div class="card-texts">
      <SkeletonBlock class="h-4 w-32" />
      <SkeletonBlock class="h-3 w-48" />
      <SkeletonBlock class="h-3 w-40" />
    </div>

    <div class="card-content">
      <div class="card-numbers">
        <SkeletonBlock class="h-6 w-12" />
        <SkeletonBlock class="h-6 w-12" />
      </div>

      <SkeletonBlock class="w-6 h-6 rounded-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Reuses Card's own (global) classes so it matches a repository card.
import SkeletonBlock from '@/components/SkeletonBlock.vue'
</script>
