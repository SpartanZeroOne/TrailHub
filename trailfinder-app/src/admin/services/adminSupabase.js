// ─── TrailHub Admin – Supabase Service Layer ──────────────────────────────────
import { supabase } from '../../services/supabaseClient';

// ─── COMPUTED STATUS ──────────────────────────────────────────────────────────
// Statuses that are not date-driven and must never be auto-overridden.
const DATE_IMMUNE_STATUSES = new Set(['permanent', 'cancelled', 'sold_out']);

// Overrides status → 'past' for any event whose effective end date has passed.
// When writeBack=true, stale records are batch-updated in the DB (fire-and-forget).
function applyComputedStatus(events, { writeBack = false } = {}) {
  const today = new Date().toISOString().split('T')[0];
  const staleIds = [];

  const result = events.map(event => {
    if (event.status === 'past' || DATE_IMMUNE_STATUSES.has(event.status) || event.is_flexible_date) {
      return event;
    }
    const effectiveDate = event.end_date ?? event.start_date;
    if (effectiveDate && effectiveDate < today) {
      if (writeBack && event.status !== 'past') staleIds.push(event.id);
      return { ...event, status: 'past' };
    }
    return event;
  });

  if (writeBack && staleIds.length > 0) {
    supabase.from('events').update({ status: 'past' }).in('id', staleIds)
      .then(() => {}).catch(() => {});
  }

  return result;
}

// Proactively finds and writes back all events whose end_date has passed
// but whose DB status is not yet 'past'. Call on page mount (fire-and-forget).
// Returns the number of records updated.
export const adminSyncExpiredEvents = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase.from('events')
    .select('id')
    .not('status', 'in', '(past,permanent,cancelled,sold_out)')
    .not('is_flexible_date', 'is', true)
    .or(`end_date.lt.${today},and(end_date.is.null,start_date.lt.${today})`);
  if (!data || data.length === 0) return 0;
  const ids = data.map(e => e.id);
  await supabase.from('events').update({ status: 'past' }).in('id', ids);
  return ids.length;
};

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export const adminFetchEvents = async ({
  page = 1, perPage = 25, category, status, organizerId, search, month, startFrom, startTo, sortBy = 'start_date', sortDir = 'asc',
} = {}) => {
  const today = new Date().toISOString().split('T')[0];
  let q = supabase.from('events').select('*, organizers(id, name)', { count: 'exact' });

  if (category)    q = q.eq('category', category);
  if (status)      q = q.eq('status', status);
  if (organizerId) q = q.eq('organizer_id', organizerId);
  if (search)      q = q.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
  if (month) {
    // month = "YYYY-MM" → filter start_date within that calendar month
    const [y, m] = month.split('-').map(Number);
    const from = `${month}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    q = q.gte('start_date', from).lt('start_date', nextMonth);
  }
  if (startFrom) q = q.gte('start_date', startFrom);
  if (startTo)   q = q.lte('start_date', startTo);

  // When no explicit status filter: exclude past events and date-expired events at DB level.
  // Show an event only when one of these conditions holds:
  //   1. Status is non-date-driven (permanent / cancelled / sold_out)
  //   2. It is a flexible/on-demand event (no fixed date)
  //   3. Its end_date is today or later (active multi-day event)
  //   4. It is a single-day event (end_date IS NULL) with start_date today or later
  //   5. Both dates are NULL (edge case – don't hide)
  if (!status) {
    q = q.neq('status', 'past');
    q = q.or(
      `status.in.(permanent,cancelled,sold_out),` +
      `is_flexible_date.eq.true,` +
      `end_date.gte.${today},` +
      `and(end_date.is.null,start_date.gte.${today}),` +
      `and(end_date.is.null,start_date.is.null)`
    );
  }

  q = q.order(sortBy, { ascending: sortDir === 'asc' });
  q = q.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  // Apply computed status as a safety net and persist any stragglers to DB
  return { data: applyComputedStatus(data ?? [], { writeBack: true }), count: count ?? 0 };
};

export const adminFetchEventById = async (id) => {
  const { data, error } = await supabase
    .from('events').select('*, organizers(*)').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const adminCreateEvent = async (eventData) => {
  const payload = normalizeEventPayload(eventData);
  const { data, error } = await supabase.from('events').insert([payload]).select().single();
  if (error) throw error;
  return data;
};

export const adminUpdateEvent = async (id, eventData) => {
  const payload = normalizeEventPayload(eventData);
  const { data, error } = await supabase.from('events').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const adminDeleteEvent = async (id) => {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
};

export const adminBulkUpdateEvents = async (ids, updates) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .in('id', ids)
    .select('id, status');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('0 Events aktualisiert – prüfe Supabase RLS Policy für "events".');
  }
};

export const adminBulkDeleteEvents = async (ids) => {
  const { error } = await supabase.from('events').delete().in('id', ids);
  if (error) throw error;
};

// Known DB columns for the events table (from schema + migrations)
const EVENTS_DB_COLUMNS = new Set([
  'name', 'category', 'subcategory', 'mx_type',
  'start_date', 'end_date',
  'location', 'coordinates',
  'price', 'price_value', 'is_free',
  'image', 'status', 'difficulty',
  'beginner_friendly', 'organizer_id',
  'registered_friends',
  'rallye_region', 'trip_type', 'skill_level', 'bike_type', 'group_size',
  'level', 'is_new', 'has_changes', 'change_details',
  // Migration 07: AI summaries
  'ai_summary_de', 'ai_summary_en', 'ai_summary_fr', 'ai_summary_nl', 'ai_summary_updated_at',
  // Migration 08: Multi-date
  'event_dates',
  // Migration 10: Festival type
  'festival_type',
  // Event-URL (external registration / info link)
  'event_url',
  // Migration 19: Flexible / on-demand booking
  'is_flexible_date', 'booking_type', 'flexible_date_info',
]);

// Normalise form values → DB columns
function normalizeEventPayload(form) {
  const p = { ...form };
  // Parse coordinates from JSON string if needed
  if (typeof p.coordinates === 'string') {
    try { p.coordinates = JSON.parse(p.coordinates); } catch { p.coordinates = null; }
  }
  // Ensure numeric price; override to 0 when free
  if (p.is_free) {
    p.price_value = 0;
    p.price = null;
  } else if (p.price_value !== undefined && p.price_value !== '') {
    p.price_value = parseFloat(p.price_value) || null;
    p.price = p.price_value != null ? `€${p.price_value}` : null;
  }
  // Flexible events and MX-Tracks must have null dates
  if (p.is_flexible_date || p.mx_type === 'mx-track') {
    p.start_date = null;
    p.end_date = null;
  }
  // Only keep fields that exist in the DB schema (whitelist approach)
  const payload = {};
  for (const key of EVENTS_DB_COLUMNS) {
    if (key in p && p[key] !== undefined) {
      payload[key] = p[key] === '' ? null : p[key];
    }
  }
  return payload;
}

// ─── ORGANIZERS ───────────────────────────────────────────────────────────────

export const adminFetchOrganizers = async ({ page = 1, perPage = 50, search } = {}) => {
  let q = supabase.from('organizers').select('*', { count: 'exact' });
  if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  q = q.order('name').range((page - 1) * perPage, page * perPage - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
};

export const adminFetchOrganizerById = async (id) => {
  const { data, error } = await supabase.from('organizers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

// Known DB columns for the organizers table (schema + migrations 15, 17)
const ORGANIZER_DB_COLUMNS = new Set([
  'id', 'name', 'logo', 'logo_bg_color', 'verified',
  'since', 'events_hosted', 'rating', 'specialties',
  'website', 'description', 'email', 'phone', 'status',
]);

function normalizeOrganizerPayload(form) {
  const payload = {};
  for (const key of ORGANIZER_DB_COLUMNS) {
    if (key in form && form[key] !== undefined) {
      payload[key] = form[key] === '' ? null : form[key];
    }
  }
  return payload;
}

export const adminCreateOrganizer = async (org) => {
  const payload = normalizeOrganizerPayload(org);
  const { data, error } = await supabase.from('organizers').insert([payload]).select().single();
  if (error) throw error;
  return data;
};

export const adminUpdateOrganizer = async (id, updates) => {
  const payload = normalizeOrganizerPayload(updates);
  const { data, error } = await supabase.from('organizers').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const adminDeleteOrganizer = async (id) => {
  const { error } = await supabase.from('organizers').delete().eq('id', id);
  if (error) throw error;
};

export const adminCountEventsByOrganizer = async () => {
  const { data, error } = await supabase
    .from('events').select('organizer_id');
  if (error) return {};
  const counts = {};
  (data ?? []).forEach(e => { if (e.organizer_id) counts[e.organizer_id] = (counts[e.organizer_id] || 0) + 1; });
  return counts;
};

// ─── USERS ────────────────────────────────────────────────────────────────────

export const adminFetchUsers = async ({
  page = 1, perPage = 25, search, minRegistrations,
} = {}) => {
  let q = supabase.from('users').select('*', { count: 'exact' });
  if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  q = q.order('created_at', { ascending: false });
  q = q.range((page - 1) * perPage, page * perPage - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  let users = data ?? [];
  if (minRegistrations && minRegistrations > 0) {
    users = users.filter(u => (u.registered_event_ids ?? []).length >= minRegistrations);
  }

  // Batch-fetch start_dates for all registered events to compute per-user stats.
  // Flexible events (is_flexible_date=true, start_date=null) count as "upcoming"
  // to match the mobile app's "Bevorstehend" logic.
  const allEventIds = [...new Set(users.flatMap(u => u.registered_event_ids ?? []))];
  if (allEventIds.length > 0) {
    const { data: eventDates, error: edErr } = await supabase
      .from('events').select('id, start_date, is_flexible_date').in('id', allEventIds);
    if (edErr) console.error('[adminFetchUsers] event batch error:', edErr);
    const eventMap = {};
    (eventDates ?? []).forEach(e => {
      eventMap[e.id]         = e;
      eventMap[String(e.id)] = e;
    });
    const today = new Date().toISOString().split('T')[0];
    const currentYear = String(new Date().getFullYear());
    users = users.map(u => {
      // flex_confirmed_dates: { "event_id_str": { start: "YYYY-MM-DD", end: "YYYY-MM-DD" } }
      const flexDates = u.flex_confirmed_dates ?? {};
      let upcoming = 0, thisYear = 0;
      (u.registered_event_ids ?? []).forEach(id => {
        const ev = eventMap[id] ?? eventMap[String(id)];
        if (!ev) return;
        if (ev.is_flexible_date && !ev.start_date) {
          // Use user-confirmed start date if available, otherwise treat as open/upcoming
          const confirmedStart = flexDates[String(id)]?.start;
          if (confirmedStart) {
            if (confirmedStart >= today) upcoming++;
            if (confirmedStart.startsWith(currentYear)) thisYear++;
          } else {
            upcoming++;
          }
        } else if (ev.start_date) {
          if (ev.start_date > today) upcoming++;
          if (ev.start_date.startsWith(currentYear)) thisYear++;
        }
      });
      return { ...u, upcomingEventsCount: upcoming, currentYearEventsCount: thisYear };
    });
  } else {
    users = users.map(u => ({ ...u, upcomingEventsCount: 0, currentYearEventsCount: 0 }));
  }

  // Batch-fetch friend counts (requires migration 28 super_admin policy on friends table)
  const userIds = users.map(u => u.id);
  if (userIds.length > 0) {
    const uidsParam = userIds.join(',');
    const { data: friendRows, error: frErr } = await supabase
      .from('friends')
      .select('user_id, friend_id')
      .or(`user_id.in.(${uidsParam}),friend_id.in.(${uidsParam})`)
      .eq('status', 'accepted');
    if (frErr) console.error('[adminFetchUsers] friends batch error:', frErr);
    // Use Sets so bidirectional rows (A→B and B→A) don't double-count.
    const friendSets = {};
    (friendRows ?? []).forEach(r => {
      if (!friendSets[r.user_id]) friendSets[r.user_id] = new Set();
      if (!friendSets[r.friend_id]) friendSets[r.friend_id] = new Set();
      friendSets[r.user_id].add(r.friend_id);
      friendSets[r.friend_id].add(r.user_id);
    });
    users = users.map(u => ({ ...u, friends_count: friendSets[u.id]?.size ?? 0 }));
  }

  // Batch-fetch organizer names for users who have an organizer_id
  const orgIds = [...new Set(users.map(u => u.organizer_id).filter(Boolean))];
  if (orgIds.length > 0) {
    const { data: orgData, error: orgErr } = await supabase
      .from('organizers').select('id, name').in('id', orgIds);
    if (orgErr) console.error('[adminFetchUsers] organizers batch error:', orgErr);
    const orgMap = {};
    (orgData ?? []).forEach(o => { orgMap[o.id] = o.name; });
    users = users.map(u => ({
      ...u,
      organizer_name: u.organizer_id ? (orgMap[u.organizer_id] ?? u.organizer_id) : null,
    }));
  }

  return { data: users, count: count ?? 0 };
};

export const adminFetchUserById = async (id) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const adminUpdateUser = async (id, updates) => {
  const { data, error } = await supabase.from('users').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const adminFetchUserFriends = async (userId) => {
  const { data: friendRows, error: frErr } = await supabase
    .from('friends')
    .select('user_id, friend_id, created_at')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');
  if (frErr) throw frErr;
  const rows = friendRows ?? [];
  if (rows.length === 0) return [];
  const sinceMap = {};
  const friendIdSet = new Set();
  rows.forEach(r => {
    const fId = r.user_id === userId ? r.friend_id : r.user_id;
    friendIdSet.add(fId);
    if (!sinceMap[fId]) sinceMap[fId] = r.created_at;
  });
  const friendIds = [...friendIdSet];
  const { data: profiles, error: pErr } = await supabase
    .from('users')
    .select('id, name, email, avatar, registered_event_ids')
    .in('id', friendIds);
  if (pErr) throw pErr;
  return (profiles ?? []).map(p => ({ ...p, friends_since: sinceMap[p.id] }));
};

export const adminDeleteUser = async (id) => {
  const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id });
  if (error) throw error;
};

// ─── ANALYTICS / DASHBOARD ────────────────────────────────────────────────────

export const adminFetchDashboardStats = async () => {
  const [
    { count: totalEvents },
    { count: upcomingEvents },
    { data: recentEvents },
    { count: totalUsers },
    { count: totalOrganizers },
  ] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'upcoming'),
    supabase.from('events').select('id, name, category, status, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('organizers').select('id', { count: 'exact', head: true }),
  ]);

  return {
    totalEvents: totalEvents ?? 0,
    upcomingEvents: upcomingEvents ?? 0,
    totalUsers: totalUsers ?? 0,
    totalOrganizers: totalOrganizers ?? 0,
    recentEvents: recentEvents ?? [],
  };
};

export const adminFetchArchivedEvents = async ({
  page = 1, perPage = 25, category, search, sortBy = 'end_date', sortDir = 'desc',
} = {}) => {
  const today = new Date().toISOString().split('T')[0];
  // Include both explicitly-past events AND date-expired events that haven't been
  // written back yet (ensures archive is complete even before the write-back runs).
  let q = supabase.from('events')
    .select('*, organizers(id, name)', { count: 'exact' })
    .or(
      `status.eq.past,` +
      `and(is_flexible_date.neq.true,end_date.lt.${today},status.not.in.(past,permanent,cancelled,sold_out)),` +
      `and(is_flexible_date.neq.true,end_date.is.null,start_date.lt.${today},status.not.in.(past,permanent,cancelled,sold_out))`
    );
  if (category) q = q.eq('category', category);
  if (search)   q = q.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
  q = q.order(sortBy, { ascending: sortDir === 'asc' });
  q = q.range((page - 1) * perPage, page * perPage - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  // Apply computed status + persist any stragglers that weren't written back yet
  return { data: applyComputedStatus(data ?? [], { writeBack: true }), count: count ?? 0 };
};

export const adminRenewEvent = async (eventId) => {
  const original = await adminFetchEventById(eventId);
  const shiftDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  };
  const payload = {
    ...original,
    status: 'upcoming',
    start_date: shiftDate(original.start_date),
    end_date: shiftDate(original.end_date),
    is_new: false,
    event_dates: Array.isArray(original.event_dates)
      ? original.event_dates.map(d => ({
          ...d,
          start_date: shiftDate(d.start_date),
          end_date: shiftDate(d.end_date),
        }))
      : original.event_dates,
  };
  return adminCreateEvent(payload);
};

export const adminFetchPastEvents = async (limit = 10) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('events')
    .select('id, name, category, status, start_date, end_date')
    .or(`status.eq.past,end_date.lt.${today}`)
    .order('end_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
};

export const adminFetchRecentlyEditedEvents = async (limit = 10) => {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, category, status, updated_at, created_at')
    // Only include events that were genuinely edited (updated more than 1 min after creation)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).filter(e => {
    if (!e.updated_at || !e.created_at) return false;
    return new Date(e.updated_at) - new Date(e.created_at) > 60_000;
  });
};

export const adminFetchEventsByCategory = async () => {
  const { data, error } = await supabase.from('events').select('category');
  if (error) return [];
  const counts = {};
  (data ?? []).forEach(e => { if (e.category) counts[e.category] = (counts[e.category] || 0) + 1; });
  return Object.entries(counts).map(([category, count]) => ({ category, count }));
};

export const adminFetchEventsPerMonth = async () => {
  const { data, error } = await supabase
    .from('events').select('start_date, event_dates');
  if (error) return { chartData: [], undatedCount: 0 };
  const counts = {};
  let undatedCount = 0;
  (data ?? []).forEach(e => {
    if (e.start_date) {
      const month = e.start_date.substring(0, 7);
      counts[month] = (counts[month] || 0) + 1;
    } else if (Array.isArray(e.event_dates) && e.event_dates.length > 0) {
      e.event_dates.forEach(d => {
        const month = d.start_date?.substring(0, 7);
        if (month) counts[month] = (counts[month] || 0) + 1;
      });
    } else {
      undatedCount++;
    }
  });
  const chartData = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
  return { chartData, undatedCount };
};

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

export const adminLogAction = async (action, entity, entityId, details = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_audit_log').insert([{
      action,
      entity,
      entity_id: String(entityId),
      admin_id: user?.id,
      details,
      created_at: new Date().toISOString(),
    }]);
  } catch {
    // audit log is best-effort, never block main action
  }
};

export const adminFetchAuditLog = async ({ limit = 50 } = {}) => {
  const { data, error } = await supabase
    .from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return [];
  return data ?? [];
};

// ─── CSV BATCH IMPORT ─────────────────────────────────────────────────────────

export const adminImportEvents = async (events, { onProgress } = {}) => {
  const results = { success: 0, errors: [] };
  for (let i = 0; i < events.length; i++) {
    try {
      await adminCreateEvent(events[i]);
      results.success++;
    } catch (err) {
      results.errors.push({ row: i + 2, error: err.message ?? String(err) });
    }
    if (onProgress) onProgress(i + 1, events.length);
  }
  return results;
};

// ─── STORAGE: EVENT IMAGE UPLOAD ──────────────────────────────────────────────

export const adminUploadEventImage = async (file, eventId) => {
  if (!file.type.startsWith('image/')) throw new Error('Nur Bilddateien erlaubt');
  if (file.size > 10 * 1024 * 1024) throw new Error('Max. 10 MB');
  const ext = file.name.split('.').pop().toLowerCase() || 'jpg';

  const fileName = `events/${eventId ?? Date.now()}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('event-heros').upload(fileName, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('event-heros').getPublicUrl(fileName);
  return data.publicUrl;
};

// ─── AI SUMMARY (Edge Function) ───────────────────────────────────────────────

export const adminGenerateAiSummary = async (eventData, lang = 'DE', customPrompt = '') => {
  const { data, error } = await supabase.functions.invoke('generate-ai-summary', {
    body: { event: eventData, lang, customPrompt },
  });
  if (error) throw error;
  return data?.summary ?? '';
};

// ─── MX TRACKS ────────────────────────────────────────────────────────────────

function normalizeMxTrackPayload(form, eventId) {
  let coords = form.coordinates;
  if (typeof coords === 'string') {
    try { coords = JSON.parse(coords); } catch { coords = {}; }
  }
  return {
    name: form.name || '',
    location: form.location || '',
    coordinates: coords || {},
    organizer_id: form.organizer_id || null,
    status: form.status || 'active',
    season_start: form.mx_season_start || null,
    season_end: form.mx_season_end || null,
    open_days: form.mx_open_days || [],
    opening_hours: form.mx_opening_hours || {},
    price_info: form.mx_price_info || null,
    price_value: form.price_value !== '' && form.price_value != null ? parseFloat(form.price_value) : null,
    image: form.image || null,
    difficulty: form.difficulty ? parseInt(form.difficulty) : null,
    beginner_friendly: form.beginner_friendly || false,
    event_id: eventId,
  };
}

export const adminFetchMxTrackByEventId = async (eventId) => {
  const { data, error } = await supabase
    .from('mx_tracks').select('*').eq('event_id', eventId).maybeSingle();
  if (error) throw error;
  return data;
};

export const adminCreateMxTrack = async (form, eventId) => {
  const payload = normalizeMxTrackPayload(form, eventId);
  const { data, error } = await supabase.from('mx_tracks').insert([payload]).select().single();
  if (error) throw error;
  return data;
};

export const adminUpdateMxTrack = async (form, eventId) => {
  const payload = normalizeMxTrackPayload(form, eventId);
  const { data, error } = await supabase
    .from('mx_tracks').update(payload).eq('event_id', eventId).select().single();
  if (error) throw error;
  return data;
};

// ─── ORGANIZER-SCOPED ANALYTICS ───────────────────────────────────────────────

export const organizerFetchDashboardStats = async (organizerId) => {
  const [
    { count: totalEvents },
    { count: upcomingEvents },
    { data: recentEvents },
    { data: allEvents },
  ] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('organizer_id', organizerId),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('organizer_id', organizerId).eq('status', 'upcoming'),
    supabase.from('events').select('id, name, category, status, created_at').eq('organizer_id', organizerId).order('created_at', { ascending: false }).limit(10),
    supabase.from('events').select('id, registered_friends').eq('organizer_id', organizerId),
  ]);

  const regCounts = await countRegsUnified(allEvents ?? []);
  const totalRegistrations = Object.values(regCounts).reduce((s, v) => s + v, 0);

  return {
    totalEvents: totalEvents ?? 0,
    upcomingEvents: upcomingEvents ?? 0,
    totalRegistrations,
    recentEvents: recentEvents ?? [],
  };
};

export const organizerFetchEventsByCategory = async (organizerId) => {
  const { data, error } = await supabase.from('events').select('category').eq('organizer_id', organizerId);
  if (error) return [];
  const counts = {};
  (data ?? []).forEach(e => { if (e.category) counts[e.category] = (counts[e.category] || 0) + 1; });
  return Object.entries(counts).map(([category, count]) => ({ category, count }));
};

export const organizerFetchEventsPerMonth = async (organizerId) => {
  const { data, error } = await supabase.from('events').select('start_date, event_dates').eq('organizer_id', organizerId);
  if (error) return { chartData: [], undatedCount: 0 };
  const counts = {};
  let undatedCount = 0;
  (data ?? []).forEach(e => {
    if (e.start_date) {
      const month = e.start_date.substring(0, 7);
      counts[month] = (counts[month] || 0) + 1;
    } else if (Array.isArray(e.event_dates) && e.event_dates.length > 0) {
      e.event_dates.forEach(d => {
        const month = d.start_date?.substring(0, 7);
        if (month) counts[month] = (counts[month] || 0) + 1;
      });
    } else {
      undatedCount++;
    }
  });
  const chartData = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
  return { chartData, undatedCount };
};

// ─── Shared helper: union registrations from BOTH sources per event ──────────
// Source A: events.registered_friends (JSONB array of user UUID strings)
// Source B: users.registered_event_ids — queried per event with .contains(),
//           the same server-side operator used in adminFetchEventRegistrationDetails.
// Runs all per-event queries in parallel. Deduplicates by user ID.
async function countRegsUnified(events) {
  if (!events?.length) return {};

  const counts = {};
  await Promise.all(events.map(async e => {
    // Source A: registered_friends JSONB array
    const seen = new Set(
      (Array.isArray(e.registered_friends) ? e.registered_friends : []).map(String)
    );
    // Source B: server-side .contains() — identical to the modal query
    const { data: regUsers } = await supabase
      .from('users').select('id').contains('registered_event_ids', [e.id]);
    (regUsers ?? []).forEach(u => seen.add(String(u.id)));
    counts[e.id] = seen.size;
  }));
  return counts;
}

export const organizerFetchRegistrationsPerEvent = async (organizerId) => {
  const { data: events, error: evErr } = await supabase
    .from('events')
    .select('id, name, registered_friends, group_size, status, start_date, location')
    .eq('organizer_id', organizerId)
    .order('start_date', { ascending: false });
  if (evErr) { console.warn('organizerFetchRegistrationsPerEvent error:', evErr.message); return []; }
  if (!events?.length) return [];

  const counts = await countRegsUnified(events);

  return (events ?? []).map(e => ({
    id: e.id, name: e.name, location: e.location,
    registrations: counts[e.id] ?? 0,
    maxParticipants: e.group_size ?? null,
    status: e.status, startDate: e.start_date,
  }));
};

// ─── REGISTRATION TRENDS (organizer-scoped) ───────────────────────────────────

export const organizerFetchRegistrationTrends = async (organizerId) => {
  const { data: events } = await supabase
    .from('events').select('id').eq('organizer_id', organizerId);
  const eventIds = (events ?? []).map(e => e.id);
  if (eventIds.length === 0) return { thisWeek: 0, thisMonth: 0, monthly: [] };

  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data: regs, error } = await supabase
    .from('event_registrations')
    .select('event_id, registered_at')
    .in('event_id', eventIds)
    .gte('registered_at', yearAgo.toISOString())
    .eq('status', 'registered')
    .order('registered_at', { ascending: true });
  if (error) return { thisWeek: 0, thisMonth: 0, monthly: [] };

  const now = new Date();
  const weekAgo  = new Date(now - 7  * 86400000).toISOString();
  const monthAgo = new Date(now - 30 * 86400000).toISOString();
  const thisWeek  = (regs ?? []).filter(r => r.registered_at >= weekAgo).length;
  const thisMonth = (regs ?? []).filter(r => r.registered_at >= monthAgo).length;
  const buckets = {};
  (regs ?? []).forEach(r => {
    const m = r.registered_at.substring(0, 7);
    buckets[m] = (buckets[m] || 0) + 1;
  });
  const monthly = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
  return { thisWeek, thisMonth, monthly };
};

// ─── REGISTRATION ANALYTICS (super-admin) ────────────────────────────────────

export const adminFetchTopEventsByRegistrations = async (limit = 10) => {
  const { data: evs, error } = await supabase
    .from('events')
    .select('id, name, category, start_date, registered_friends, organizer_id');
  if (error) return [];

  // Fetch organizer names separately to avoid embedded-join failures
  const orgIds = [...new Set((evs ?? []).map(e => e.organizer_id).filter(Boolean))];
  let orgMap = {};
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organizers').select('id, name').in('id', orgIds);
    (orgs ?? []).forEach(o => { orgMap[o.id] = o.name; });
  }

  const counts = await countRegsUnified(evs ?? []);

  return (evs ?? [])
    .map(e => ({
      id: e.id, name: e.name, category: e.category, startDate: e.start_date,
      registrations: counts[e.id] ?? 0,
      organizerName: orgMap[e.organizer_id] ?? '–',
    }))
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, limit);
};

// Fetch all users registered for a specific event (super-admin only)
export const adminFetchEventRegistrationDetails = async (eventId) => {
  const { data: ev, error: evErr } = await supabase
    .from('events')
    .select('id, name, registered_friends')
    .eq('id', eventId)
    .single();
  if (evErr || !ev) return { eventName: '', users: [] };

  // Union both sources: registered_friends (UUIDs) + users.registered_event_ids
  const friendIds = new Set(
    (Array.isArray(ev.registered_friends) ? ev.registered_friends : []).map(String)
  );
  const { data: usersWithEvent } = await supabase
    .from('users').select('id').contains('registered_event_ids', [eventId]);
  (usersWithEvent ?? []).forEach(u => friendIds.add(String(u.id)));
  const ids = [...friendIds];

  if (ids.length === 0) return { eventName: ev.name, users: [] };

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email, avatar')
    .in('id', ids);
  return { eventName: ev.name, users: users ?? [] };
};

export const adminFetchRegistrationsByUser = async ({
  eventId = null, organizerId = null,
  page = 0, perPage = 50,
} = {}) => {
  // Fetch events (with optional filters)
  let evQ = supabase
    .from('events')
    .select('id, name, start_date, category, registered_friends, organizer_id');
  if (eventId)     evQ = evQ.eq('id', eventId);
  if (organizerId) evQ = evQ.eq('organizer_id', organizerId);

  const { data: evs, error: evErr } = await evQ;
  if (evErr || !evs?.length) return { data: [], count: 0 };

  // Fetch organizer names separately to avoid embedded-join failures
  const orgIds = [...new Set((evs ?? []).map(e => e.organizer_id).filter(Boolean))];
  let orgMap = {};
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organizers').select('id, name').in('id', orgIds);
    (orgs ?? []).forEach(o => { orgMap[o.id] = o.name; });
  }

  const evMap = {};
  evs.forEach(e => { evMap[e.id] = { ...e, _orgName: orgMap[e.organizer_id] ?? '–' }; });

  // Union both sources into per-event sets of user IDs (deduplicates by user)
  const strToOrigId = new Map(evs.map(e => [String(e.id), e.id]));
  // Source A: registered_friends
  const pairSet = new Map(); // key: `${userId}:${eventId}` → { userId, event }
  evs.forEach(e => {
    (Array.isArray(e.registered_friends) ? e.registered_friends : []).forEach(uid => {
      const key = `${String(uid)}:${e.id}`;
      if (!pairSet.has(key)) pairSet.set(key, { userId: String(uid), event: e });
    });
  });
  // Source B: server-side overlap so PostgreSQL handles type coercion
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, name, email, avatar, registered_event_ids')
    .overlaps('registered_event_ids', evs.map(e => e.id));
  const userDataMap = {};
  (allUsers ?? []).forEach(u => {
    userDataMap[String(u.id)] = u;
    (u.registered_event_ids ?? []).forEach(eid => {
      const origId = strToOrigId.get(String(eid));
      if (origId !== undefined) {
        const key = `${String(u.id)}:${origId}`;
        if (!pairSet.has(key)) pairSet.set(key, { userId: String(u.id), event: evMap[origId] });
      }
    });
  });

  const pairs = [...pairSet.values()];
  if (pairs.length === 0) return { data: [], count: 0 };

  // Fetch user details for any user IDs not already loaded from source B
  const uniqueIds = [...new Set(pairs.map(p => p.userId))];
  const missingIds = uniqueIds.filter(id => !userDataMap[id]);
  if (missingIds.length) {
    const { data: extraUsers } = await supabase
      .from('users').select('id, name, email, avatar').in('id', missingIds);
    (extraUsers ?? []).forEach(u => { userDataMap[String(u.id)] = u; });
  }
  const userMap = userDataMap;

  // Best-effort timestamps from event_registrations
  const { data: erRows } = await supabase
    .from('event_registrations').select('user_id, event_id, registered_at')
    .in('event_id', evs.map(e => e.id));
  const tsMap = {};
  (erRows ?? []).forEach(r => { tsMap[`${r.user_id}:${r.event_id}`] = r.registered_at; });

  const allRows = pairs.map(p => {
    const u = userMap[p.userId] ?? {};
    const e = p.event;
    return {
      id: `${p.userId}:${e.id}`,
      registeredAt: tsMap[`${p.userId}:${e.id}`] ?? null,
      userId: p.userId, eventId: e.id,
      userName: u.name ?? '–', userEmail: u.email ?? '–', userAvatar: u.avatar ?? null,
      eventName: e.name ?? '–', eventDate: e.start_date ?? null,
      eventCategory: e.category ?? null, organizerName: e._orgName ?? '–',
    };
  });

  allRows.sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));
  return { count: allRows.length, data: allRows.slice(page * perPage, (page + 1) * perPage) };
};

export const adminFetchRegistrationsByOrganizer = async () => {
  const { data: evs, error } = await supabase
    .from('events').select('id, organizer_id, registered_friends');
  if (error) return [];

  // Fetch organizer details separately to avoid embedded-join failures
  const orgIds = [...new Set((evs ?? []).map(e => e.organizer_id).filter(Boolean))];
  let orgMap = {};
  if (orgIds.length) {
    const { data: orgs } = await supabase.from('organizers').select('id, name, logo').in('id', orgIds);
    (orgs ?? []).forEach(o => { orgMap[o.id] = o; });
  }

  const regCounts = await countRegsUnified(evs ?? []);

  const map = {};
  (evs ?? []).forEach(e => {
    const oid = e.organizer_id; if (!oid) return;
    const o = orgMap[oid]; if (!o) return;
    if (!map[oid]) map[oid] = { id: o.id, name: o.name, logo: o.logo, registrations: 0, eventCount: 0 };
    map[oid].registrations += regCounts[e.id] ?? 0;
    map[oid].eventCount++;
  });
  return Object.values(map).sort((a, b) => b.registrations - a.registrations);
};

export const adminFetchRegistrationTrends = async () => {
  const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const { data: regs, error } = await supabase
    .from('event_registrations')
    .select('registered_at')
    .gte('registered_at', yearAgo.toISOString())
    .eq('status', 'registered');
  if (error) return { thisWeek: 0, thisMonth: 0, monthly: [] };

  const now = new Date();
  const weekAgo  = new Date(now - 7  * 86400000).toISOString();
  const monthAgo = new Date(now - 30 * 86400000).toISOString();
  const thisWeek  = (regs ?? []).filter(r => r.registered_at >= weekAgo).length;
  const thisMonth = (regs ?? []).filter(r => r.registered_at >= monthAgo).length;
  const buckets = {};
  (regs ?? []).forEach(r => {
    const m = r.registered_at.substring(0, 7);
    buckets[m] = (buckets[m] || 0) + 1;
  });
  const monthly = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
  return { thisWeek, thisMonth, monthly };
};

// ─── ROLE MANAGEMENT (Super-Admin only) ───────────────────────────────────────

export const adminUpdateUserRole = async (userId, adminRole, organizerId = null) => {
  const updates = { admin_role: adminRole };
  if (organizerId !== undefined) updates.organizer_id = organizerId;
  const { error } = await supabase.from('users').update(updates).eq('id', userId);
  if (error) throw error;
  const { data: fresh, error: fetchErr } = await supabase.from('users').select('*').eq('id', userId).single();
  if (fetchErr) throw fetchErr;
  return fresh;
};

export const adminFetchUserRole = async (userId) => {
  const { data, error } = await supabase
    .from('users').select('admin_role, organizer_id').eq('id', userId).single();
  if (error) return { admin_role: 'user', organizer_id: null };
  return data ?? { admin_role: 'user', organizer_id: null };
};

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export const adminFetchSettings = async () => {
  const { data, error } = await supabase
    .from('admin_settings').select('*').single();
  if (error && error.code === 'PGRST116') return {}; // no row yet
  if (error) throw error;
  return data ?? {};
};

export const adminSaveSettings = async (settings) => {
  const { data, error } = await supabase
    .from('admin_settings').upsert([{ id: 1, ...settings }]).select().single();
  if (error) throw error;
  return data;
};
