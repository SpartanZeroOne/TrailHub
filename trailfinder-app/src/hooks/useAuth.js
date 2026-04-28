// useAuth – React Hook für Supabase Authentifizierung

import { useState, useEffect, useContext, createContext, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// On native: use the deep link scheme; on web: use the current origin
const getAppUrl = () =>
    Capacitor.isNativePlatform()
        ? 'com.trailhub.app://callback'
        : (import.meta.env.VITE_APP_URL || window.location.origin);
import {
    supabase,
    signIn as sbSignIn,
    signUp as sbSignUp,
    signOut as sbSignOut,
    fetchUserProfile,
    upsertUserProfile,
    toggleFavorite as sbToggleFavorite,
    toggleRegistration as sbToggleRegistration,
    saveEventDateSelection as sbSaveEventDateSelection,
    isSupabaseConfigured,
} from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    // Ref needed because onAuthStateChange closure can't read stale useState value
    const isRecoveryRef = useRef(false);

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Aktuelle Session laden
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!isRecoveryRef.current && session?.user) {
                // Block check: kick out users that were locked while already logged in
                const { data: prof } = await supabase
                    .from('users').select('is_blocked').eq('id', session.user.id).single();
                if (prof?.is_blocked) {
                    await supabase.auth.signOut();
                    setLoading(false);
                    return;
                }
                setUser(session.user);
                loadProfile(session.user.id);
            } else if (!isRecoveryRef.current) {
                setUser(null);
            }
            setLoading(false);
        });

        // Native Deep Link abfangen (Supabase OAuth / Password-Reset auf Capacitor)
        let appUrlListener;
        if (Capacitor.isNativePlatform()) {
            CapApp.addListener('appUrlOpen', async ({ url }) => {
                if (url.includes('access_token') || url.includes('code=')) {
                    await supabase.auth.getSessionFromUrl({ url });
                }
            }).then(handle => { appUrlListener = handle; });
        }

        // Auth-State-Änderungen abonnieren
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (_event === 'PASSWORD_RECOVERY') {
                // Recovery-Link geklickt: Modal anzeigen, NICHT normal einloggen
                isRecoveryRef.current = true;
                setIsPasswordRecovery(true);
                setUser(session?.user ?? null);
                return;
            }
            // SIGNED_IN und USER_UPDATED während Recovery → Modal nicht schließen
            if ((_event === 'SIGNED_IN' || _event === 'USER_UPDATED') && isRecoveryRef.current) {
                setUser(session?.user ?? null);
                return;
            }
            // Alle anderen Events (SIGNED_OUT etc.) beenden den Recovery-Mode
            isRecoveryRef.current = false;
            setIsPasswordRecovery(false);
            setUser(session?.user ?? null);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
            appUrlListener?.remove();
        };
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

    const sendPasswordReset = async (email) => {
        const appUrl = getAppUrl();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            // Dedizierte Reset-Seite — kein Auto-Login in der Haupt-App
            redirectTo: `${appUrl}/reset-password`,
        });
        if (error) throw error;
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        // isPasswordRecovery bleibt true → Modal zeigt Success-Screen
        // Der Aufrufer muss signOut() aufrufen um den Reset-Flow zu beenden
    };

    const deleteAccount = async (confirmPassword) => {
        if (!user) return;
        // Re-authenticate to verify the user knows their password before deleting.
        const { error: authErr } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: confirmPassword,
        });
        if (authErr) throw new Error('Falsches Passwort. Account wurde nicht gelöscht.');
        // Delete profile row first (cascade deletes friends too)
        await supabase.from('users').delete().eq('id', user.id);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
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

    const saveEventDateSelection = async (eventId, dateIdx) => {
        if (!user) return;
        const updated = await sbSaveEventDateSelection(user.id, eventId, dateIdx);
        setProfile(updated);
    };

    const isFavorite = (eventId) => profile?.favorite_event_ids?.includes(eventId) ?? false;
    const isRegistered = (eventId) => profile?.registered_event_ids?.includes(eventId) ?? false;

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            isPasswordRecovery,
            signIn,
            signUp,
            signOut,
            updateProfile,
            sendPasswordReset,
            updatePassword,
            deleteAccount,
            toggleFavorite,
            toggleRegistration,
            saveEventDateSelection,
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