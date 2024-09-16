<template>
  <div class="post" :class="type">
    <div class="post-image" :class="type"></div>

    <div class="post-content" :class="type">
      <div class="post-main">
        <div class="post-texts">
          <span class="post-date">Aug 13 • 5 min read</span>
          <span class="post-title">Pilha X Fila</span>
          <span class="post-description">Qual a diferença? Onde utilizar cada uma? Exemplos práticos</span>
        </div>

        <img src="@/assets/add.svg" alt="Source icon">
      </div>

      <div class="post-tags" :class="type">
        <span>#tech</span>
        <span>#data-structure</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'BlogPost',
  props: {
    type: {
      type: String,
      default: 'default',
      validator: (value: string) => ['default', 'most-recent', 'other-recent'].includes(value),
    }
  }
}
</script>

<style lang="scss">
.post {
  @apply
    flex
    bg-red-300
    rounded-md
    h-full
    w-full;

    &.most-recent {
      @apply
        flex-col;
    }

    &.default {
      @apply
        flex-col;
    }

  .post-image {
    @apply
      w-full
      bg-[url('../assets/banner.jpg')]
      bg-center
      bg-cover;

    &.most-recent {
      @apply
        h-[300px]
        rounded-t-md;
    }

    &.default {
      @apply
        h-[140px]
        rounded-md;
    }

    &.other-recent {
      @apply
        rounded-l-md;
    }
  }

  .post-content {
    @apply
      w-full
      h-full
      flex
      flex-col
      bg-white
      p-4;

      &.most-recent, &.default {
        @apply
          rounded-b-md;
      }

      &.other-recent {
        @apply
          rounded-r-md;
      }

    .post-main {
      @apply
        w-full
        h-full
        flex
        items-start;

      .post-texts {
        @apply
          w-full
          h-full
          text-sm
          flex
          flex-col
          gap-2;

        .post-date {
          @apply
            bg-gradient-to-r from-register-from to-register-to
            inline-block
            text-transparent
            bg-clip-text;
        }

        .post-title {
          @apply
            text-xl
            text-primary-default
            font-bold;
        }

        .post-description {
          @apply
            h-[80px]
            text-gray_text;
        }
      }

      img {
        @apply
          w-6
          h-6;
      }
    }

    .post-tags {
      @apply
        text-sm
        text-primary-default
        flex
        gap-2;

      >span {
        @apply
          border-2
          border-primary-default
          px-2
          py-1
          rounded-md;
      }
    }
  }
}
</style>