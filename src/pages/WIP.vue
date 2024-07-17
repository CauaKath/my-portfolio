<template>
  <div class="wip">
    <h1>WIP</h1>
  </div>
</template>

<script lang="ts">
export default {
  name: 'WIP',
}
</script>

<style lang="scss">
.wip {
  @apply
    flex
    justify-center
    items-center
    h-[calc(100vh-100px-60px)]
    text-2xl;
}

@media screen and (max-width: 780px) {
  .wip {
    @apply h-[calc(100vh-60px-40px)];
  }
}
</style>