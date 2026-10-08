<template>
  <div class="login">
    <div class="login-card">
      <h1>Sign in</h1>
      <p>This blog has a single author. Signing in gives you nothing unless you are it.</p>

      <AppButton class="github-btn" variant="filled" :disabled="loading" @click="signIn">
        <img src="@/assets/github-icon.png" alt="">
        <span>{{ loading ? 'Redirecting…' : 'Continue with GitHub' }}</span>
      </AppButton>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const error = ref('')

async function signIn() {
  loading.value = true
  error.value = ''

  try {
    await auth.signInWithGitHub()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Sign in failed.'
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login {
  @apply flex justify-center items-center bg-background min-h-[calc(100vh-100px-60px)] p-4;

  .login-card {
    @apply bg-white rounded-lg shadow-lg p-8 flex flex-col gap-4 max-w-md w-full;

    h1 {
      @apply text-2xl font-bold text-primary-default;
    }

    p {
      @apply text-sm text-gray_text;
    }

    .github-btn {
      img {
        @apply w-5 h-5;
      }
    }

    .error {
      @apply text-sm text-red-600;
    }
  }
}
</style>
