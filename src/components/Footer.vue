<template>
  <footer class="footer">
    <p>© All rights reserved to @cauakath</p>
  </footer>
</template>

<script lang="ts">
export default {
  name: 'Footer',
}
</script>

<style lang="scss">
.footer {
  @apply h-[60px] bg-primary-default text-white text-sm flex justify-center items-center;
}

@media screen and (max-width: 780px) {
  .footer {
    @apply h-[40px] text-xs;
  }
}
</style>