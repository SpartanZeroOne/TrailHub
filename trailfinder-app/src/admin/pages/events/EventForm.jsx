// ─── TrailHub Admin – Event Form (Multi-Tab) ──────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchEventById, adminCreateEvent, adminUpdateEvent, adminUploadEventImage, adminGenerateAiSummary } from '../../services/adminSupabase';
import { adminFetchOrganizers } from '../../services/adminSupabase';
import { CATEGORY_FIELDS, CATEGORIES, STATUS_OPTIONS, AI_PROMPT_TEMPLATES } from '../../utils/adminConfig';

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TAB_IDS = ['basics', 'datetime', 'location', 'details', 'descriptions', 'media', 'seo'];

// ─── Default form values ──────────────────────────────────────────────────────
const DEFAULTS = {
  name: '', category: '', subcategory: '', status: 'upcoming',
  organizer_id: '', is_featured: false, is_new: false, has_changes: false,
  is_flexible_date: false, booking_type: 'fixed', flexible_date_info: '',
  start_date: '', end_date: '',
  event_dates: [],
  location: '', coordinates: '',
  price_value: '', is_free: false, beginner_friendly: false, difficulty: '',
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
  const { t } = useTranslation();
  if (!cfg) return null;

  return (
    <div className="space-y-4 pt-1">
      {cfg.showSubcategory && (
        <Field label={t('eventForm.subcategory')}>
          <Select
            value={form.subcategory}
            onChange={v => setField('subcategory', v)}
            options={cfg.subcategoryOptions ?? []}
            placeholder={t('eventForm.subcategorySelect')}
          />
        </Field>
      )}
      {cfg.showRallyeRegion && (
        <Field label={t('eventForm.region')}>
          <Select
            value={form.rallye_region}
            onChange={v => setField('rallye_region', v)}
            options={cfg.rallyeRegionOptions ?? []}
            placeholder={t('eventForm.regionSelect')}
          />
        </Field>
      )}
      {cfg.showRallyeLevel && (
        <Field label={t('eventForm.level')}>
          <Select
            value={form.rallye_level}
            onChange={v => setField('rallye_level', v)}
            options={cfg.rallyeLevelOptions ?? []}
            placeholder={t('eventForm.levelSelect')}
          />
        </Field>
      )}
      {cfg.showTripType && (
        <Field label={t('eventForm.driveType')}>
          <Select
            value={form.trip_type}
            onChange={v => setField('trip_type', v)}
            options={cfg.tripTypeOptions ?? []}
            placeholder={t('eventForm.driveTypeSelect')}
          />
        </Field>
      )}
      {cfg.showTripLevel && (
        <Field label={t('eventForm.level')}>
          <Select
            value={form.trip_level}
            onChange={v => setField('trip_level', v)}
            options={cfg.tripLevelOptions ?? []}
            placeholder={t('eventForm.levelSelect')}
          />
        </Field>
      )}
      {cfg.showSkillLevel && (
        <Field label={t('eventForm.skillLevel')}>
          <Select
            value={form.skill_level}
            onChange={v => setField('skill_level', v)}
            options={cfg.skillLevelOptions ?? []}
            placeholder={t('eventForm.levelSelect')}
          />
        </Field>
      )}
      {cfg.showBikeType && (
        <Field label={t('eventForm.bikeType')}>
          <Select
            value={form.bike_type}
            onChange={v => setField('bike_type', v)}
            options={cfg.bikeTypeOptions ?? []}
            placeholder={t('eventForm.bikeTypeSelect')}
          />
        </Field>
      )}
      {cfg.showFestivalType && (
        <Field label={t('eventForm.festivalType')}>
          <Select
            value={form.festival_type}
            onChange={v => setField('festival_type', v)}
            options={cfg.festivalTypeOptions ?? []}
            placeholder={t('eventForm.festivalTypeSelect')}
          />
        </Field>
      )}
      {cfg.showBikeRequirements && (
        <Field label={t('eventForm.bikeRequirements')}>
          <Input
            value={form.bike_requirements}
            onChange={v => setField('bike_requirements', v)}
            placeholder="z.B. Enduro oder Trail-Bike"
          />
        </Field>
      )}
      {cfg.showGroupSize && (
        <Field label={t('eventForm.groupSize')} hint={t('eventForm.groupSizeHint')}>
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
        <Field label={t('eventForm.difficultySelect')} hint={t('eventForm.difficultyHint')}>
          <Select
            value={form.difficulty}
            onChange={v => setField('difficulty', v)}
            options={[
              { value: '1', label: t('eventForm.difficulty1') },
              { value: '2', label: t('eventForm.difficulty2') },
              { value: '3', label: t('eventForm.difficulty3') },
            ]}
            placeholder={t('eventForm.difficultySelect')}
          />
        </Field>
      )}
    </div>
  );
}

// ─── Main EventForm Component ─────────────────────────────────────────────────
export default function EventForm({ eventId, onNavigate, toast }) {
  const { t } = useTranslation();
  const isNew = !eventId || eventId === 'new';
  const [activeTab, setActiveTab] = useState('basics');
  const [form, setFormState] = useState({ ...DEFAULTS });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [organizers, setOrganizers] = useState([]);
  const [aiLoading, setAiLoading] = useState({ DE: false, EN: false, FR: false, NL: false });
  const [imgUploading, setImgUploading] = useState(false);
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const setField = (key, val) => setFormState(f => ({ ...f, [key]: val }));

  // ─── Multi-date helpers (Skills-Camps) ──────────────────────────────────────
  const addEventDate = () => {
    if (!tempStartDate || !tempEndDate) return;
    if (tempEndDate < tempStartDate) return;
    const isDuplicate = (form.event_dates ?? []).some(
      d => d.start_date === tempStartDate && d.end_date === tempEndDate
    );
    if (isDuplicate) return;
    setFormState(f => {
      const newDates = [...(f.event_dates ?? []), { start_date: tempStartDate, end_date: tempEndDate }];
      // Auto-populate primary dates from the first entry
      const updates = { event_dates: newDates };
      if (!f.start_date) updates.start_date = tempStartDate;
      if (!f.end_date) updates.end_date = tempEndDate;
      return { ...f, ...updates };
    });
    setTempStartDate('');
    setTempEndDate('');
  };

  const removeEventDate = (index) => {
    setFormState(f => ({
      ...f,
      event_dates: (f.event_dates ?? []).filter((_, i) => i !== index),
    }));
  };

  const formatEventDateRange = (start, end) => {
    if (!start) return '';
    const s = new Date(start + 'T00:00:00');
    const e = end ? new Date(end + 'T00:00:00') : null;
    const days = e ? Math.round((e - s) / 86400000) + 1 : 1;
    const locale = 'de-DE';
    if (!e || start === end) return `${s.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })} (1 Tag)`;
    const sStr = s.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
    const eStr = e.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    return `${sStr} – ${eStr} (${days} Tag${days !== 1 ? 'e' : ''})`;
  };

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
          event_dates: Array.isArray(event.event_dates) ? event.event_dates : [],
        });
      }).catch(err => {
        toast?.error(t('eventForm.errorLoad', { msg: err.message }));
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
    if (!form.name?.trim()) e.name = t('eventForm.errName');
    if (!form.category) e.category = t('eventForm.errCategory');
    if (!form.is_flexible_date && !form.start_date) e.start_date = t('eventForm.errStartDate');
    if (!form.location?.trim()) e.location = t('eventForm.errLocation');
    if (!form.is_flexible_date && form.end_date && form.start_date && form.end_date < form.start_date) {
      e.end_date = t('eventForm.errEndDate');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast?.error(t('eventForm.errorRequired'));
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
        toast?.success(t('eventForm.successCreate'));
      } else {
        await adminUpdateEvent(eventId, form);
        toast?.success(t('eventForm.successSave'));
      }
      onNavigate('/admin/events');
    } catch (err) {
      toast?.error(t('eventForm.errorLoad', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file) => {
    setImgUploading(true);
    try {
      const url = await adminUploadEventImage(file, eventId ?? 'new');
      setField('image', url);
      toast?.success(t('eventForm.successImageUpload'));
    } catch (err) {
      toast?.error(t('eventForm.errorImageUpload', { msg: err.message }));
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
      toast?.success(t('eventForm.successAi', { lang }));
    } catch (err) {
      toast?.error(t('eventForm.errAi', { lang, msg: err.message }));
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
          <h1 className="text-2xl font-bold text-stone-100">{isNew ? t('eventForm.titleNew') : t('eventForm.titleEdit')}</h1>
          {!isNew && <p className="text-stone-500 text-sm mt-1">{t('eventForm.idLabel')} {eventId}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('/admin/events')}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {isNew ? t('eventForm.saveCreate') : t('eventForm.saveEdit')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap mb-6 bg-stone-900 p-1 rounded-xl border border-stone-800">
        {TAB_IDS.map((id, idx) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 min-w-fit ${
              activeTab === id
                ? 'bg-orange-500 text-white shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            {t(`eventForm.tab${idx + 1}`)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 space-y-5">

        {/* TAB 1: Basis */}
        {activeTab === 'basics' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionBasis')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Field label={t('eventForm.eventName')} required error={errors.name}
                  hint={t('eventForm.eventNameHint')}>
                  <Input
                    value={form.name}
                    onChange={v => setField('name', v)}
                    placeholder={categoryNamePlaceholder}
                  />
                </Field>
              </div>

              <Field label={t('common.category')} required error={errors.category}>
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
                  placeholder={t('eventForm.categoryHint')}
                />
              </Field>

              <Field label={t('common.status')}>
                <Select
                  value={form.status}
                  onChange={v => setField('status', v)}
                  options={STATUS_OPTIONS}
                  placeholder={t('eventForm.statusHint')}
                />
              </Field>

              <Field label={t('common.organizer')} hint={t('eventForm.organizerHint')}>
                <Select
                  value={form.organizer_id}
                  onChange={v => setField('organizer_id', v)}
                  options={[
                    ...organizers.map(o => ({ value: o.id, label: o.name })),
                  ]}
                  placeholder={t('eventForm.organizerSelect')}
                />
              </Field>

              <div className="flex flex-col gap-3 justify-end">
                <Toggle value={form.is_new} onChange={v => setField('is_new', v)} label={t('eventForm.markAsNew')} />
                <Toggle value={form.is_featured} onChange={v => setField('is_featured', v)} label={t('eventForm.featuredEvent')} />
                <Toggle value={form.beginner_friendly} onChange={v => setField('beginner_friendly', v)} label={t('eventForm.beginnerFriendly')} />
              </div>
            </div>

            {/* Category-specific fields */}
            {form.category && (
              <>
                <div className="border-t border-stone-800 pt-4">
                  <h3 className="text-stone-300 text-sm font-medium mb-3 text-orange-400">
                    {CATEGORIES.find(c => c.value === form.category)?.label ?? ''} {t('eventForm.specificFields')}
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
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionDateTime')}</h2>

            {/* Flexible date toggle */}
            <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-300">{t('eventForm.flexibleDate')}</p>
                <p className="text-xs text-stone-500 mt-0.5">{t('eventForm.flexibleDateHint')}</p>
              </div>
              <Toggle
                value={form.is_flexible_date}
                onChange={v => {
                  setFormState(f => ({
                    ...f,
                    is_flexible_date: v,
                    booking_type: v ? 'flexible' : 'fixed',
                    ...(v ? { start_date: null, end_date: null } : {}),
                  }));
                }}
                label=""
              />
            </div>

            {form.is_flexible_date ? (
              <Field label={t('eventForm.bookingInstructions')} hint={t('eventForm.bookingInstructionsHint')}>
                <Input
                  value={form.flexible_date_info}
                  onChange={v => setField('flexible_date_info', v)}
                  placeholder={t('eventForm.bookingInstructionsPlaceholder')}
                />
              </Field>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label={t('eventForm.startDate')} required error={errors.start_date} hint={t('eventForm.startDateHint')}>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={v => setField('start_date', v)}
                  placeholder={t('eventForm.startDatePlaceholder')}
                />
              </Field>
              <Field label={t('eventForm.endDate')} error={errors.end_date} hint={t('eventForm.endDateHint')}>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={v => setField('end_date', v)}
                  placeholder="2026-08-22"
                />
              </Field>
            </div>
            )}
            {!form.is_flexible_date && daysBetween !== null && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-orange-300 text-sm font-medium">{t('eventForm.duration', { days: daysBetween })}</span>
              </div>
            )}

            {/* ── Verfügbare Termine (Skills-Camps & Adventure Trips) ── */}
            {!form.is_flexible_date && (form.category === 'skills-camps' || form.category === 'adventure-trips') && (
              <div className="mt-2 p-5 rounded-xl border border-orange-500/20 bg-orange-500/5 space-y-4">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <h3 className="text-stone-200 font-semibold">{t('eventForm.availableDates')}</h3>
                  {(form.event_dates ?? []).length > 0 && (
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-xs font-medium border border-orange-500/30">
                      {form.event_dates.length} Termin{form.event_dates.length !== 1 ? 'e' : ''}
                    </span>
                  )}
                </div>

                {/* Add date row */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-400">Start-Datum</label>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={e => setTempStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-stone-400">End-Datum</label>
                    <input
                      type="date"
                      value={tempEndDate}
                      min={tempStartDate || undefined}
                      onChange={e => setTempEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-orange-500/60 transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addEventDate}
                    disabled={!tempStartDate || !tempEndDate || tempEndDate < tempStartDate}
                    className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {t('eventForm.addDate')}
                  </button>
                </div>

                {/* Date list */}
                <div className="space-y-2">
                  {(form.event_dates ?? []).length === 0 ? (
                    <p className="text-stone-500 text-sm py-2 text-center">{t('eventForm.noDates')}</p>
                  ) : (
                    (form.event_dates ?? [])
                      .slice()
                      .sort((a, b) => a.start_date.localeCompare(b.start_date))
                      .map((date, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-3 rounded-lg bg-stone-800 border border-stone-700 group"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span className="text-stone-200 text-sm">
                              {formatEventDateRange(date.start_date, date.end_date)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEventDate(
                              (form.event_dates ?? []).indexOf(date)
                            )}
                            className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs transition-all"
                          >
                            {t('eventForm.removeDate')}
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <p className="text-xs text-stone-600">
                  {t('eventForm.dateNote')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Ort & Route */}
        {activeTab === 'location' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionLocation')}</h2>
            <Field label={t('eventForm.locationLabel')} required error={errors.location} hint={t('eventForm.locationHint')}>
              <Input
                value={form.location}
                onChange={v => setField('location', v)}
                placeholder={t('eventForm.locationPlaceholder')}
              />
            </Field>
            <Field label={t('eventForm.coordinates')} hint={t('eventForm.coordinatesHint')}>
              <CoordinateEditor value={form.coordinates} onChange={v => setField('coordinates', v)} />
            </Field>
          </div>
        )}

        {/* TAB 4: Details & Preis */}
        {activeTab === 'details' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionDetails')}</h2>
            <div className="flex items-start gap-6">
              <Field label={t('eventForm.priceLabel')} hint={t('eventForm.priceHint')}>
                <div className="relative max-w-xs">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm transition-colors ${form.is_free ? 'text-stone-600' : 'text-stone-500'}`}>€</span>
                  <Input
                    type="number"
                    value={form.is_free ? '' : form.price_value}
                    onChange={v => setField('price_value', v)}
                    placeholder={form.is_free ? '—' : '185'}
                    className={`pl-7 ${form.is_free ? 'opacity-40 pointer-events-none' : ''}`}
                    disabled={form.is_free}
                    min={0}
                    step={0.01}
                  />
                </div>
              </Field>
              <div className="pt-7">
                <Toggle
                  value={form.is_free}
                  onChange={v => {
                    setField('is_free', v);
                    if (v) setField('price_value', '');
                  }}
                  label={t('common.free')}
                />
              </div>
            </div>
            <div className="border-t border-stone-800 pt-4">
              <h3 className="text-stone-400 text-sm font-medium mb-3">{t('eventForm.flagsSection')}</h3>
              <div className="flex flex-wrap gap-4">
                <Toggle value={form.has_changes} onChange={v => setField('has_changes', v)} label={t('eventForm.hasChanges')} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Mehrsprachige Beschreibungen */}
        {activeTab === 'descriptions' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionDescriptions')}</h2>
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

                  <Field label={t('eventForm.descriptionLabel')} hint={`→ ai_summary_${code.toLowerCase()}`}>
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
                    {t('eventForm.aiButton')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Medien */}
        {activeTab === 'media' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionMedia')}</h2>

            <Field label={t('eventForm.mainImage')} hint={t('eventForm.mainImageHint')}>
              <ImageUpload
                value={form.image}
                onChange={v => setField('image', v)}
                label={t('eventForm.mainImage')}
                onUpload={handleImageUpload}
                uploading={imgUploading}
              />
            </Field>

          </div>
        )}

        {/* TAB 7: SEO */}
        {activeTab === 'seo' && (
          <div className="space-y-5">
            <h2 className="text-stone-200 font-semibold text-lg border-b border-stone-800 pb-3">{t('eventForm.sectionSeo')}</h2>
            <Field label={t('eventForm.slug')} hint={t('eventForm.slugHint')}>
              <div className="flex items-center gap-2">
                <span className="text-stone-500 text-sm flex-shrink-0">/events/</span>
                <Input
                  value={form.slug}
                  onChange={v => setField('slug', v)}
                  placeholder="black-forest-enduro-2026"
                />
              </div>
            </Field>
            <Field label={t('eventForm.eventUrl')} hint={t('eventForm.eventUrlHint')}>
              <Input
                value={form.event_url}
                onChange={v => setField('event_url', v)}
                placeholder={t('eventForm.eventUrlPlaceholder')}
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
              {t('eventForm.errorsCount', { count: Object.keys(errors).length })}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('/admin/events')}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {isNew ? t('eventForm.saveCreate') : t('eventForm.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
}