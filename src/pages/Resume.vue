<template>
  <div class="resume">
    <div class="resume-actions">
      <AppButton variant="filled" @click="print">{{ t('resume.download') }}</AppButton>
    </div>

    <!-- On screen: a terminal. The .sheet below is what gets printed to PDF. -->
    <div class="terminal" role="region" :aria-label="resume.name">
      <div class="terminal-bar" aria-hidden="true">
        <span class="dot red"></span>
        <span class="dot yellow"></span>
        <span class="dot green"></span>
        <span class="terminal-title">~/cauakath/resume — zsh</span>
      </div>

      <div class="terminal-body">
        <section>
          <h2 class="cmd"><span class="prompt">$</span> whoami</h2>
          <p class="out name">{{ resume.name }}</p>
          <p class="out accent">{{ resume.headline }}</p>
          <p class="out muted">{{ resume.location }}</p>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> cat about.md</h2>
          <p class="out">{{ resume.summary }}</p>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> git log --oneline experience</h2>

          <div v-for="(job, index) of resume.experience" :key="`${job.company}-${job.period}`" class="commit">
            <p class="commit-line">
              <span class="hash">{{ hash(`${job.company}${job.role}${job.period}`) }}</span>
              <span v-if="index === 0" class="refs">(<b>HEAD -> main</b>)</span>
              <span class="role">{{ job.role }}</span>
              <span class="muted">@</span>
              <span class="company">{{ job.company }}</span>
            </p>
            <p class="commit-meta">{{ job.period }} · {{ job.location }}</p>

            <ul v-if="job.highlights.length" class="commit-body">
              <li v-for="item of job.highlights" :key="item">{{ item }}</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> ls education/</h2>

          <div v-for="item of resume.education" :key="item.course" class="listing">
            <span class="dir">{{ item.institution }}/</span>
            <span class="out">{{ item.course }}</span>
            <span class="muted">{{ item.period }}</span>
          </div>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> cat skills.json</h2>
          <pre class="json"><span class="brace">{</span>
  <span class="key">"stack"</span>: <span class="brace">[</span>
<template v-for="(skill, index) of resume.skills" :key="skill">    <span class="str">"{{ skill }}"</span><span v-if="index < resume.skills.length - 1">,</span>
</template>  <span class="brace">]</span>
<span class="brace">}</span></pre>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> cat languages.json</h2>
          <pre class="json"><span class="brace">{</span>
<template v-for="(language, index) of resume.languages" :key="language.name">  <span class="key">"{{ language.name }}"</span>: <span class="str">"{{ language.level }}"</span><span v-if="index < resume.languages.length - 1">,</span>
</template><span class="brace">}</span></pre>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> ls certifications/</h2>
          <p v-for="cert of resume.certifications" :key="cert" class="listing">
            <span class="out">{{ cert }}</span>
          </p>
        </section>

        <section>
          <h2 class="cmd"><span class="prompt">$</span> cat contacts</h2>
          <p v-for="contact of resume.contacts" :key="contact.label" class="listing">
            <span class="key">{{ contact.label.toLowerCase() }}</span>
            <a :href="contact.href" target="_blank" rel="noopener">{{ contact.text }}</a>
          </p>
        </section>

        <p class="cmd last"><span class="prompt">$</span> <span class="cursor"></span></p>
      </div>
    </div>

    <article class="sheet">
      <header class="sheet-header">
        <h1>{{ resume.name }}</h1>
        <p class="headline">{{ resume.headline }}</p>
        <p class="location">{{ resume.location }}</p>

        <ul class="contacts">
          <li v-for="contact of resume.contacts" :key="contact.label">
            <a :href="contact.href" target="_blank" rel="noopener">{{ contact.text }}</a>
          </li>
        </ul>
      </header>

      <div class="sheet-body">
        <main class="main-column">
          <section>
            <h2>{{ t('resume.summary') }}</h2>
            <p>{{ resume.summary }}</p>
          </section>

          <section>
            <h2>{{ t('resume.experience') }}</h2>

            <div v-for="job of resume.experience" :key="`${job.company}-${job.period}`" class="entry">
              <div class="entry-head">
                <h3>{{ job.role }}</h3>
                <span class="period">{{ job.period }}</span>
              </div>
              <p class="entry-sub">{{ job.company }} · {{ job.location }}</p>

              <ul v-if="job.highlights.length" class="highlights">
                <li v-for="item of job.highlights" :key="item">{{ item }}</li>
              </ul>
            </div>
          </section>

          <section>
            <h2>{{ t('resume.education') }}</h2>

            <div v-for="item of resume.education" :key="item.course" class="entry">
              <div class="entry-head">
                <h3>{{ item.course }}</h3>
                <span class="period">{{ item.period }}</span>
              </div>
              <p class="entry-sub">{{ item.institution }}</p>
            </div>
          </section>
        </main>

        <aside class="side-column">
          <section>
            <h2>{{ t('resume.skills') }}</h2>
            <ul class="chips">
              <li v-for="skill of resume.skills" :key="skill">{{ skill }}</li>
            </ul>
          </section>

          <section>
            <h2>{{ t('resume.languages') }}</h2>
            <ul class="plain">
              <li v-for="language of resume.languages" :key="language.name">
                <strong>{{ language.name }}</strong>
                <span>{{ language.level }}</span>
              </li>
            </ul>
          </section>

          <section>
            <h2>{{ t('resume.certifications') }}</h2>
            <ul class="plain">
              <li v-for="cert of resume.certifications" :key="cert">{{ cert }}</li>
            </ul>
          </section>
        </aside>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resumes } from '@/data/resume'
import type { Locale } from '@/i18n'

const { t, locale } = useI18n()

const resume = computed(() => resumes[locale.value as Locale])

// A short, stable fake commit hash so each job reads like a `git log` line.
function hash(seed: string): string {
  let h = 5381

  for (const char of seed) h = ((h << 5) + h + char.charCodeAt(0)) >>> 0

  return h.toString(16).padStart(8, '0').slice(0, 7)
}

// The browser's print dialog has "Save as PDF"; the @media print rules below
// turn the page into a clean sheet, so no PDF library is needed.
function print() {
  window.print()
}
</script>

<style lang="scss">
.resume {
  @apply
    flex
    items-center
    flex-col
    gap-6
    py-16
    px-4
    bg-background;

  .resume-actions {
    @apply w-full max-w-content flex justify-end;
  }


  // ---- Screen view: terminal -------------------------------------------
  .terminal {
    @apply
      w-full
      max-w-content
      rounded-lg
      overflow-hidden
      shadow-xl
      font-mono
      text-sm
      leading-relaxed;
    background: #0b1220;
    color: #cbd5e1;
    border: 1px solid #1e293b;

    .terminal-bar {
      @apply flex items-center gap-2 px-4 py-3;
      background: #111a2e;
      border-bottom: 1px solid #1e293b;

      .dot {
        @apply w-3 h-3 rounded-full;
        &.red { background: #ef4444; }
        &.yellow { background: #eab308; }
        &.green { background: #22c55e; }
      }

      .terminal-title {
        @apply ml-3 text-xs;
        color: #64748b;
      }
    }

    .terminal-body {
      @apply flex flex-col gap-6 p-6;
    }

    .cmd {
      @apply mb-2 font-normal text-sm normal-case tracking-normal border-0 pb-0;
      color: #e2e8f0;

      .prompt { color: #22c55e; margin-right: .5rem; }
    }

    .out { color: #cbd5e1; }
    .name { @apply text-xl font-bold; color: #f8fafc; }
    .accent { color: #38bdf8; }
    .muted { color: #64748b; }

    .commit {
      @apply mb-4 last:mb-0;

      .commit-line { @apply flex flex-wrap gap-x-2; }
      .hash { color: #eab308; }
      .refs { color: #eab308; b { color: #22c55e; font-weight: 400; } }
      .role { color: #f8fafc; font-weight: 700; }
      .company { color: #38bdf8; }
      .commit-meta { @apply pl-4; color: #64748b; }
      .commit-body { @apply pl-4 mt-1 flex flex-col gap-1; li::before { content: '+ '; color: #22c55e; } }
    }

    .listing {
      @apply flex flex-wrap gap-x-4;
      .dir, .key { color: #38bdf8; }
    }

    .json {
      @apply overflow-x-auto;
      font: inherit;
      .brace { color: #94a3b8; }
      .key { color: #38bdf8; }
      .str { color: #fbbf24; }
    }

    a { color: #fbbf24; text-decoration: underline; text-underline-offset: 3px; }

    .cursor {
      @apply inline-block align-middle;
      width: .6rem;
      height: 1rem;
      background: #22c55e;
      animation: blink 1.1s steps(1) infinite;
    }
  }

  // The printable sheet is not part of the screen design.
  @media screen {
    .sheet { display: none; }
  }

  .sheet {
    @apply
      w-full
      max-w-content
      bg-white
      text-primary-default
      rounded-lg
      shadow-md
      overflow-hidden
      text-base;
  }

  .sheet-header {
    @apply bg-primary-default text-text px-8 py-8;

    h1 {
      @apply text-3xl font-bold;
    }

    .headline {
      @apply mt-1 text-lg opacity-90;
    }

    .location {
      @apply mt-1 text-sm opacity-70;
    }

    .contacts {
      @apply mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm;

      a {
        @apply underline underline-offset-2 opacity-90;
      }
    }
  }

  .sheet-body {
    @apply grid gap-8 px-8 py-8;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }

  .main-column, .side-column {
    @apply flex flex-col gap-8;
  }

  h2 {
    @apply
      mb-3
      pb-1
      text-sm
      font-bold
      uppercase
      tracking-wider
      text-action
      border-b
      border-solid
      border-light_border;
  }

  .entry {
    @apply mb-5 last:mb-0;

    .entry-head {
      @apply flex justify-between items-baseline gap-4;

      h3 {
        @apply font-bold;
      }

      .period {
        @apply shrink-0 text-sm text-gray_text;
      }
    }

    .entry-sub {
      @apply text-sm text-gray_text;
    }

    .highlights {
      @apply mt-2 list-disc pl-5 text-sm flex flex-col gap-1;
    }
  }

  .chips {
    @apply flex flex-wrap gap-2;

    li {
      @apply px-2 py-1 text-sm rounded-md bg-background text-action;
    }
  }

  .plain {
    @apply flex flex-col gap-2 text-sm;

    strong {
      @apply block;
    }

    span {
      @apply text-gray_text;
    }
  }
}

@media screen and (max-width: 780px) {
  .resume .sheet-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .resume .sheet-header, .resume .sheet-body {
    @apply px-5;
  }
}

@media print {
  @page {
    size: A4;
    margin: 12mm;
  }

  // Everything except the sheet disappears; the sheet loses its card styling.
  .header, .footer, .resume-actions, .terminal {
    display: none !important;
  }

  .resume {
    @apply p-0 bg-white;

    .sheet {
      @apply max-w-none shadow-none rounded-none;
    }

    .sheet-header {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .entry {
      break-inside: avoid;
    }
  }
}

@keyframes blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .resume .terminal .cursor { animation: none; }
}
</style>
