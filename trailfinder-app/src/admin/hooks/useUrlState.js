// ─── TrailHub Admin – URL-driven list state ───────────────────────────────────
// Filters/pagination live in the query string, so a reload, the back button or a
// returnTo from the event form restores the exact view.
import { useMemo, useCallback } from 'react';

export function parseUrlState(search, defaults) {
  const qs = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(defaults).map(([key, def]) => {
    const raw = qs.get(key);
    if (raw === null) return [key, def];
    if (typeof def === 'number') {
      const n = Number(raw);
      return [key, Number.isFinite(n) && n > 0 ? n : def];
    }
    return [key, raw];
  }));
}

// Defaults are omitted from the URL to keep it short; unknown params are kept.
export function buildUrlSearch(search, defaults, next) {
  const qs = new URLSearchParams(search);
  for (const [key, def] of Object.entries(defaults)) {
    const val = next[key];
    if (val === undefined || val === null || val === '' || val === def) qs.delete(key);
    else qs.set(key, String(val));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

// `defaults` must be a module-level constant (stable reference).
// Returns [state, update]; update(patch) merges and replaces the current history entry.
export function useUrlState(defaults, onNavigate) {
  const search = window.location.search;
  const state = useMemo(() => parseUrlState(search, defaults), [search, defaults]);
  const update = useCallback((patch) => {
    const current = parseUrlState(window.location.search, defaults);
    const next = { ...current, ...patch };
    onNavigate(window.location.pathname + buildUrlSearch(window.location.search, defaults, next), { replace: true });
  }, [defaults, onNavigate]);
  return [state, update];
}
