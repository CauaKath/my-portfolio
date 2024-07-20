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
        <RouterLink class="navbar-link" to="/login">Login</RouterLink>

        <button class="register-btn">
          <RouterLink to="/register">Sign up</RouterLink>
        </button>
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

        <li class="menu-modal-item" @click="toggleMenu">
          <RouterLink to="/login">Login</RouterLink>
        </li>

        <li class="menu-modal-item" @click="toggleMenu">
          <RouterLink to="/register">Sign up</RouterLink>
        </li>
      </ul>
    </div>
  </header>
</template>

<script lang="ts">
import { RouterLink } from 'vue-router'

export default {
  name: 'Navbar',
  components: {
    RouterLink,
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
    @apply flex justify-center gap-12 items-center h-full;

    .navbar-icon {
      @apply h-[50px] w-[50px];
    }

    .navbar-link-list {
      @apply flex gap-12;

      .navbar-link {
        @apply text-base text-text opacity-80;
      }
    }

    .search {
      @apply flex items-center gap-2 border-border border rounded-md p-2;
    }

    .auth {
      @apply flex items-center gap-6;

      .register-btn {
        @apply bg-gradient-to-r from-register-from to-register-to text-white rounded-full px-6 py-2;
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