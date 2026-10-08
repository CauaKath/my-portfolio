<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import CommandPalette from './components/CommandPalette.vue'
</script>

<template>
  <Navbar />

  <RouterView class="router-content"/>

  <Footer />

  <CommandPalette />
</template>

<style scoped>
.router-content {
  @apply min-h-[calc(100vh-100px-60px)];
}
</style>
