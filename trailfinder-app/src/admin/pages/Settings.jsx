// ─── TrailHub Admin – Settings ────────────────────────────────────────────────
import { useState, useEffect } from 'react';
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
      toast?.success('Einstellungen gespeichert!');
    } catch (err) {
      toast?.error('Speichern fehlgeschlagen: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Check env-configured values
  const envMapbox = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
  const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const envSupabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  const EMAIL_TABS = [
    { id: 'registration', label: 'Registrierung' },
    { id: 'password_reset', label: 'Passwort-Reset' },
    { id: 'reminder', label: 'Event-Erinnerung' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-100">Einstellungen</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
          Speichern
        </button>
      </div>

      {/* API Keys */}
      <Section title="API-Schlüssel">
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-amber-300 text-sm">
          ⚠ API-Schlüssel werden verschlüsselt gespeichert. Niemals den Service-Role-Key hier eingeben!
        </div>

        <Field label="KI-API-Key (Anthropic Claude)" hint="Für automatische Event-Zusammenfassungen">
          <Input value={settings.ai_api_key} onChange={v => setField('ai_api_key', v)} placeholder="sk-ant-api03-..." secret />
        </Field>

        <Field label="KI-Modell" hint="Standard: claude-sonnet-4-6">
          <select
            value={settings.ai_model}
            onChange={e => setField('ai_model', e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (empfohlen)</option>
            <option value="claude-opus-4-6">Claude Opus 4.6 (leistungsstärker)</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (schnell/günstig)</option>
          </select>
        </Field>

        <Field label="DeepL API-Key" hint="Für automatische Übersetzungen">
          <Input value={settings.deepl_api_key} onChange={v => setField('deepl_api_key', v)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx" secret />
        </Field>

        <div className="border-t border-stone-800 pt-4">
          <h3 className="text-stone-400 text-sm font-medium mb-3">Umgebungsvariablen (aus .env.local)</h3>
          <div className="space-y-2 text-xs text-stone-500">
            <div className="flex gap-2">
              <span className="text-green-400 w-3">✓</span>
              <span>Mapbox Token: <span className="text-stone-400 font-mono">{envMapbox ? envMapbox.slice(0, 20) + '…' : '(nicht gesetzt)'}</span></span>
            </div>
            <div className="flex gap-2">
              <span className={envSupabaseUrl ? 'text-green-400' : 'text-red-400'}>{envSupabaseUrl ? '✓' : '✗'}</span>
              <span>Supabase URL: <span className="text-stone-400 font-mono">{envSupabaseUrl || '(nicht gesetzt)'}</span></span>
            </div>
            <div className="flex gap-2">
              <span className={envSupabaseKey ? 'text-green-400' : 'text-red-400'}>{envSupabaseKey ? '✓' : '✗'}</span>
              <span>Supabase Anon Key: <span className="text-stone-400 font-mono">{envSupabaseKey ? envSupabaseKey.slice(0, 24) + '…' : '(nicht gesetzt)'}</span></span>
            </div>
          </div>
        </div>
      </Section>

      {/* Email Templates */}
      <Section title="E-Mail-Templates">
        <p className="text-stone-500 text-sm">Verfügbare Platzhalter: {'{{name}}'}, {'{{event_name}}'}, {'{{start_date}}'}, {'{{location}}'}, {'{{reset_link}}'}, {'{{days_until}}'}</p>

        {/* Email Tab Switcher */}
        <div className="flex gap-1 bg-stone-800 p-1 rounded-lg">
          {EMAIL_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveEmailTab(t.id)}
              className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeEmailTab === t.id ? 'bg-stone-900 text-stone-200 shadow' : 'text-stone-500 hover:text-stone-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeEmailTab === 'registration' && (
          <div className="space-y-3">
            <Field label="Betreff – Registrierungsbestätigung">
              <Input value={settings.email_registration_subject} onChange={v => setField('email_registration_subject', v)} placeholder="Deine Anmeldung bei TrailHub ✓" />
            </Field>
            <Field label="E-Mail-Text">
              <Textarea value={settings.email_registration_body} onChange={v => setField('email_registration_body', v)} rows={8} />
            </Field>
          </div>
        )}

        {activeEmailTab === 'password_reset' && (
          <div className="space-y-3">
            <Field label="Betreff – Passwort-Reset">
              <Input value={settings.email_password_reset_subject} onChange={v => setField('email_password_reset_subject', v)} />
            </Field>
            <Field label="E-Mail-Text">
              <Textarea value={settings.email_password_reset_body} onChange={v => setField('email_password_reset_body', v)} rows={8} />
            </Field>
          </div>
        )}

        {activeEmailTab === 'reminder' && (
          <div className="space-y-3">
            <Field label="Betreff – Event-Erinnerung">
              <Input value={settings.email_reminder_subject} onChange={v => setField('email_reminder_subject', v)} />
            </Field>
            <Field label="E-Mail-Text">
              <Textarea value={settings.email_reminder_body} onChange={v => setField('email_reminder_body', v)} rows={8} />
            </Field>
          </div>
        )}
      </Section>

      {/* Session */}
      <Section title="Session-Management">
        <Field label="Auto-Logout nach (Minuten)" hint="Empfohlen: 30 Minuten">
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
          <span className="text-sm text-stone-300">Automatischer Logout aktiv</span>
        </label>
      </Section>

      {/* Danger Zone */}
      <Section title="Gefahrenzone">
        <div className="space-y-3">
          <p className="text-stone-500 text-sm">Vorsicht: Diese Aktionen können nicht rückgängig gemacht werden.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
            >
              Admin-Session beenden & abmelden
            </button>
          </div>
        </div>
      </Section>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
          Alle Einstellungen speichern
        </button>
      </div>
    </div>
  );
}