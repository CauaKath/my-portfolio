<template>
  <div class="card">
    <div class="card-texts">
      <h2>{{ title }}</h2>
      <h5>{{ description ?? 'No description provided.' }}</h5>
    </div>

    <div class="card-content">
      <div class="card-numbers">
        <span class="card-stars">
          <img src="@/assets/git-star.svg" alt="Github star icon">
          <span>{{ stars }}</span>
        </span>
        <span class="card-forks">
          <img src="@/assets/git-fork.svg" alt="Github fork icon">
          <span>{{ forks }}</span>
        </span>
      </div>

      <img class="lang-icon" :src="getLanguageIcon(language)" alt="Language icon">
    </div>
  </div>
</template>

<script lang="ts">
import javaIcon from '@/assets/java.svg';
import javascriptIcon from '@/assets/javascript.svg';
import pythonIcon from '@/assets/python.svg';
import typescriptIcon from '@/assets/typescript.svg';
import htmlIcon from '@/assets/html.svg';
import goIcon from '@/assets/go.svg';
import vueIcon from '@/assets/vue.svg';
import codeIcon from '@/assets/code.svg';

export default {
  name: 'Card',
  props: {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    language: {
      type: String,
      required: true,
    },
    forks: {
      type: Number,
      required: true,
    },
    stars: {
      type: Number,
      required: true,
    },
  },
  methods: {
    getLanguageIcon(language: string) {
      const languageOptions = [
        'java', 'javascript', 'python', 'typescript', 'html', 'go', 'vue'
      ];

      const selectedLanguage = languageOptions.includes(language.toLowerCase())
        ? language.toLowerCase()
        : 'code';

      return {
        java: javaIcon,
        javascript: javascriptIcon,
        python: pythonIcon,
        typescript: typescriptIcon,
        html: htmlIcon,
        go: goIcon,
        vue: vueIcon,
        code: codeIcon,
      }[selectedLanguage];
    }
  },
}
</script>

<style lang="scss">
.card {
  @apply bg-white h-[100px] w-96 rounded-lg shadow-lg px-4 py-2 flex justify-between items-center;

  .card-texts {
    @apply flex flex-col gap-1 max-w-[60%] h-full;

    h2 {
      @apply text-base font-bold text-primary-default;
    }

    h5 {
      @apply text-xs text-gray_text overflow-hidden max-h-full;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
  }

  .card-content {
    @apply flex flex-col gap-4 items-end justify-between h-full;

    .card-numbers {
      @apply flex gap-4 items-center;

      .card-stars, .card-forks {
        @apply flex gap-2 items-center text-xs text-gray_text border-[1px] border-light_border rounded-[5px] px-2 py-1;

        img {
          @apply w-4 h-4;
        }
      }
    }

    .lang-icon {
      @apply w-6 h-6;
    }
  }
}
</style>
