// ─── TrailHub Admin – Organizer Form ──────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchOrganizerById, adminCreateOrganizer, adminUpdateOrganizer } from '../../services/adminSupabase';
import { supabase } from '../../../services/supabaseClient';

const DEFAULTS = {
  id: '', name: '', email: '', phone: '', website: '',
  logo: '', logo_bg_color: 'black', description: '', verified: false, status: 'active',
};

function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-300">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 placeholder:italic focus:outline-none focus:border-orange-500/60 transition-colors"
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

export default function OrganizerForm({ organizerId, onNavigate, toast }) {
  const { t } = useTranslation();
  const isNew = !organizerId || organizerId === 'new';
  const [form, setFormState] = useState({ ...DEFAULTS });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileRef = useRef();

  const setField = (k, v) => setFormState(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      adminFetchOrganizerById(organizerId)
        .then(data => setFormState({ ...DEFAULTS, ...data }))
        .catch(err => toast?.error(t('organizerForm.errorLoad', { msg: err.message })))
        .finally(() => setLoading(false));
    }
  }, [organizerId]);

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = t('eventForm.errName');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (isNew && !payload.id?.trim()) delete payload.id;
      else if (isNew) payload.id = payload.id.trim().toLowerCase().replace(/\s+/g, '-');

      if (isNew) await adminCreateOrganizer(payload);
      else await adminUpdateOrganizer(organizerId, payload);
      toast?.success(isNew ? t('organizerForm.successCreate') : t('organizerForm.successSave'));
      onNavigate('/admin/organizers');
    } catch (err) {
      toast?.error(t('organizerForm.errorSave', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    if (!file.type.startsWith('image/')) { toast?.error(t('organizerForm.errorLogoType')); return; }
    if (file.size > 5 * 1024 * 1024) { toast?.error(t('organizerForm.errorLogoSize')); return; }
    const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    setLogoUploading(true);
    try {
      const fileName = `organizers/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('organizer-logos').upload(fileName, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('organizer-logos').getPublicUrl(fileName);
      setField('logo', data.publicUrl);
      toast?.success(t('organizerForm.successLogoUpload'));
    } catch (err) {
      toast?.error(t('organizerForm.errorLogoUpload', { msg: err.message }));
    } finally {
      setLogoUploading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-100">{isNew ? t('organizerForm.titleNew') : t('organizerForm.titleEdit')}</h1>
        <div className="flex gap-3">
          <button onClick={() => onNavigate('/admin/organizers')} className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">{t('common.cancel')}</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors">
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
            {isNew ? t('organizerForm.saveCreate') : t('organizerForm.saveEdit')}
          </button>
        </div>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 space-y-5">

        {/* Logo */}
        <div className="flex items-start gap-5">
          <div
            className="organizer-logo-bg w-20 h-20 rounded-xl border-2 border-stone-700 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-orange-500/50 transition-colors"
            style={{ '--org-logo-bg': form.logo_bg_color || 'black' }}
            onClick={() => fileRef.current?.click()}
          >
            {form.logo
              ? <img src={form.logo} alt="Logo" className="w-full h-full object-contain p-1"/>
              : <span className="text-stone-400 text-3xl">{form.name?.[0]?.toUpperCase() ?? '?'}</span>
            }
          </div>
          <div className="flex-1 space-y-3">
            <Field label={t('organizerForm.logoLabel')} hint={t('organizerForm.logoHint')}>
              <div className="flex gap-2">
                <Input value={form.logo} onChange={v => setField('logo', v)} placeholder="https://..." />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm hover:bg-stone-700 disabled:opacity-50 transition-colors"
                >
                  {logoUploading ? <span className="w-4 h-4 border border-stone-400 border-t-transparent rounded-full animate-spin block"/> : '↑'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleLogoUpload(e.target.files[0])} />
              </div>
            </Field>
            <Field label={t('organizerForm.bgColor')} hint={t('organizerForm.bgColorHint')}>
              <div className="flex items-center gap-2 flex-wrap">
                {['black', 'white', '#1c1917', '#78350f', '#292524', '#0f172a'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setField('logo_bg_color', color)}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${form.logo_bg_color === color ? 'border-orange-500 scale-110' : 'border-stone-600'}`}
                    style={{ background: color }}
                    title={color}
                  />
                ))}
                <input
                  type="text"
                  value={form.logo_bg_color ?? ''}
                  onChange={e => setField('logo_bg_color', e.target.value)}
                  placeholder="#000000"
                  className="w-28 px-2 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-xs focus:outline-none focus:border-orange-500/60"
                />
              </div>
            </Field>
          </div>
        </div>

        {isNew && (
          <Field label={t('organizerForm.idSlug')} hint={t('organizerForm.idSlugHint')}>
            <Input value={form.id} onChange={v => setField('id', v)} placeholder={t('organizerForm.idSlugPlaceholder')} />
          </Field>
        )}

        <Field label={t('common.name')} required>
          <Input value={form.name} onChange={v => setField('name', v)} placeholder={t('organizerForm.namePlaceholder')} />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label={t('common.email')}>
            <Input type="email" value={form.email} onChange={v => setField('email', v)} placeholder={t('organizerForm.emailPlaceholder')} />
          </Field>
          <Field label={t('common.phone')}>
            <Input value={form.phone} onChange={v => setField('phone', v)} placeholder={t('organizerForm.phonePlaceholder')} />
          </Field>
        </div>

        <Field label={t('common.website')}>
          <Input value={form.website} onChange={v => setField('website', v)} placeholder={t('organizerForm.websitePlaceholder')} />
        </Field>

        <Field label={t('common.description')} hint={t('organizerForm.descriptionHint')}>
          <textarea
            value={form.description ?? ''}
            onChange={e => setField('description', e.target.value)}
            placeholder={t('organizerForm.descriptionPlaceholder')}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 placeholder:italic focus:outline-none focus:border-orange-500/60 resize-y"
          />
        </Field>

        <div className="flex gap-6 pt-2">
          <Toggle value={form.verified} onChange={v => setField('verified', v)} label={t('organizerForm.verifiedToggle')} />
        </div>
      </div>
    </div>
  );
}