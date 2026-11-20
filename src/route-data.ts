import { defineRouteMiddleware, type StarlightRouteData } from '@astrojs/starlight/route-data';

type SidebarEntry = StarlightRouteData['sidebar'][number];

function containsCurrentPage(entry: SidebarEntry): boolean {
  return entry.type === 'link' ? entry.isCurrent : entry.entries.some(containsCurrentPage);
}

export const onRequest = defineRouteMiddleware(({ locals }) => {
  const route = locals.starlightRoute;
  const section = route.sidebar.find(containsCurrentPage);

  if (section?.type === 'group') {
    route.sidebar = section.entries;
    route.handbookSection = section.label;
  }

  if (route.entry.id === 'android' || route.entry.id.startsWith('android/')) {
    route.lang = 'en';
    route.entryMeta = { ...route.entryMeta, lang: 'en' };
  }
});
