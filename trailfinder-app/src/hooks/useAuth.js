// useAuth – React Hook für Supabase Authentifizierung

import { useState, useEffect, useContext, createContext } from 'react';
import {
    supabase,
    signIn as sbSignIn,
    signUp as sbSignUp,
    signOut as sbSignOut,
    fetchUserProfile,
    upsertUserProfile,
    toggleFavorite as sbToggleFavorite,
    toggleRegistration as sbToggleRegistration,
    isSupabaseConfigured,
} from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Aktuelle Session laden
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) loadProfile(session.user.id);
            setLoading(false);
        });

        // Auth-State-Änderungen abonnieren
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadProfile = async (userId) => {
        try {
            const p = await fetchUserProfile(userId);
            setProfile(p);
        } catch {
            setProfile(null);
        }
    };

    const signIn = async (email, password) => {
        const data = await sbSignIn(email, password);
        return data;
    };

    const signUp = async (email, password, name) => {
        const data = await sbSignUp(email, password, name);
        return data;
    };

    const signOut = async () => {
        await sbSignOut();
        setUser(null);
        setProfile(null);
    };

    const updateProfile = async (updates) => {
        if (!user) return;
        const updated = await upsertUserProfile({ id: user.id, ...updates });
        setProfile(updated);
        return updated;
    };

    const toggleFavorite = async (eventId) => {
        if (!user) return;
        const updated = await sbToggleFavorite(user.id, eventId);
        setProfile(updated);
    };

    const toggleRegistration = async (eventId) => {
        if (!user) return;
        const updated = await sbToggleRegistration(user.id, eventId);
        setProfile(updated);
    };

    const isFavorite = (eventId) => profile?.favorite_event_ids?.includes(eventId) ?? false;
    const isRegistered = (eventId) => profile?.registered_event_ids?.includes(eventId) ?? false;

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signIn,
            signUp,
            signOut,
            updateProfile,
            toggleFavorite,
            toggleRegistration,
            isFavorite,
            isRegistered,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
    return ctx;
};