// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/supabase', '@nuxt/content'],
  css: ['~/app.css'],
  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    public: {
      googleWorkspaceDomain: process.env.GOOGLE_WORKSPACE_DOMAIN,
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    classSuffix: '',
    storageKey: 'nuxt-color-mode',
  },
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
        },
      ],
    },
  },
  vite: {
    optimizeDeps: {
      include: [
        'date-fns',
        'date-fns/locale',
        'zod',
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
  components: {
    dirs: [
      {
        path: '~/components/content',
        global: true,
      },
      {
        path: '~/components',
        pathPrefix: false,
      },
    ],
  },
});
