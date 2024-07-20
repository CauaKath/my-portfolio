<script setup lang="ts">
import { RouterView } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <Navbar />

  <RouterView class="router-content"/>

  <Footer />
</template>

<style scoped>
.router-content {
  @apply min-h-[calc(100vh-100px-60px)];
}
</style>
