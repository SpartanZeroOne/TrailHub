// Supabase Client – TrailFinder
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
});

export const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    if (error) throw error;
    return data;
};
export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
};
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};
export const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
};

// ─── EVENTS ───────────────────────────────────────────────────────────────────
export const fetchEvents = async ({ category, status } = {}) => {
    let query = supabase.from('events')
        .select('*, organizers(id, name, logo, logo_bg_color, verified, description, website, since, events_hosted, rating, specialties)')
        .order('start_date', { ascending: true });
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
};
export const fetchFeaturedEvents = async ({ limit = 8 } = {}) => {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_featured', true)
        .eq('status', 'upcoming')
        .order('start_date', { ascending: true })
        .limit(limit);
    if (error) throw error;
    return data ?? [];
};
export const fetchEventById = async (id) => {
    const { data, error } = await supabase.from('events').select('*, organizers(*)').eq('id', id).single();
    if (error) throw error;
    return data;
};
export const createEvent = async (eventData) => {
    const { data, error } = await supabase.from('events').insert([eventData]).select().single();
    if (error) throw error;
    return data;
};
export const updateEvent = async (id, updates) => {
    const { data, error } = await supabase.from('events').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
};
export const deleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) throw error;
};

// ─── USERS ────────────────────────────────────────────────────────────────────
export const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};
export const upsertUserProfile = async (profile) => {
    const { data, error } = await supabase.from('users').upsert(profile).select().single();
    if (error) throw error;
    return data;
};
export const toggleFavorite = async (userId, eventId) => {
    const profile = await fetchUserProfile(userId);
    const current = profile?.favorite_event_ids ?? [];
    const updated = current.includes(eventId) ? current.filter(id => id !== eventId) : [...current, eventId];
    return upsertUserProfile({ id: userId, favorite_event_ids: updated });
};
export const toggleRegistration = async (userId, eventId) => {
    const profile = await fetchUserProfile(userId);
    const current = profile?.registered_event_ids ?? [];
    const updated = current.includes(eventId) ? current.filter(id => id !== eventId) : [...current, eventId];
    return upsertUserProfile({ id: userId, registered_event_ids: updated });
};
export const saveEventDateSelection = async (userId, eventId, dateIdx) => {
    const profile = await fetchUserProfile(userId);
    const current = profile?.event_date_selections ?? {};
    const updated = { ...current, [String(eventId)]: dateIdx };
    return upsertUserProfile({ id: userId, event_date_selections: updated });
};

// ─── FRIENDS ──────────────────────────────────────────────────────────────────
export const fetchFriends = async (userId) => {
    const { data, error } = await supabase.from('friends')
        .select('friend_id, users!friends_friend_id_fkey(id, name, avatar)').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map(row => row.users);
};
export const addFriend = async (userId, friendId) => {
    const { error } = await supabase.from('friends').insert([
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId },
    ]);
    if (error) throw error;
};

// Returns accepted friends + outgoing pending requests for userId.
// Each entry carries two privacy flags:
//   i_hide_from_them  – current user has hidden their events from this friend
//   they_hide_from_me – this friend has hidden their events from the current user
//
// Resilience: the primary query only selects columns that exist in the base schema.
// The hide_my_events privacy flags are fetched in separate secondary queries that
// fail silently (default false) if migration 04 has not been applied yet.
// This ensures the friend list and "Add Friend" flow always work.
export const fetchFriendsWithStatus = async (userId) => {
    // Primary query: friend list + status.
    // For accepted friends the users join returns full data (RLS: accepted friend).
    // For pending-outgoing rows the join is blocked by RLS → users will be null.
    const { data: myRows, error: myErr } = await supabase.from('friends')
        .select('friend_id, status, created_at, users!friends_friend_id_fkey(id, name, avatar, location, bio, registered_event_ids, event_date_selections, privacy_registration_visibility)')
        .eq('user_id', userId);
    if (myErr) throw myErr;

    const rows = myRows ?? [];
    if (rows.length === 0) return [];

    // For pending-outgoing rows the join returned null (RLS blocked).
    // Fetch their basic profile (no sensitive fields) via SECURITY DEFINER RPC.
    const pendingNullIds = rows
        .filter(r => !r.users && r.status === 'pending')
        .map(r => r.friend_id);

    let pendingBasicMap = {};
    if (pendingNullIds.length > 0) {
        const { data: basicUsers } = await supabase.rpc('get_users_basic', { user_ids: pendingNullIds });
        pendingBasicMap = Object.fromEntries((basicUsers ?? []).map(u => [u.id, u]));
    }

    const friendIds = rows.map(r => r.friend_id);

    // Secondary queries: privacy flags (require migration 04 — hide_my_events column).
    // Errors are intentionally NOT thrown here; if the column is missing the Supabase
    // client returns { data: null, error } which we handle with the ?? [] fallback.
    const [{ data: theirRows }, { data: myHideRows }] = await Promise.all([
        supabase.from('friends')
            .select('user_id, hide_my_events')
            .eq('friend_id', userId)
            .in('user_id', friendIds),
        supabase.from('friends')
            .select('friend_id, hide_my_events')
            .eq('user_id', userId)
            .in('friend_id', friendIds),
    ]);

    const theyHideMap = Object.fromEntries(
        (theirRows ?? []).map(r => [r.user_id, r.hide_my_events ?? false])
    );
    const iHideMap = Object.fromEntries(
        (myHideRows ?? []).map(r => [r.friend_id, r.hide_my_events ?? false])
    );

    return rows.map(r => ({
        ...(r.users ?? pendingBasicMap[r.friend_id] ?? {}),
        status: r.status,
        since: r.created_at,
        i_hide_from_them: iHideMap[r.friend_id] ?? false,
        they_hide_from_me: theyHideMap[r.friend_id] ?? false,
    }));
};

// Toggle the current user's hide_my_events flag for one friend.
// Requires the friends_update_own RLS policy (migration 04).
export const setHideMyEventsFromFriend = async (userId, friendId, hide) => {
    const { error } = await supabase.from('friends')
        .update({ hide_my_events: hide })
        .eq('user_id', userId)
        .eq('friend_id', friendId);
    if (error) throw error;
};

// Returns users who sent a pending request to userId.
// Two-step: fetch friend rows first, then get basic profiles via RPC
// (direct join is blocked by RLS since requester is not yet an accepted friend).
export const fetchIncomingRequests = async (userId) => {
    const { data, error } = await supabase.from('friends')
        .select('user_id, created_at')
        .eq('friend_id', userId)
        .eq('status', 'pending');
    if (error) throw error;
    const rows = data ?? [];
    if (rows.length === 0) return [];

    const requesterIds = rows.map(r => r.user_id);
    const { data: users, error: usersErr } = await supabase.rpc('get_users_basic', { user_ids: requesterIds });
    if (usersErr) throw usersErr;

    const usersMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));
    return rows
        .map(r => ({ ...usersMap[r.user_id], requestedAt: r.created_at }))
        .filter(r => r.id);
};

// Search users by name or email (case-insensitive).
// Uses SECURITY DEFINER RPC — bypasses RLS but returns only non-sensitive columns.
// registered_event_ids is never exposed for non-friends.
export const searchUsers = async (query) => {
    if (!query || query.length < 2) return [];
    const { data, error } = await supabase.rpc('search_users_safe', { search_query: query });
    if (error) throw error;
    return data ?? [];
};

// Returns basic public profile (name, avatar, location, bio) for any user ID.
// Uses SECURITY DEFINER RPC — safe for non-friends (no sensitive fields).
export const fetchUserById = async (userId) => {
    const { data, error } = await supabase.rpc('get_users_basic', { user_ids: [userId] });
    if (error && error.code !== 'PGRST116') throw error;
    return data?.[0] ?? null;
};

// Send a friend request (one direction, status='pending')
export const sendFriendRequest = async (userId, friendId) => {
    const { error } = await supabase.from('friends').insert([
        { user_id: userId, friend_id: friendId, status: 'pending' }
    ]);
    if (error) throw error;
};

// Accept: update the incoming pending row + insert the reverse accepted row
export const acceptFriendRequest = async (userId, friendId) => {
    const { error: upErr } = await supabase.from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId).eq('friend_id', userId).eq('status', 'pending');
    if (upErr) throw upErr;
    const { error: inErr } = await supabase.from('friends').insert([
        { user_id: userId, friend_id: friendId, status: 'accepted' }
    ]);
    if (inErr) throw inErr;
};

// Reject / cancel an incoming pending request
export const rejectFriendRequest = async (userId, friendId) => {
    const { error } = await supabase.from('friends')
        .delete().eq('user_id', friendId).eq('friend_id', userId).eq('status', 'pending');
    if (error) throw error;
};

// Remove friendship – bidirektional, atomar via RPC (SECURITY DEFINER)
// Löscht BEIDE Richtungen in einer einzigen DB-Transaktion.
// Triggert Realtime-Events für beide User → beide sehen sofortige Aktualisierung.
export const removeFriendship = async (userId, friendId) => {
    const { error } = await supabase.rpc('remove_friendship', {
        p_user_id: userId,
        p_friend_id: friendId,
    });
    if (error) throw error;
};

// ─── MX TRACKS ───────────────────────────────────────────────────────────────
export const fetchMxTracks = async ({ status } = {}) => {
    let query = supabase.from('mx_tracks').select('*').order('name', { ascending: true });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
};
export const fetchMxTrackById = async (id) => {
    const { data, error } = await supabase.from('mx_tracks').select('*, organizers(*)').eq('id', id).single();
    if (error) throw error;
    return data;
};

// ─── ORGANIZERS ───────────────────────────────────────────────────────────────
export const fetchOrganizers = async () => {
    const { data, error } = await supabase.from('organizers').select('*');
    if (error) throw error;
    return data ?? [];
};
export const fetchOrganizerById = async (id) => {
    const { data, error } = await supabase.from('organizers').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
};

// ─── STORAGE: AVATAR UPLOAD ───────────────────────────────────────────────────
export const uploadAvatar = async (userId, file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext)) throw new Error('Ungültiges Format. Erlaubt: JPG, PNG, WebP');
    if (file.size > 5 * 1024 * 1024) throw new Error('Datei zu groß. Maximum: 5 MB');

    const fileName = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type });
    if (error) throw error;

    const { data } = supabase.storage.from('profile-avatars').getPublicUrl(fileName);
    return data.publicUrl;
};

export default supabase;