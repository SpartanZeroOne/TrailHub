// ─── TrailHub Admin – Settings ────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchSettings, adminSaveSettings } from '../services/adminSupabase';

function Section({ title, children }) {
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-800">
        <h2 className="text-stone-200 font-semibold">{title}</h2>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', secret }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={secret && !show ? 'password' : type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors pr-10"
      />
      {secret && (
        <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 text-xs">
          {show ? 'Verbergen' : 'Anzeigen'}
        </button>
      )}
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 5 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 resize-y"
    />
  );
}

const DEFAULT_SETTINGS = {
  ai_api_key: '',
  ai_model: 'claude-sonnet-4-6',
  mapbox_token: '',
  supabase_url: '',
  supabase_anon_key: '',
  deepl_api_key: '',
  email_registration_subject: 'Deine Anmeldung bei TrailHub ✓',
  email_registration_body: `Hallo {{name}},\n\nvielen Dank für deine Anmeldung zu {{event_name}}!\n\nDatum: {{start_date}}\nOrt: {{location}}\n\nWir freuen uns auf dich!\n\nDein TrailHub-Team`,
  email_password_reset_subject: 'Passwort zurücksetzen – TrailHub',
  email_password_reset_body: `Hallo {{name}},\n\ndu hast eine Passwort-Zurücksetzung angefordert.\n\nKlicke hier um ein neues Passwort festzulegen:\n{{reset_link}}\n\nDieser Link ist 24 Stunden gültig.\n\nDein TrailHub-Team`,
  email_reminder_subject: '{{event_name}} findet bald statt! 🏍',
  email_reminder_body: `Hallo {{name}},\n\nnur noch {{days_until}} Tage bis zu {{event_name}}!\n\nDatum: {{start_date}}\nOrt: {{location}}\n\nWir sehen uns auf der Strecke!\n\nDein TrailHub-Team`,
  session_timeout_minutes: 30,
  auto_logout: true,
};

export default function Settings({ toast }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeEmailTab, setActiveEmailTab] = useState('registration');

  const setField = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  useEffect(() => {
    setLoading(true);
    adminFetchSettings()
      .then(data => setSettings(s => ({ ...s, ...data })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminSaveSettings(settings);
      toast?.success(t('settings.successSave'));
    } catch (err) {
      toast?.error(t('settings.errorSave', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const envMapbox = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
  const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const envSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  const EMAIL_TABS = [
    { id: 'registration', label: t('settings.tabRegistration') },
    { id: 'password_reset', label: t('settings.tabPasswordReset') },
    { id: 'reminder', label: t('settings.tabEventReminder') },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-100">{t('settings.title')}</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
          {t('settings.save')}
        </button>
      </div>

      {/* API Keys */}
      <Section title={t('settings.apiKeys')}>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-300 text-sm">
          {t('settings.apiWarning')}
        </div>

        <Field label={t('settings.aiApiKey')} hint={t('settings.aiApiKeyHint')}>
          <Input value={settings.ai_api_key} onChange={v => setField('ai_api_key', v)} placeholder={t('settings.aiApiKeyPlaceholder')} secret />
        </Field>

        <Field label={t('settings.aiModel')} hint={t('settings.aiModelHint')}>
          <select
            value={settings.ai_model}
            onChange={e => setField('ai_model', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="claude-sonnet-4-6">{t('settings.modelSonnet')}</option>
            <option value="claude-opus-4-6">{t('settings.modelOpus')}</option>
            <option value="claude-haiku-4-5-20251001">{t('settings.modelHaiku')}</option>
          </select>
        </Field>

        <Field label={t('settings.deeplKey')} hint={t('settings.deeplKeyHint')}>
          <Input value={settings.deepl_api_key} onChange={v => setField('deepl_api_key', v)} placeholder={t('settings.deeplKeyPlaceholder')} secret />
        </Field>

        <div className="border-t border-stone-800 pt-4">
          <h3 className="text-stone-400 text-sm font-medium mb-3">{t('settings.envVars')}</h3>
          <div className="space-y-2 text-xs text-stone-500">
            <div className="flex gap-2">
              <span className="text-green-400 w-3">✓</span>
              <span>{t('settings.mapboxToken')} <span className="text-stone-400 font-mono">{envMapbox ? envMapbox.slice(0, 20) + '…' : t('settings.notSet')}</span></span>
            </div>
            <div className="flex gap-2">
              <span className={envSupabaseUrl ? 'text-green-400' : 'text-red-400'}>{envSupabaseUrl ? '✓' : '✗'}</span>
              <span>{t('settings.supabaseUrl')} <span className="text-stone-400 font-mono">{envSupabaseUrl || t('settings.notSet')}</span></span>
            </div>
            <div className="flex gap-2">
              <span className={envSupabaseKey ? 'text-green-400' : 'text-red-400'}>{envSupabaseKey ? '✓' : '✗'}</span>
              <span>{t('settings.supabaseAnonKey')} <span className="text-stone-400 font-mono">{envSupabaseKey ? envSupabaseKey.slice(0, 24) + '…' : t('settings.notSet')}</span></span>
            </div>
          </div>
        </div>
      </Section>

      {/* Email Templates */}
      <Section title={t('settings.emailTemplates')}>
        <p className="text-stone-500 text-sm">{t('settings.emailPlaceholders')}</p>

        <div className="flex gap-1 bg-stone-800 p-1 rounded-lg">
          {EMAIL_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveEmailTab(tab.id)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeEmailTab === tab.id ? 'bg-stone-900 text-stone-200 shadow' : 'text-stone-500 hover:text-stone-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeEmailTab === 'registration' && (
          <div className="space-y-3">
            <Field label={t('settings.subjectRegistration')}>
              <Input value={settings.email_registration_subject} onChange={v => setField('email_registration_subject', v)} placeholder={t('settings.subjectRegistrationPlaceholder')} />
            </Field>
            <Field label={t('settings.emailBody')}>
              <Textarea value={settings.email_registration_body} onChange={v => setField('email_registration_body', v)} rows={8} />
            </Field>
          </div>
        )}

        {activeEmailTab === 'password_reset' && (
          <div className="space-y-3">
            <Field label={t('settings.subjectPasswordReset')}>
              <Input value={settings.email_password_reset_subject} onChange={v => setField('email_password_reset_subject', v)} />
            </Field>
            <Field label={t('settings.emailBody')}>
              <Textarea value={settings.email_password_reset_body} onChange={v => setField('email_password_reset_body', v)} rows={8} />
            </Field>
          </div>
        )}

        {activeEmailTab === 'reminder' && (
          <div className="space-y-3">
            <Field label={t('settings.subjectEventReminder')}>
              <Input value={settings.email_reminder_subject} onChange={v => setField('email_reminder_subject', v)} />
            </Field>
            <Field label={t('settings.emailBody')}>
              <Textarea value={settings.email_reminder_body} onChange={v => setField('email_reminder_body', v)} rows={8} />
            </Field>
          </div>
        )}
      </Section>

      {/* Session */}
      <Section title={t('settings.sessionManagement')}>
        <Field label={t('settings.autoLogoutMinutes')} hint={t('settings.autoLogoutHint')}>
          <input
            type="number"
            value={settings.session_timeout_minutes}
            onChange={e => setField('session_timeout_minutes', Number(e.target.value))}
            min={5}
            max={480}
            className="w-32 px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-orange-500/60"
          />
        </Field>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setField('auto_logout', !settings.auto_logout)}
            className={`relative w-10 h-5 rounded-full transition-colors ${settings.auto_logout ? 'bg-orange-500' : 'bg-stone-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.auto_logout ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm text-stone-300">{t('settings.autoLogoutActive')}</span>
        </label>
      </Section>

      {/* Danger Zone */}
      <Section title={t('settings.dangerZone')}>
        <div className="space-y-3">
          <p className="text-stone-500 text-sm">{t('settings.dangerWarning')}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => { localStorage.clear(); window.location.href = '/'; }}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
            >
              {t('settings.endSession')}
            </button>
          </div>
        </div>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
          {t('settings.saveAll')}
        </button>
      </div>
    </div>
  );
}