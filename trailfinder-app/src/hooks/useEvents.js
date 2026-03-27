// useEvents – React Hook für Event-Daten aus Supabase
// Fällt auf lokale Mockdaten zurück, wenn Supabase nicht konfiguriert ist.

import { useState, useEffect, useCallback } from 'react';
import { fetchEvents, fetchEventById, isSupabaseConfigured } from '../services/supabaseClient';

// Lokale Mockdaten als Fallback (werden aus OffroadEventsApp importiert)
let _mockEvents = null;
const getMockEvents = async () => {
    if (_mockEvents) return _mockEvents;
    // Dynamic import, um Zirkelabhängigkeit zu vermeiden
    const mod = await import('../data/mockEvents.js').catch(() => null);
    _mockEvents = mod?.mockEvents ?? [];
    return _mockEvents;
};

export function useEvents({ category, status } = {}) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isSupabaseConfigured()) {
                const data = await fetchEvents({ category, status });
                setEvents(data);
            } else {
                const mock = await getMockEvents();
                const filtered = mock.filter((e) => {
                    if (category && e.category !== category) return false;
                    if (status && e.status !== status) return false;
                    return true;
                });
                setEvents(filtered);
            }
        } catch (err) {
            console.error('[useEvents]', err);
            setError(err.message);
            const mock = await getMockEvents();
            setEvents(mock);
        } finally {
            setLoading(false);
        }
    }, [category, status]);

    useEffect(() => {
        load();
    }, [load]);

    return { events, loading, error, reload: load };
}

export function useEvent(id) {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        (async () => {
            try {
                if (isSupabaseConfigured()) {
                    const data = await fetchEventById(id);
                    setEvent(data);
                } else {
                    const mock = await getMockEvents();
                    setEvent(mock.find((e) => e.id === id) ?? null);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    return { event, loading, error };
}