const STORAGE_PREFIX = 'snail-books-discover-usage:';
const USAGE_WINDOW = 30 * 24 * 60 * 60 * 1000;

type DiscoverUsage = Record<string, number[]>;

export function discoverUsageKey(apiBase: string, userId: string | null) {
  return userId ? STORAGE_PREFIX + JSON.stringify([apiBase, userId]) : null;
}

export function isDiscoverUsageKey(key: string) {
  return key.startsWith(STORAGE_PREFIX);
}

export function readDiscoverUsage(key: string | null, now = Date.now()): DiscoverUsage {
  if (!key) return {};
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const entries: [string, number[]][] = [];
    for (const [page, times] of Object.entries(stored)) {
      if (!Array.isArray(times)) continue;
      const recent = times.filter((time): time is number =>
        Number.isFinite(time) && time > now - USAGE_WINDOW && time <= now);
      if (recent.length) entries.push([page, recent]);
    }
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export function recordDiscoverOpen(key: string, page: string, now = Date.now()) {
  try {
    const usage = readDiscoverUsage(key, now);
    localStorage.setItem(key, JSON.stringify({ ...usage, [page]: [...(usage[page] ?? []), now] }));
  } catch {
    // A storage error should not interrupt navigation.
  }
}

export function rankDiscoverShortcuts<Page extends string>(
  usage: DiscoverUsage,
  pages: readonly Page[],
  defaults: readonly Page[],
): Page[] {
  const opened = pages.flatMap(page => {
    const times = usage[page];
    return times?.length ? [{ page, count: times.length, latest: times.reduce((a, b) => Math.max(a, b)) }] : [];
  });
  opened.sort((a, b) => b.count - a.count || b.latest - a.latest);
  return [...new Set([...opened.map(({ page }) => page), ...defaults])].slice(0, defaults.length);
}
