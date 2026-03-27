import React, { useState, useEffect } from 'react';
import { useTranslation, mockEvents, organizers } from '../OffroadEventsApp';

// Default empty event template
const emptyEvent = {
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    coordinates: { lat: 50.0, lng: 7.0 },
    price: '',
    priceValue: 0,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    status: 'upcoming',
    category: 'trail-adventures',
    subcategory: null,
    difficulty: null,
    beginnerFriendly: false,
    tripType: null,
    skillLevel: null,
    isNew: true,
    hasChanges: false,
    organizerId: '',
    registeredFriends: [],
    // NEW: multiple links per event
    links: [],
    description: '',
};

// Categories available for event creation
const CATEGORIES = [
    { id: 'trail-adventures', label: 'Trail Adventures' },
    { id: 'rallyes', label: 'Rallyes' },
    { id: 'adventure-trips', label: 'Adventure Trips' },
    { id: 'skills-camps', label: 'Skills Camps' },
    { id: 'offroad-festivals', label: 'Offroad Festivals' },
];

const DIFFICULTIES = [
    { value: null, label: 'Keine Angabe' },
    { value: 1, label: '⛑ Leicht' },
    { value: 2, label: '⛑⛑ Mittel' },
    { value: 3, label: '⛑⛑⛑ Schwer' },
];

export default function EventEditor({ onClose }) {
    const { t } = useTranslation();

    // Load events from localStorage or fall back to mockEvents
    const [events, setEvents] = useState(() => {
        try {
            const saved = localStorage.getItem('trailfinder_events');
            return saved ? JSON.parse(saved) : [...mockEvents];
        } catch {
            return [...mockEvents];
        }
    });

    // Currently selected event for editing (null = list view)
    const [editingEvent, setEditingEvent] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Persist events to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('trailfinder_events', JSON.stringify(events));
    }, [events]);

    // ─── List View ─────────────────────────────────────────────
    const handleEdit = (event) => {
        setEditingEvent({ ...event, links: event.links || [] });
        setIsCreating(false);
    };

    const handleCreateNew = () => {
        const maxId = events.reduce((max, e) => Math.max(max, e.id), 0);
        setEditingEvent({ ...emptyEvent, id: maxId + 1 });
        setIsCreating(true);
    };

    const handleDelete = (eventId) => {
        if (confirm('Event wirklich löschen?')) {
            setEvents(prev => prev.filter(e => e.id !== eventId));
        }
    };

    // ─── Form Save ─────────────────────────────────────────────
    const handleSave = (updatedEvent) => {
        setEvents(prev => {
            const exists = prev.find(e => e.id === updatedEvent.id);
            if (exists) {
                return prev.map(e => e.id === updatedEvent.id ? updatedEvent : e);
            }
            return [...prev, updatedEvent];
        });
        setEditingEvent(null);
        setIsCreating(false);
        setSaveMessage(isCreating ? 'Event erstellt!' : 'Event gespeichert!');
        setTimeout(() => setSaveMessage(''), 3000);
    };

    // ─── Render ────────────────────────────────────────────────
    if (editingEvent) {
        return (
            <EventForm
                event={editingEvent}
                isNew={isCreating}
                onSave={handleSave}
                onCancel={() => { setEditingEvent(null); setIsCreating(false); }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 pt-20 px-4 pb-12">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Event Editor</h1>
                        <p className="text-stone-400 mt-1">Events erstellen, bearbeiten und Links verwalten</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCreateNew}
                            className="px-5 py-2.5 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Neues Event
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-stone-800 text-stone-300 rounded-xl font-medium hover:bg-stone-700 transition-all"
                            >
                                Schließen
                            </button>
                        )}
                    </div>
                </div>

                {/* Save toast */}
                {saveMessage && (
                    <div className="mb-4 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {saveMessage}
                    </div>
                )}

                {/* Event List */}
                <div className="space-y-3">
                    {events.map(event => (
                        <div
                            key={event.id}
                            className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex items-center gap-4 hover:border-stone-700 transition-colors group"
                        >
                            {/* Image */}
                            <img
                                src={event.image}
                                alt={event.name}
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-semibold truncate">{event.name}</h3>
                                    {event.isNew && (
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">NEU</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-stone-400 mt-1">
                                    <span>{event.startDate || 'Kein Datum'}</span>
                                    <span>•</span>
                                    <span>{event.location || 'Kein Ort'}</span>
                                    <span>•</span>
                                    <span className="text-amber-500/70">{event.category}</span>
                                    {event.links && event.links.length > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="text-sky-400/70">{event.links.length} Link{event.links.length !== 1 ? 's' : ''}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleEdit(event)}
                                    className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all"
                                    title="Bearbeiten"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(event.id)}
                                    className="p-2 rounded-lg bg-stone-800 hover:bg-red-900/50 text-stone-300 hover:text-red-400 transition-all"
                                    title="Löschen"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════
//  EventForm – Create / Edit an event with multi-link support
// ═══════════════════════════════════════════════════════════════
function EventForm({ event, isNew, onSave, onCancel }) {
    const [form, setForm] = useState({ ...event });

    const update = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // ─── Link management ──────────────────────────────────────
    const addLink = () => {
        setForm(prev => ({
            ...prev,
            links: [...(prev.links || []), { label: '', url: '' }],
        }));
    };

    const updateLink = (index, field, value) => {
        setForm(prev => ({
            ...prev,
            links: prev.links.map((link, i) =>
                i === index ? { ...link, [field]: value } : link
            ),
        }));
    };

    const removeLink = (index) => {
        setForm(prev => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Parse priceValue from price string
        const priceValue = parseFloat(form.price?.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
        onSave({ ...form, priceValue });
    };

    return (
        <div className="min-h-screen bg-stone-950 pt-20 px-4 pb-12">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-white">
                        {isNew ? 'Neues Event erstellen' : `Event bearbeiten: ${form.name}`}
                    </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ─── Basic Info ────────────────────────────────── */}
                    <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Grundinformationen
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-stone-400 mb-1">Event Name *</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => update('name', e.target.value)}
                                    required
                                    placeholder="z.B. Eifel Adventure Rally"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-stone-400 mb-1">Beschreibung</label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={e => update('description', e.target.value)}
                                    rows={3}
                                    placeholder="Kurze Beschreibung des Events..."
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all resize-none"
                                />
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Startdatum *</label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    onChange={e => update('startDate', e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Enddatum</label>
                                <input
                                    type="date"
                                    value={form.endDate || ''}
                                    onChange={e => update('endDate', e.target.value)}
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Ort</label>
                                <input
                                    type="text"
                                    value={form.location}
                                    onChange={e => update('location', e.target.value)}
                                    placeholder="z.B. Nürburgring, Deutschland"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-1">Preis</label>
                                <input
                                    type="text"
                                    value={form.price}
                                    onChange={e => update('price', e.target.value)}
                                    placeholder="z.B. €189"
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                            </div>

                            {/* Image URL */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-stone-400 mb-1">Bild URL</label>
                                <input
                                    type="url"
                                    value={form.image}
                                    onChange={e => update('image', e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                />
                                {form.image && (
                                    <img
                                        src={form.image}
                                        alt="Preview"
                                        className="mt-2 w-full h-32 object-cover rounded-lg border border-stone-700"
                                        onError={e => { e.target.style.display = 'none'; }}
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    {/* ─── Category & Difficulty ─────────────────────── */}
                    <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            Kategorie & Schwierigkeit
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">Kategorie</label>
                                <div className="space-y-2">
                                    {CATEGORIES.map(cat => (
                                        <label
                                            key={cat.id}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${form.category === cat.id
                                                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                                    : 'bg-stone-800 border border-stone-700 text-stone-300 hover:border-stone-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="category"
                                                value={cat.id}
                                                checked={form.category === cat.id}
                                                onChange={e => update('category', e.target.value)}
                                                className="sr-only"
                                            />
                                            <span className="text-sm">{cat.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div>
                                <label className="block text-sm font-medium text-stone-400 mb-2">Schwierigkeit</label>
                                <div className="space-y-2">
                                    {DIFFICULTIES.map(diff => (
                                        <label
                                            key={diff.label}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${form.difficulty === diff.value
                                                    ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
                                                    : 'bg-stone-800 border border-stone-700 text-stone-300 hover:border-stone-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="difficulty"
                                                checked={form.difficulty === diff.value}
                                                onChange={() => update('difficulty', diff.value)}
                                                className="sr-only"
                                            />
                                            <span className="text-sm">{diff.label}</span>
                                        </label>
                                    ))}
                                </div>

                                {/* Beginner Friendly */}
                                <label className="flex items-center gap-3 mt-4 px-3 py-2 rounded-lg cursor-pointer bg-stone-800 border border-stone-700 text-stone-300 hover:border-stone-600 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={form.beginnerFriendly}
                                        onChange={e => update('beginnerFriendly', e.target.checked)}
                                        className="w-4 h-4 accent-amber-500"
                                    />
                                    <span className="text-sm">Anfängerfreundlich</span>
                                </label>
                            </div>

                            {/* Organizer */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-stone-400 mb-1">Veranstalter</label>
                                <select
                                    value={form.organizerId || ''}
                                    onChange={e => update('organizerId', e.target.value || null)}
                                    className="w-full px-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                                >
                                    <option value="">Keiner zugewiesen</option>
                                    {Object.values(organizers).map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {/* ─── Links (Multi-Link Support) ────────────────── */}
                    <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                Links
                                {form.links?.length > 0 && (
                                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full ml-1">{form.links.length}</span>
                                )}
                            </h2>
                            <button
                                type="button"
                                onClick={addLink}
                                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Link hinzufügen
                            </button>
                        </div>

                        {(!form.links || form.links.length === 0) ? (
                            <div className="text-center py-8 text-stone-500">
                                <svg className="w-10 h-10 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                                <p className="text-sm">Noch keine Links hinzugefügt</p>
                                <p className="text-xs mt-1 text-stone-600">Links zu Veranstalter-Seiten, Anmeldung, etc.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {form.links.map((link, idx) => (
                                    <div key={idx} className="flex items-start gap-3 p-3 bg-stone-800/50 rounded-xl border border-stone-700/50">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                value={link.label}
                                                onChange={e => updateLink(idx, 'label', e.target.value)}
                                                placeholder="Label (z.B. Anmeldung, Info, Programm)"
                                                className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500 focus:outline-none focus:border-amber-500/50 transition-all"
                                            />
                                            <input
                                                type="url"
                                                value={link.url}
                                                onChange={e => updateLink(idx, 'url', e.target.value)}
                                                placeholder="https://..."
                                                className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-500 focus:outline-none focus:border-amber-500/50 transition-all"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeLink(idx)}
                                            className="p-2 rounded-lg hover:bg-red-900/30 text-stone-500 hover:text-red-400 transition-all flex-shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ─── Actions ───────────────────────────────────── */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 bg-stone-800 text-stone-300 rounded-xl font-medium hover:bg-stone-700 transition-all"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-2.5 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {isNew ? 'Event erstellen' : 'Speichern'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
