<template>
  <div class="blog">
    <div class="banner">
      <div>
        <h1>Welcome to my Blog</h1>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <template v-else>
      <div class="recent" :aria-busy="loading">
        <div class="recent-header">
          <span>RECENT POSTS</span>

          <div class="search-box">
            <AppButton v-if="auth.isAdmin" class="tags-button" to="/tags">Tags</AppButton>

            <AppButton v-if="auth.isAdmin" class="add-button" to="/blog/new" :icon="plusIcon">Add</AppButton>
          </div>
        </div>

        <!-- Skeletons mirror the real layout (1 featured + 2 beside it) so nothing jumps on load -->
        <div v-if="loading" class="posts">
          <BlogPostSkeleton type="most-recent" />

          <div class="second-and-third">
            <BlogPostSkeleton v-for="n of 2" :key="n" type="other-recent" />
          </div>

          <span class="sr-only">Loading posts…</span>
        </div>

        <div v-else-if="posts.length === 0" class="empty">
          No posts yet.
        </div>

        <div v-else class="posts">
          <BlogPost v-if="featured" :post="featured" type="most-recent" />

          <div v-if="secondary.length" class="second-and-third">
            <BlogPost v-for="post of secondary" :key="post.id" :post="post" type="other-recent" />
          </div>
        </div>
      </div>

      <hr class="divider">

      <div class="all" :aria-busy="loading">
        <div class="all-header">
          <span>ALL POSTS</span>

          <div class="search-input">
            <img src="@/assets/search-gray.svg" alt="">
            <input v-model="query" type="text" placeholder="Search for posts" :disabled="loading" />
          </div>
        </div>

        <div class="posts">
          <template v-if="loading">
            <BlogPostSkeleton v-for="n of 3" :key="n" />
          </template>

          <template v-else>
            <BlogPost v-for="post of filtered" :key="post.id" :post="post" />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppButton from '@/components/AppButton.vue'
import BlogPost from '@/components/BlogPost.vue'
import BlogPostSkeleton from '@/components/BlogPostSkeleton.vue'
import { listPosts } from '@/services/posts'
import { useAuthStore } from '@/stores/auth'
import type { IPost } from '@/interfaces/post'
import plusIcon from '@/assets/icons/plus.svg'

const auth = useAuthStore()

const posts = ref<IPost[]>([])
const loading = ref(true)
const error = ref('')
const query = ref('')

// The service returns whatever RLS allowed through: published posts for
// everyone, plus drafts when an admin is signed in. Splitting below is for
// layout only -- it is never what keeps drafts private.
const featured = computed(() => posts.value[0] ?? null)
const secondary = computed(() => posts.value.slice(1, 3))
const rest = computed(() => posts.value.slice(3))

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()

  if (!q) return rest.value

  return rest.value.filter((post) =>
    `${post.title} ${post.description ?? ''}`.toLowerCase().includes(q),
  )
})

onMounted(async () => {
  try {
    posts.value = await listPosts()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Could not load posts.'
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss">
.blog {
  @apply
    flex
    items-center
    flex-col
    gap-16
    py-16
    px-4
    h-full
    bg-background
    text-2xl;

  .banner {
    @apply
      w-full
      max-w-content
      py-16
      flex
      justify-center
      items-center
      bg-[url('../assets/banner.jpg')]
      bg-center
      bg-cover;
    
    div {
      @apply
        bg-[#F4F4F5]
        bg-opacity-85
        text-center
        px-16
        py-8;
      
      h1 {
        @apply
          text-4xl
          font-bold
          text-primary-default;
      }
    }
  }

  .loading, .empty, .error {
    @apply
      w-full
      max-w-content
      text-base
      text-gray_text
      text-center
      py-8;
  }

  .error {
    @apply text-red-600;
  }

  .recent {
    @apply
      w-full
      max-w-content
      flex
      justify-center
      items-center
      gap-16
      flex-col;

    .recent-header {
      @apply
        w-full
        flex
        justify-between
        items-center;

      >span {
        @apply
          text-2xl
          font-bold
          text-primary-default;
      }

      .search-box {
        @apply
          flex
          justify-end
          items-center
          gap-6
          w-[60%];
      }
    }

    .posts {
      @apply
        w-full
        h-full
        flex
        gap-8
        items-start;

      .second-and-third {
        @apply
          w-full
          flex
          flex-col
          self-stretch
          justify-between
          items-center
          gap-8;
      }
    }
  }

  .divider {
    @apply
      w-full
      max-w-content
      border-solid
      border-light_border;
  }

  .all {
    @apply
      w-full
      max-w-content
      flex
      justify-center
      items-center
      gap-16
      flex-col;

    .all-header {
      @apply
        w-full
        flex
        justify-start
        items-center
        gap-4;

      .search-input {
        @apply
          w-full
          flex
          justify-start
          items-center
          gap-2
          px-3
          py-2
          text-sm
          bg-white
          text-gray_text
          rounded-full;

        >input {
          @apply
            w-full
            bg-transparent
            border-none
            outline-none;
        }
      }

      >span {
        @apply
          w-full
          text-2xl
          font-bold
          text-primary-default;
      }
    }

    .posts {
      @apply
        w-full
        h-full
        flex
        flex-wrap
        gap-8
        items-start;

      .post {
        @apply
          w-[calc((100%-4rem)/3)];
      }
    }
  }
}

@media screen and (max-width: 780px) {
  .blog {
    @apply h-[calc(100vh-60px-40px)];

    .all .posts .post {
      @apply w-full;
    }
  }
}
</style>