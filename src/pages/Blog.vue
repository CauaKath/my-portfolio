<template>
  <div class="blog">
    <div class="banner">
      <div>
        <h1>Welcome to my Blog</h1>
      </div>
    </div>

    <div class="recent">
      <div class="recent-header">
        <span>RECENT POSTS</span>

        <div class="search-box">
          <div class="add-button">
            <img src="@/assets/add.svg" alt="Add icon">
            <span>Add</span>
          </div>
        </div>
      </div>

      <div class="posts">
        <BlogPost type="most-recent" />
        
        <div class="second-and-third">
          <BlogPost type="other-recent" />
          <BlogPost type="other-recent" />
        </div>
      </div>
    </div>

    <hr class="divider">

    <div class="all">
      <div class="all-header">
        <span>ALL POSTS</span>

        <div class="search-input">
          <img src="@/assets/search-gray.svg" alt="Search icon">
          <input
            type="text"
            placeholder="Search for posts"
          />
        </div>
      </div>

      <div class="posts">
        <BlogPost />
        <BlogPost />
        <BlogPost />
        <BlogPost />
        <BlogPost />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import BlogPost from '@/components/BlogPost.vue';

export default {
  name: 'Blog',
  components: {
    BlogPost,
  },
}
</script>

<style lang="scss">
.blog {
  @apply
    flex
    items-center
    flex-col
    gap-16
    py-16
    h-full
    bg-background
    text-2xl;

  .banner {
    @apply
      w-[80%]
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

  .recent {
    @apply
      w-[80%]
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

        .add-button {
          @apply
            w-24
            flex
            justify-start
            items-center
            gap-3
            px-3
            py-2
            text-sm
            bg-primary-default
            text-white
            rounded-full
            cursor-pointer;
        }
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
      w-[80%]
      border-solid
      border-light_border;
  }

  .all {
    @apply
      w-[80%]
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
          w-[calc(100%/4-24px)];
      }
    }
  }
}

@media screen and (max-width: 780px) {
  .blog {
    @apply h-[calc(100vh-60px-40px)];
  }
}
</style>