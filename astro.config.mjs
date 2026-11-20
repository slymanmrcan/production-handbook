import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { handbookMarkdown } from './src/handbook-markdown.mjs';
import { sections } from './src/navigation.mjs';

const base = '/production-handbook';

export default defineConfig({
  site: 'https://slymanmrcan.github.io',
  base,
  trailingSlash: 'always',
  prerenderConflictBehavior: 'error',
  markdown: {
    processor: unified({ remarkPlugins: [[handbookMarkdown, { base }]] }),
  },
  integrations: [
    starlight({
      title: 'Sunucu Rehberi',
      favicon: '/assets/favicon.svg',
      logo: { src: './public/assets/logo.svg', alt: '' },
      locales: { root: { lang: 'tr', label: 'Türkçe' } },
      markdown: { processedDirs: ['./docs'] },
      sidebar: sections.map(({ label, items }) => ({ label, items })),
      routeMiddleware: './src/route-data.ts',
      customCss: ['./src/handbook.css'],
      components: {
        Header: './src/components/Header.astro',
        MarkdownContent: './src/components/MarkdownContent.astro',
        Sidebar: './src/components/Sidebar.astro',
      },
    }),
  ],
});
