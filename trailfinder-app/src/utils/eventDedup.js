// Duplicate-event helpers — mirror the DB index unique_event_idx
// (lower(btrim(name)), start_date, organizer_id, category) NULLS NOT DISTINCT

const normName = (name) => (name ?? '').trim().toLowerCase();

export function eventKey(e) {
    return [normName(e.name), e.start_date ?? '', e.organizer_id ?? '', e.category ?? ''].join('|');
}

// Keeps the first occurrence of each key — safety net for the public list
export function dedupeEvents(events) {
    const seen = new Set();
    return events.filter(e => {
        const key = eventKey(e);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// "Similar" = same name + start date, ignoring organizer/category (the DB allows these).
// Returns only groups with 2+ events.
export function findSimilarEventGroups(events) {
    const groups = new Map();
    for (const e of events) {
        if (!e.start_date) continue;
        const key = `${normName(e.name)}|${e.start_date}`;
        groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    return [...groups.values()].filter(g => g.length > 1);
}
