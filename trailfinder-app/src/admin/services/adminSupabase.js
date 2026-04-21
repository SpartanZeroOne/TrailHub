// ─── TrailHub Admin – Supabase Service Layer ──────────────────────────────────
import { supabase } from '../../services/supabaseClient';

// ─── EVENTS ───────────────────────────────────────────────────────────────────

export const adminFetchEvents = async ({
  page = 1, perPage = 25, category, status, organizerId, search, sortBy = 'start_date', sortDir = 'asc',
  excludeStatuses = [],
} = {}) => {
  let q = supabase.from('events').select('*, organizers(id, name)', { count: 'exact' });

  if (category)    q = q.eq('category', category);
  if (status)      q = q.eq('status', status);
  if (organizerId) q = q.eq('organizer_id', organizerId);
  if (search)      q = q.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
  for (const s of excludeStatuses) q = q.neq('status', s);

  q = q.order(sortBy, { ascending: sortDir === 'asc' });
  q = q.range((page - 1) * perPage, page * perPage - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
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
  // Auto-generate slug from name if missing (kept for future use but not sent to DB)
  if (!p.slug && p.name) {
    p.slug = p.name.toLowerCase()
      .replace(/[äöüß]/g, c => ({ ä:'ae', ö:'oe', ü:'ue', ß:'ss' }[c] || c))
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  // Flexible events must have null dates — never send an empty string to a date column
  if (p.is_flexible_date) {
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

export const adminDeleteUser = async (id) => {
  // Note: this only deletes from the users profile table.
  // Deleting from auth.users requires the service-role key (Edge Function).
  const { error } = await supabase.from('users').delete().eq('id', id);
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
  let q = supabase.from('events')
    .select('*, organizers(id, name)', { count: 'exact' })
    .eq('status', 'past');
  if (category) q = q.eq('category', category);
  if (search)   q = q.or(`name.ilike.%${search}%,location.ilike.%${search}%`);
  q = q.order(sortBy, { ascending: sortDir === 'asc' });
  q = q.range((page - 1) * perPage, page * perPage - 1);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
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

export const adminFetchEventsByCategory = async () => {
  const { data, error } = await supabase.from('events').select('category');
  if (error) return [];
  const counts = {};
  (data ?? []).forEach(e => { if (e.category) counts[e.category] = (counts[e.category] || 0) + 1; });
  return Object.entries(counts).map(([category, count]) => ({ category, count }));
};

export const adminFetchEventsPerMonth = async () => {
  const { data, error } = await supabase
    .from('events').select('start_date').not('start_date', 'is', null);
  if (error) return [];
  const counts = {};
  (data ?? []).forEach(e => {
    const month = e.start_date?.substring(0, 7); // YYYY-MM
    if (month) counts[month] = (counts[month] || 0) + 1;
  });
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
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
