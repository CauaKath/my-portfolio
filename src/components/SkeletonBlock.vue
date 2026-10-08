<template>
  <div class="skeleton" aria-hidden="true"></div>
</template>

<!-- Size and shape come from the caller's classes, for example "h-4 w-24". -->
<style lang="scss" scoped>
.skeleton {
  @apply bg-slate-300 animate-pulse rounded-md;
}
</style>
