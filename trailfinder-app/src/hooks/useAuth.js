// useAuth – React Hook für Supabase Authentifizierung

import { useState, useEffect, useContext, createContext, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

// On native: use the deep link scheme; on web: use the current origin
const getAppUrl = () =>
    Capacitor.isNativePlatform()
        ? 'com.trailhub.mx://callback'
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

const DELETED_MESSAGES = {
    de: 'Dein Konto wurde gelöscht. Bitte wende dich an den Support.',
    fr: 'Votre compte a été supprimé. Veuillez contacter le support.',
    en: 'Your account has been deleted. Please contact support.',
};
function getDeletedMessage() {
    const lang = (localStorage.getItem('i18nextLng') || 'en').substring(0, 2);
    return DELETED_MESSAGES[lang] ?? DELETED_MESSAGES.en;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
    const [deletedBanner, setDeletedBanner] = useState(false);
    // Ref needed because onAuthStateChange closure can't read stale useState value
    const isRecoveryRef = useRef(false);

    const signOutGhostUser = async () => {
        setDeletedBanner(true);
        setTimeout(() => setDeletedBanner(false), 7000);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    useEffect(() => {
        if (!isSupabaseConfigured()) {
            setLoading(false);
            return;
        }

        // Aktuelle Session laden
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (!isRecoveryRef.current && session?.user) {
                // Block + ghost check: kick out locked or deleted users on resume
                const { data: prof, error: profErr } = await supabase
                    .from('users').select('is_blocked').eq('id', session.user.id).single();
                if (prof?.is_blocked) {
                    await supabase.auth.signOut();
                    setLoading(false);
                    return;
                }
                // PGRST116 = row not found → auth exists but profile deleted → ghost user
                if (prof === null && profErr?.code === 'PGRST116') {
                    await signOutGhostUser();
                    setLoading(false);
                    return;
                }
                setUser(session.user);
                // eslint-disable-next-line react-hooks/immutability
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

            if (session?.user) {
                // Check is_blocked + ghost user before ever setting user.
                supabase.from('users').select('is_blocked').eq('id', session.user.id).single()
                    .then(({ data: prof, error: profErr }) => {
                        if (prof?.is_blocked) {
                            supabase.auth.signOut();
                            return;
                        }
                        // PGRST116 = no profile row → auth exists but account deleted
                        if (prof === null && profErr?.code === 'PGRST116') {
                            signOutGhostUser();
                            return;
                        }
                        setUser(session.user);
                        loadProfile(session.user.id);
                    })
                    .catch(() => {
                        // Network failure → fail open (don't punish real users)
                        setUser(session.user);
                        loadProfile(session.user.id);
                    });
            } else {
                setUser(null);
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
            appUrlListener?.remove();
        };
    }, []);

    async function loadProfile(userId) {
        try {
            const p = await fetchUserProfile(userId);
            setProfile(p);
        } catch {
            setProfile(null);
        }
    }

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
        if (!user || !profile) return;
        const updated = await sbToggleFavorite(user.id, eventId);
        setProfile(updated);
    };

    const toggleRegistration = async (eventId) => {
        if (!user || !profile) return;
        const updated = await sbToggleRegistration(user.id, eventId);
        setProfile(updated);
    };

    const saveEventDateSelection = async (eventId, dateIdx) => {
        if (!user || !profile) return;
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
            {deletedBanner && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 bg-red-950 border border-red-700 rounded-xl shadow-2xl text-sm text-red-100 flex items-center gap-3 animate-fade-in">
                    <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    {getDeletedMessage()}
                </div>
            )}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
    return ctx;
};