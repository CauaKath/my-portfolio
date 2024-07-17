<template>
  <div>
    <h1>Home</h1>
  </div>
</template>

<script lang="ts">
export default {
  name: 'Home',
}
</script>

<style lang="scss">
h1 {
  @apply text-primary-default h-[calc(100vh-100px-60px)] flex justify-center items-center text-2xl;
}

@media screen and (max-width: 780px) {
  h1 {
    @apply h-[calc(100vh-60px-40px)] text-xl;
  }
}
</style>