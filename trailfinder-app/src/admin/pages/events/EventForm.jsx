// ─── TrailHub Admin – Event Form (Multi-Tab) ──────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { adminFetchEventById, adminCreateEvent, adminUpdateEvent, adminUploadEventImage, adminGenerateAiSummary } from '../../services/adminSupabase';
import { adminFetchOrganizers } from '../../services/adminSupabase';
import { CATEGORY_FIELDS, CATEGORIES, STATUS_OPTIONS, AI_PROMPT_TEMPLATES } from '../../utils/adminConfig';

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'basics',      label: '1. Basis' },
  { id: 'datetime',    label: '2. Datum & Zeit' },
  { id: 'location',    label: '3. Ort & Route' },
  { id: 'details',     label: '4. Details & Preis' },
  { id: 'descriptions',label: '5. Beschreibungen' },
  { id: 'media',       label: '6. Medien' },
  { id: 'seo',         label: '7. SEO' },
];

// ─── Default form values ──────────────────────────────────────────────────────
const DEFAULTS = {
  name: '', category: '', subcategory: '', status: 'upcoming',
  organizer_id: '', is_featured: false, is_new: false, has_changes: false,
  start_date: '', end_date: '',
  location: '', coordinates: '',
  price_value: '', beginner_friendly: false, difficulty: '',
  group_size: '',
  rallye_region: '', rallye_level: '', trip_type: '', trip_level: '',
  skill_level: '', bike_type: '', festival_type: '', bike_requirements: '',
  ai_summary_de: '', ai_summary_en: '', ai_summary_fr: '', ai_summary_nl: '',
  ai_prompt_de: AI_PROMPT_TEMPLATES.DE,
  ai_prompt_en: AI_PROMPT_TEMPLATES.EN,
  ai_prompt_fr: AI_PROMPT_TEMPLATES.FR,
  ai_prompt_nl: AI_PROMPT_TEMPLATES.NL,
  image: '',
  slug: '', event_url: '',
};

// ─── UI Components ────────────────────────────────────────────────────────────
function Field({ label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '', ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 placeholder:italic focus:outline-none focus:border-orange-500/60 transition-colors ${className}`}
      {...rest}
    />
  );
}

function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-sm focus:outline-none focus:border-orange-500/60 transition-colors ${value ? 'text-stone-200' : 'text-stone-600'} ${className}`}
    >
      {placeholder && <option value="" className="text-stone-500">{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value} className="text-stone-200 bg-stone-800">{o.label}</option>
      ))}
    </select>
  );
}

function Textarea({ value, onChange, placeholder, rows = 4, className = '' }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 placeholder:italic focus:outline-none focus:border-orange-500/60 transition-colors resize-y ${className}`}
    />
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-orange-500' : 'bg-stone-700'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-stone-300">{label}</span>
    </label>
  );
}

// ─── Image Upload with Preview ─────────────────────────────────────────────────
function ImageUpload({ value, onChange, label, onUpload, uploading }) {
  const inputRef = useRef();

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={value} onChange={onChange} placeholder="https://images.unsplash.com/..." />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm hover:bg-stone-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <span className="w-4 h-4 border border-stone-400 border-t-transparent rounded-full animate-spin block"/> : '↑ Upload'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files[0]) onUpload?.(e.target.files[0]); }} />
      </div>
      {value && (
        <div className="relative rounded-lg overflow-hidden border border-stone-700 bg-stone-800" style={{ maxWidth: 220 }}>
          <img src={value} alt={label} className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-400"
          >✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Mini Map ──────────────────────────────────────────────────────────────────
function CoordinateEditor({ value, onChange }) {
  const parsed = (() => {
    try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; }
  })();

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const lat = parsed?.lat ?? '';
  const lng = parsed?.lng ?? '';

  const handleChange = (field, val) => {
    const curr = parsed ?? {};
    const next = { ...curr, [field]: parseFloat(val) || val };
    onChange(JSON.stringify(next));
  };

  const staticMapUrl = lat && lng && mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+f97316(${lng},${lat})/${lng},${lat},10,0/400x180?access_token=${mapboxToken}`
    : null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-stone-500">Latitude</label>
          <Input
            value={lat}
            onChange={v => handleChange('lat', v)}
            placeholder="48.4634"
            type="text"
          />
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-xs text-stone-500">Longitude</label>
          <Input
            value={lng}
            onChange={v => handleChange('lng', v)}
            placeholder="8.4105"
            type="text"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-stone-500">JSON (direkt)</label>
        <Input
          value={typeof value === 'string' ? value : JSON.stringify(value ?? '')}
          onChange={onChange}
          placeholder='{"lat":48.4634,"lng":8.4105}'
        />
      </div>
      {staticMapUrl && (
        <img
          src={staticMapUrl}
          alt="Kartenvorschau"
          className="rounded-lg border border-stone-700 w-full max-w-[400px] h-[180px] object-cover"
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

// ─── Category-specific fields ─────────────────────────────────────────────────
function CategoryFields({ form, setField, cfg }) {
  if (!cfg) return null;

  return (
    <div className="space-y-4 pt-1">
      {cfg.showSubcategory && (
        <Field label="Subkategorie">
          <Select
            value={form.subcategory}
            onChange={v => setField('subcategory', v)}
            options={cfg.subcategoryOptions ?? []}
            placeholder="Wähle Subkategorie ▼"
          />
        </Field>
      )}
      {cfg.showRallyeRegion && (
        <Field label="Region">
          <Select
            value={form.rallye_region}
            onChange={v => setField('rallye_region', v)}
            options={cfg.rallyeRegionOptions ?? []}
            placeholder="Wähle Region ▼"
          />
        </Field>
      )}
      {cfg.showRallyeLevel && (
        <Field label="Level">
          <Select
            value={form.rallye_level}
            onChange={v => setField('rallye_level', v)}
            options={cfg.rallyeLevelOptions ?? []}
            placeholder="Wähle Level ▼"
          />
        </Field>
      )}
      {cfg.showTripType && (
        <Field label="Fahr-Typ">
          <Select
            value={form.trip_type}
            onChange={v => setField('trip_type', v)}
            options={cfg.tripTypeOptions ?? []}
            placeholder="Wähle Fahr-Typ ▼"
          />
        </Field>
      )}
      {cfg.showTripLevel && (
        <Field label="Level (Adventure)">
          <Select
            value={form.trip_level}
            onChange={v => setField('trip_level', v)}
            options={cfg.tripLevelOptions ?? []}
            placeholder="Wähle Level ▼"
          />
        </Field>
      )}
      {cfg.showSkillLevel && (
        <Field label="Skill-Level">
          <Select
            value={form.skill_level}
            onChange={v => setField('skill_level', v)}
            options={cfg.skillLevelOptions ?? []}
            placeholder="Wähle Level ▼"
          />
        </Field>
      )}
      {cfg.showBikeType && (
        <Field label="Bike-Typ">
          <Select
            value={form.bike_type}
            onChange={v => setField('bike_type', v)}
            options={cfg.bikeTypeOptions ?? []}
            placeholder="Wähle Bike-Typ ▼"
          />
        </Field>
      )}
      {cfg.showFestivalType && (
        <Field label="Festival-Typ">
          <Select
            value={form.festival_type}
            onChange={v => setField('festival_type', v)}
            options={cfg.festivalTypeOptions ?? []}
            placeholder="Wähle Festival-Typ ▼"
          />
        </Field>
      )}
      {cfg.showBikeRequirements && (
        <Field label="Bike-Anforderungen" hint="z.B. Enduro, Trail-Bike, Minimale PS">
          <Input
            value={form.bike_requirements}
            onChange={v => setField('bike_requirements', v)}
            placeholder="z.B. Enduro oder Trail-Bike"
          />
        </Field>
      )}
      {cfg.showGroupSize && (
        <Field label="Gruppengröße" hint="Anzahl Teilnehmer pro Gruppe">
          <Input
            value={form.group_size}
            onChange={v => setField('group_size', v)}
            placeholder="8"
            type="number"
            min={1}
          />
        </Field>
      )}
      {cfg.showDifficulty && (
        <Field label="Schwierigkeit (1-3)" hint="1 = Leicht, 2 = Mittel, 3 = Schwer">
          <Select
            value={form.difficulty}
            onChange={v => setField('difficulty', v)}
            options={[
              { value: '1', label: '1 – Leicht ★☆☆' },
              { value: '2', label: '2 – Mittel ★★☆' },
              { value: '3', label: '3 – Schwer ★★★' },
            ]}
            placeholder="Wähle Schwierigkeit"
          />
        </Field>
      )}
    </div>
  );
}

// ─── Main EventForm Component ─────────────────────────────────────────────────
export default function EventForm({ eventId, onNavigate, toast }) {
  const isNew = !eventId || eventId === 'new';
  const [activeTab, setActiveTab] = useState('basics');
  const [form, setFormState] = useState({ ...DEFAULTS });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [organizers, setOrganizers] = useState([]);
  const [aiLoading, setAiLoading] = useState({ DE: false, EN: false, FR: false, NL: false });
  const [imgUploading, setImgUploading] = useState(false);

  const setField = (key, val) => setFormState(f => ({ ...f, [key]: val }));

  // Calculate days between dates
  const daysBetween = (() => {
    if (!form.start_date || !form.end_date) return null;
    const d1 = new Date(form.start_date), d2 = new Date(form.end_date);
    const diff = Math.round((d2 - d1) / 86400000) + 1;
    return diff >= 1 ? diff : null;
  })();

  // Load organizers & event data
  useEffect(() => {
    adminFetchOrganizers({ perPage: 100 })
      .then(({ data }) => setOrganizers(data))
      .catch(() => {});

    if (!isNew) {
      setLoading(true);
      adminFetchEventById(eventId).then(event => {
        setFormState({
          ...DEFAULTS,
          ...event,
          coordinates: event.coordinates ? JSON.stringify(event.coordinates) : '',
        });
      }).catch(err => {
        toast?.error('Event konnte nicht geladen werden: ' + err.message);
      }).finally(() => setLoading(false));
    }
  }, [eventId]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!form.slug && form.name) {
      const slug = form.name.toLowerCase()
        .replace(/[äöüß]/g, c => ({ ä:'ae', ö:'oe', ü:'ue', ß:'ss' }[c] || c))
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setField('slug', slug);
    }
  }, [form.name]);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Name ist erforderlich';
    if (!form.category) e.category = 'Kategorie ist erforderlich';
    if (!form.start_date) e.start_date = 'Start-Datum ist erforderlich';
    if (!form.location?.trim()) e.location = 'Ort ist erforderlich';
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = 'End-Datum muss nach dem Start-Datum liegen';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast?.error('Bitte alle Pflichtfelder ausfüllen.');
      // Jump to first tab with errors
      if (errors.name || errors.category) setActiveTab('basics');
      else if (errors.start_date) setActiveTab('datetime');
      else if (errors.location) setActiveTab('location');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await adminCreateEvent(form);
        toast?.success('Event erfolgreich erstellt!');
      } else {
        await adminUpdateEvent(eventId, form);
        toast?.success('Event erfolgreich gespeichert!');
      }
      onNavigate('/admin/events');
    } catch (err) {
      toast?.error('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    setImgUploading(true);
    try {
      const url = await adminUploadEventImage(file, eventId ?? 'new');
      setField('image', url);
      toast?.success('Bild hochgeladen!');
    } catch (err) {
      toast?.error('Upload fehlgeschlagen: ' + err.message);
    } finally {
      setImgUploading(false);
    }
  };

  const handleGenerateAI = async (lang) => {
    setAiLoading(l => ({ ...l, [lang]: true }));
    try {
      const summary = await adminGenerateAiSummary(form, lang, form[`ai_prompt_${lang.toLowerCase()}`]);
      const key = `ai_summary_${lang.toLowerCase()}`;
      setField(key, summary);
      toast?.success(`KI-Zusammenfassung (${lang}) generiert!`);
    } catch (err) {
      toast?.error(`KI-Fehler (${lang}): ${err.message}`);
    } finally {
      setAiLoading(l => ({ ...l, [lang]: false }));
    }
  };


  const cfg = CATEGORY_FIELDS[form.category] ?? null;
  const categoryNamePlaceholder = cfg?.namePlaceholder ?? 'z.B. Black Forest Enduro 2026';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{isNew ? 'Neues Event erstellen' : 'Event bearbeiten'}</h1>
          {!isNew && <p className="text-stone-500 text-sm mt-1">ID: {eventId}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('/admin/events')}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {isNew ? 'Event erstellen' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-6 bg-stone-900 p-1 rounded-xl border border-stone-800">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 min-w-fit ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 space-y-5">

        {/* TAB 1: Basis */}
        {activeTab === 'basics' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Basis-Informationen</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Field label="Event-Name" required error={errors.name}
                  hint="Vollständiger Name des Events inkl. Jahr">
                  <Input
                    value={form.name}
                    onChange={v => setField('name', v)}
                    placeholder={categoryNamePlaceholder}
                  />
                </Field>
              </div>

              <Field label="Kategorie" required error={errors.category}>
                <Select
                  value={form.category}
                  onChange={v => {
                    setField('category', v);
                    setField('subcategory', '');
                    setField('rallye_region', '');
                    setField('rallye_level', '');
                    setField('trip_type', '');
                    setField('skill_level', '');
                    setField('festival_type', '');
                  }}
                  options={CATEGORIES}
                  placeholder="Wähle Kategorie ▼"
                />
              </Field>

              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={v => setField('status', v)}
                  options={STATUS_OPTIONS}
                  placeholder="Status wählen ▼"
                />
              </Field>

              <Field label="Organizer" hint="Veranstalter des Events">
                <Select
                  value={form.organizer_id}
                  onChange={v => setField('organizer_id', v)}
                  options={[
                    ...organizers.map(o => ({ value: o.id, label: o.name })),
                  ]}
                  placeholder="Wähle Organizer ▼"
                />
              </Field>

              <div className="flex flex-col gap-3 justify-end">
                <Toggle value={form.is_new} onChange={v => setField('is_new', v)} label='Als "NEU" markieren' />
                <Toggle value={form.is_featured} onChange={v => setField('is_featured', v)} label="Featured Event (★)" />
                <Toggle value={form.beginner_friendly} onChange={v => setField('beginner_friendly', v)} label="Einsteiger-geeignet" />
              </div>
            </div>

            {/* Category-specific fields */}
            {form.category && (
              <>
                <div className="border-t border-stone-800 pt-4">
                  <h3 className="text-stone-300 text-sm font-medium mb-3 text-orange-400">
                    {CATEGORIES.find(c => c.value === form.category)?.label ?? ''}-spezifische Felder
                  </h3>
                  <CategoryFields form={form} setField={setField} cfg={cfg} />
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: Datum & Zeit */}
        {activeTab === 'datetime' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Datum & Zeit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Start-Datum" required error={errors.start_date} hint="Format: YYYY-MM-DD">
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={v => setField('start_date', v)}
                  placeholder="2026-08-14"
                />
              </Field>
              <Field label="End-Datum" error={errors.end_date} hint="Leer lassen für eintägige Events">
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={v => setField('end_date', v)}
                  placeholder="2026-08-22"
                />
              </Field>
            </div>
            {daysBetween !== null && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-orange-300 text-sm font-medium">Dauer: {daysBetween} Tag{daysBetween !== 1 ? 'e' : ''}</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Ort & Route */}
        {activeTab === 'location' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Ort & Route</h2>
            <Field label="Ort / Location" required error={errors.location} hint="Stadt, Land">
              <Input
                value={form.location}
                onChange={v => setField('location', v)}
                placeholder="z.B. Freudenstadt, Deutschland"
              />
            </Field>
            <Field label="Koordinaten" hint="Lat/Lng – auf Karte klicken oder JSON eingeben">
              <CoordinateEditor value={form.coordinates} onChange={v => setField('coordinates', v)} />
            </Field>
          </div>
        )}

        {/* TAB 4: Details & Preis */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Details & Preis</h2>
            <Field label="Preis (€)" hint="Nur Zahl ohne €-Zeichen (z.B. 185 oder 49.90)">
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-sm">€</span>
                <Input
                  type="number"
                  value={form.price_value}
                  onChange={v => setField('price_value', v)}
                  placeholder="185"
                  className="pl-7"
                  min={0}
                  step={0.01}
                />
              </div>
            </Field>
            <div className="border-t border-stone-800 pt-4">
              <h3 className="text-stone-400 text-sm font-medium mb-3">Flags</h3>
              <div className="flex flex-wrap gap-4">
                <Toggle value={form.has_changes} onChange={v => setField('has_changes', v)} label="Änderungen vorhanden" />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Mehrsprachige Beschreibungen */}
        {activeTab === 'descriptions' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Mehrsprachige Beschreibungen</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {[
                { code: 'DE', label: 'Deutsch' },
                { code: 'EN', label: 'English' },
                { code: 'FR', label: 'Français' },
                { code: 'NL', label: 'Nederlands' },
              ].map(({ code, label }) => (
                <div key={code} className="bg-stone-800/40 rounded-xl border border-stone-700 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-stone-700 text-stone-200 text-sm font-bold border border-stone-600">{code}</span>
                    <span className="text-stone-300 text-sm font-medium">{label}</span>
                  </div>

                  <Field label="Beschreibung" hint={`→ ai_summary_${code.toLowerCase()}`}>
                    <Textarea
                      value={form[`ai_summary_${code.toLowerCase()}`]}
                      onChange={v => setField(`ai_summary_${code.toLowerCase()}`, v)}
                      placeholder={
                        code === 'DE' ? 'Manuell eingeben oder per KI generieren...' :
                        code === 'EN' ? 'Enter manually or generate via AI...' :
                        code === 'FR' ? 'Saisir manuellement ou générer via IA...' :
                        'Handmatig invoeren of genereren via AI...'
                      }
                      rows={5}
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={() => handleGenerateAI(code)}
                    disabled={aiLoading[code]}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/30 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading[code] ? <span className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin"/> : '✨'}
                    KI-Zusammenfassung
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Medien */}
        {activeTab === 'media' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">Medien</h2>

            <Field label="Hauptbild" hint="URL oder Upload (800×600px empfohlen, JPG/PNG/WebP)">
              <ImageUpload
                value={form.image}
                onChange={v => setField('image', v)}
                label="Hauptbild"
                onUpload={handleImageUpload}
                uploading={imgUploading}
              />
            </Field>

          </div>
        )}

        {/* TAB 7: SEO */}
        {activeTab === 'seo' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">SEO & Metadata</h2>
            <Field label="Slug (URL)" hint="Automatisch aus Name generiert – kann manuell angepasst werden">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-sm flex-shrink-0">/events/</span>
                <Input
                  value={form.slug}
                  onChange={v => setField('slug', v)}
                  placeholder="black-forest-enduro-2026"
                />
              </div>
            </Field>
            <Field label="Event-URL" hint="Link zur offiziellen Event-Website">
              <Input
                value={form.event_url}
                onChange={v => setField('event_url', v)}
                placeholder="https://enduro-events.eu/black-forest"
              />
            </Field>
          </div>
        )}
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between mt-6 p-4 bg-stone-900 rounded-xl border border-stone-800">
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          {Object.keys(errors).length > 0 && (
            <span className="text-red-400 flex items-center gap-1">
              <span>⚠</span> {Object.keys(errors).length} Fehler – bitte korrigieren
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('/admin/events')}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {isNew ? 'Event erstellen' : 'Änderungen speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}