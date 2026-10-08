<template>
  <header class="header">
    <nav>
      <RouterLink class="navbar-icon" to="/">
        <img src="@/assets/page-icon.png" alt="Page icon"/>
      </RouterLink>
      
      <ul class="navbar-link-list">
        <li class="navbar-link" v-for="navigation of navigationList" :key="navigation.name">
          <RouterLink :to="navigation.path">{{ navigation.name }}</RouterLink>
        </li>
      </ul>

      <div class="search">
        <img src="@/assets/search-icon.svg" alt="Search icon">
      </div>

      <div class="auth">
        <!-- Icon-only so the row keeps the same width whether or not you are signed in -->
        <AppButton v-if="auth.isAdmin" class="auth-icon" variant="text" :icon="icons.logout" label="Log out" @click="auth.signOut()" />
        <AppButton v-else class="auth-icon" variant="text" :icon="icons.login" label="Login" to="/login" />
      </div>

      <AppButton class="burger-menu" variant="text" @click="toggleMenu">
        <img src="@/assets/burger-menu-icon.svg" alt="Burger menu">
      </AppButton>
    </nav>

    <div v-if="isMenuOpen" class="burger-menu-modal">
      <ul class="menu-modal-item-list">
        <li class="menu-modal-item" v-for="navigation of navigationList" :key="navigation.name" @click="toggleMenu">
          <RouterLink :to="navigation.path">{{ navigation.name }}</RouterLink>
        </li>

        <template v-if="auth.isAdmin">
          <li class="menu-modal-item" @click="toggleMenu">
            <AppButton variant="text" @click="auth.signOut()">Log out</AppButton>
          </li>
        </template>
        <li v-else class="menu-modal-item" @click="toggleMenu">
          <RouterLink to="/login">Login</RouterLink>
        </li>
      </ul>
    </div>
  </header>
</template>

<script lang="ts">
import { RouterLink } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import loginIcon from '@/assets/icons/login.svg'
import logoutIcon from '@/assets/icons/logout.svg'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Navbar',
  components: {
    RouterLink,
    AppButton,
  },
  setup() {
    return { auth: useAuthStore(), icons: { login: loginIcon, logout: logoutIcon } }
  },
  data() {
    return {
      navigationList: [
        { name: 'Resumé', path: '/resume' },
        { name: 'Blog', path: '/blog' },
        { name: 'Games', path: '/games' },
        { name: 'Portfolio', path: '/portfolio' },
      ],
      isMenuOpen: false,
    }
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen
    }
  }
}
</script>

<style lang="scss">
.header {
  @apply h-[100px] bg-primary-default text-white sticky top-0 z-50;
  // The navbar is dark, so buttons inside it use the light color.
  --btn-color: #f4f4f5;

  nav {
    @apply flex justify-between gap-12 items-center h-full w-full max-w-content-padded mx-auto px-4;

    .navbar-icon {
      @apply h-[50px] w-[50px];
    }

    .navbar-link-list {
      @apply flex gap-12 whitespace-nowrap;

      .navbar-link {
        @apply text-base text-text opacity-80;
      }
    }

    .search {
      @apply flex items-center gap-2 border-border border rounded-md p-2;
    }

    .auth {
      @apply flex items-center shrink-0;
    }

    .burger-menu {
      @apply hidden;
    }
  }
}
@media screen and (max-width: 780px) {
  .header {
    @apply h-[60px];

    nav {
      @apply justify-between px-4;

      .navbar-icon {
        @apply h-6 w-6;
      }

      .navbar-link, .auth, .search {
        @apply hidden;
      }

      .burger-menu {
        @apply block;
      }
    }

    .burger-menu-modal {
      @apply fixed right-0 m-2 h-fit w-32 bg-primary-default text-white flex flex-col items-center rounded-lg;

      .menu-modal-item-list {
        @apply flex flex-col items-center gap-4 px-4 py-6 w-full;

        .menu-modal-item {
          @apply w-full;
        }
      }
    }
  }
}
</style>