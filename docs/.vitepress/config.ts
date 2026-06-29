import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'v-surfer',
  description: 'A DOM-free slider engine with a Vue-native component API',
  base: '/v-surfer/',

  // The docs/ folder also holds internal planning material (specs, plans, benchmarks)
  // that must never become public pages.
  srcExclude: ['superpowers/**', 'benchmarks/**', 'params-architecture.md', '**/README.md'],

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: 'https://github.com/Xenossolitarius/v-surfer' },
          { text: 'npm', link: 'https://www.npmjs.com/package/v-surfer' },
          {
            text: 'Changelog',
            link: 'https://github.com/Xenossolitarius/v-surfer/blob/main/CHANGELOG.md',
          },
        ],
      },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Quick Start', link: '/getting-started/quick-start' },
          ],
        },
        {
          text: 'Guide',
          items: [
            { text: 'Components', link: '/guide/components' },
            { text: 'Modules', link: '/guide/modules' },
            { text: 'Effects', link: '/guide/effects' },
            { text: 'Composables', link: '/guide/composables' },
            { text: 'Events', link: '/guide/events' },
            { text: 'Styling', link: '/guide/styling' },
            { text: 'Server-Side Rendering', link: '/guide/ssr' },
            { text: 'Nuxt', link: '/guide/nuxt' },
          ],
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Parameters', link: '/api/parameters' },
            { text: 'Components', link: '/api/components' },
            { text: 'Host', link: '/api/host' },
            { text: 'Composables', link: '/api/composables' },
            { text: 'Events', link: '/api/events' },
            {
              text: 'Modules',
              items: [
                { text: 'Overview', link: '/api/modules/' },
                { text: 'Navigation', link: '/api/modules/navigation' },
                { text: 'Pagination', link: '/api/modules/pagination' },
                { text: 'Scrollbar', link: '/api/modules/scrollbar' },
                { text: 'Keyboard', link: '/api/modules/keyboard' },
                { text: 'Mousewheel', link: '/api/modules/mousewheel' },
                { text: 'Controller', link: '/api/modules/controller' },
                { text: 'Autoplay', link: '/api/modules/autoplay' },
                { text: 'A11y', link: '/api/modules/a11y' },
              ],
            },
            { text: 'Effects', link: '/api/effects' },
          ],
        },
        {
          text: 'Examples',
          items: [{ text: 'Overview', link: '/examples/' }],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/Xenossolitarius/v-surfer' }],

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/Xenossolitarius/v-surfer/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
    },
  },
});
