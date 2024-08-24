<template>
  <div>
    <div class="home-header">
      <div>
        <h2>Welcome to my Portfolio</h2>
        <h5>Here you'll find my projects, my resumé and some other things I wanted to code</h5>
      </div>
    </div>

    <section class="home-content">
      <div v-if="loading" class="loading">
        <img src="@/assets/loading-icon.svg" alt="Loading">
      </div>

      <div v-else class="card-list">
        <a v-for="repo of repositories" :href="repo.html_url" target="_blank">
          <Card
            :key="repo.id"
            :title="repo.name"
            :description="repo.description"
            :language="repo.language"
            :forks="repo.forks"
            :stars="repo.stargazers_count"
          />
        </a>
      </div>
    </section>

    <div class="home-footer">
      <span class="footer-title">Community</span>

      <div>
        <a href="https://github.com/CauaKath/my-portfolio" target="_blank">
          <img src="@/assets/github-icon.png" alt="Github icon">
          <span>Github Repo</span>
        </a>
        <a href="https://discord.gg/hRsFQ4YfGp" target="_blank">
          <img src="@/assets/discord-icon.png" alt="Discord icon">
          <span>Join Discord</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { fetchMostRecentRepos, fetchRepo } from '../services/github'
import Card from '../components/Card.vue'

import { type IRepo } from '@/interfaces/github';

export default {
  name: 'Home',
  components: {
    Card,
  },
  data() {
    return {
      repos: [] as IRepo[],
      loading: false,
    }
  },
  mounted() {
    this.fetchRepos()
  },
  computed: {
    repositories() {
      return this.repos
    }
  },
  methods: {
    async fetchRepos() {
      this.loading = true

      try {
        const [recentRepos, orgRepos] = await Promise.all([
          this.fetchRecentRepos(),
          this.fetchOrgRepos()
        ])

        if (recentRepos && orgRepos) {
          this.repos = [...orgRepos, ...recentRepos]
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async fetchRecentRepos() {
      try {
        const response = await fetchMostRecentRepos()
        
        return response
      } catch (error) {
        console.error(error)
      }
    },

    async fetchOrgRepos() {
      try {
        const [gewRepo, cijRepo] = await Promise.all([
          fetchRepo('ProjectGEW', 'gew-api'),
          fetchRepo('conexao-inclusao-jaragua', 'cij-api')
        ])

        if (gewRepo && cijRepo)
          return [gewRepo, cijRepo]

        return []
      } catch (error) {
        console.error(error)
      }
    }
  }
}
</script>

<style lang="scss">
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.home-header {
  @apply h-40 flex justify-center items-center flex-col border-b-[1px] border-light_border p-4;

  div {
    @apply w-fit flex flex-col items-center gap-4;

    h2 {
      @apply text-4xl font-bold text-primary-default self-start;
    }
  
    h5 {
      @apply text-base text-gray_text self-start;
    }
  }
}

.home-content {
  @apply min-h-[calc(100vh-160px-60px)] bg-background flex justify-center items-center p-4;

  .card-list {
    @apply w-[calc((384px*2)+24px)] flex flex-wrap justify-center gap-6 mx-auto;

    .card {
      flex-grow: 1;
    }
  }

  .loading {
    @apply flex justify-center items-center w-full h-full;

    img {
      @apply w-12 h-12;
      animation: spin 1s linear infinite;
    }
  }
}

.home-footer {
  @apply h-40 flex flex-col justify-center items-center gap-8 px-[30%] border-t-[1px] border-light_border;

  .footer-title {
    @apply text-4xl font-bold text-primary-default;
  }

  div {
    @apply flex gap-4;

    a {
      @apply flex gap-2 items-center border-[0.5px] border-primary-default rounded-[5px] px-4 py-2;

      img {
        @apply w-6 h-6;
      }

      span {
        @apply text-sm text-primary-default;
      }
    }
  }
}

@media screen and (max-width: 780px) {
  .home-header {
    @apply h-20 py-2 px-4;

    div {
      @apply w-full flex flex-col items-center gap-0.5;

      h2 {
        @apply text-lg self-start;
      }
  
      h5 {
        @apply text-xs self-start;
      }
    }
  }

  .home-footer {
    @apply px-4 h-20 flex justify-center items-center;

    .footer-title {
      @apply hidden;
    }

    div {
      @apply gap-4;

      a {
        span {
          @apply text-sm;
        }
      }
    }
  }
}
</style>