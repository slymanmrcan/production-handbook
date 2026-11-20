import { readFile } from 'node:fs/promises';
import { defineCollection } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

const markdownFiles = glob({
  base: './docs',
  pattern: '**/[^_]*.{md,mdx}',
  generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
});

const handbookLoader: Loader = {
  ...markdownFiles,
  name: 'handbook-docs',
  load(context) {
    return markdownFiles.load({
      ...context,
      async parseData(entry) {
        const data = entry.data as Record<string, unknown>;
        if (typeof data.title === 'string' || !entry.filePath) {
          return context.parseData(entry);
        }

        const source = await readFile(entry.filePath, 'utf8');
        const title = source.match(/^# (.+)$/m)?.[1]
          ?.replace(/\s+\{\s*#[\w-]+\s*\}$/, '')
          .replace(/[`*]/g, '')
          .trim();

        return context.parseData({ ...entry, data: { ...data, title } });
      },
    });
  },
};

export const collections = {
  docs: defineCollection({ loader: handbookLoader, schema: docsSchema() }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
