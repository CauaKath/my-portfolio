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
        <button v-if="auth.isAdmin" class="auth-icon" title="Log out" aria-label="Log out" @click="auth.signOut()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
        <RouterLink v-else class="auth-icon" to="/login" title="Login" aria-label="Login">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </RouterLink>
      </div>

      <button class="burger-menu" @click="toggleMenu">
        <img src="@/assets/burger-menu-icon.svg" alt="Burger menu">
      </button>
    </nav>

    <div v-if="isMenuOpen" class="burger-menu-modal">
      <ul class="menu-modal-item-list">
        <li class="menu-modal-item" v-for="navigation of navigationList" :key="navigation.name" @click="toggleMenu">
          <RouterLink :to="navigation.path">{{ navigation.name }}</RouterLink>
        </li>

        <template v-if="auth.isAdmin">
          <li class="menu-modal-item" @click="toggleMenu">
            <button @click="auth.signOut()">Log out</button>
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
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'Navbar',
  components: {
    RouterLink,
  },
  setup() {
    return { auth: useAuthStore() }
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

      .auth-icon {
        @apply flex items-center justify-center w-10 h-10 rounded-full text-text opacity-80 hover:opacity-100 hover:bg-border transition-colors;

        svg {
          @apply w-5 h-5;
        }
      }
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