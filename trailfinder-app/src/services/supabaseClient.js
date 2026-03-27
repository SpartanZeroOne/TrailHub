// Supabase Client Service
// Placeholder – configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local

// import { createClient } from '@supabase/supabase-js';
// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// );
// export default supabase;

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
    });
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

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
};

// ─── EVENTS ──────────────────────────────────────────────────────────────────

export const fetchEvents = async ({ category, status } = {}) => {
    let query = supabase.from('events').select('*').order('start_date', { ascending: true });
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
};

export const fetchEventById = async (id) => {
    const { data, error } = await supabase
        .from('events')
        .select('*, organizers(*)')
        .eq('id', id)
        .single();
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

// ─── USERS / PROFILE ──────────────────────────────────────────────────────────

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
    const updated = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
    return upsertUserProfile({ id: userId, favorite_event_ids: updated });
};

export const toggleRegistration = async (userId, eventId) => {
    const profile = await fetchUserProfile(userId);
    const current = profile?.registered_event_ids ?? [];
    const updated = current.includes(eventId)
        ? current.filter((id) => id !== eventId)
        : [...current, eventId];
    return upsertUserProfile({ id: userId, registered_event_ids: updated });
};

// ─── FRIENDS ─────────────────────────────────────────────────────────────────

export const fetchFriends = async (userId) => {
    const { data, error } = await supabase
        .from('friends')
        .select('friend_id, users!friends_friend_id_fkey(id, name, avatar)')
        .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((row) => row.users);
};

export const addFriend = async (userId, friendId) => {
    const { error } = await supabase.from('friends').insert([
        { user_id: userId, friend_id: friendId },
        { user_id: friendId, friend_id: userId },
    ]);
    if (error) throw error;
};

export const removeFriend = async (userId, friendId) => {
    const { error } = await supabase
        .from('friends')
        .delete()
        .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
    if (error) throw error;
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

// ─── STORAGE (Build-Dateien / Event-Bilder) ───────────────────────────────────

export const getPublicUrl = (bucket, path) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

export const uploadFile = async (bucket, path, file) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    return data;
};

export default supabase;