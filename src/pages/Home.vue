<template>
  <div>
    <div class="home-header">
      <div>
        <h2>{{ $t('home.title') }}</h2>
        <h5>{{ $t('home.subtitle') }}</h5>
      </div>
    </div>

    <section class="home-content">
      <div v-if="loading" class="card-list" aria-busy="true">
        <CardSkeleton v-for="n of 6" :key="n" />

        <span class="sr-only">{{ $t('home.loadingRepos') }}</span>
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
      <span class="footer-title">{{ $t('home.community') }}</span>

      <div>
        <a href="https://github.com/CauaKath/my-portfolio" target="_blank">
          <img src="@/assets/github-icon.png" :alt="$t('home.githubAlt')">
          <span>{{ $t('home.githubRepo') }}</span>
        </a>
        <a href="https://discord.gg/hRsFQ4YfGp" target="_blank">
          <img src="@/assets/discord-icon.png" :alt="$t('home.discordAlt')">
          <span>{{ $t('home.joinDiscord') }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { fetchMostRecentRepos, fetchRepo } from '../services/github'
import Card from '../components/Card.vue'
import CardSkeleton from '../components/CardSkeleton.vue'

import { type IRepo } from '@/interfaces/github';

export default {
  name: 'Home',
  components: {
    Card,
    CardSkeleton,
  },
  data() {
    return {
      repos: [] as IRepo[],
      // True from the start: the repos are fetched on mount, and a first render
      // with loading=false would flash an empty list before the skeletons.
      loading: true,
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