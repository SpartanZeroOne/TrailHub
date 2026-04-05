import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const INPUT_CLASS = "w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors";
const LABEL_CLASS = "block text-stone-400 text-xs mb-1.5";

// Map English Supabase errors to German
const DE_ERRORS = {
  'Invalid login credentials': 'Falsche E-Mail-Adresse oder falsches Passwort.',
  'Email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  'User already registered': 'Diese E-Mail-Adresse ist bereits registriert.',
  'Password should be at least 6 characters': 'Das Passwort muss mindestens 8 Zeichen haben.',
  'Unable to validate email address: invalid format': 'Ungültige E-Mail-Adresse.',
  'signup is disabled': 'Registrierung ist momentan deaktiviert.',
  'For security purposes, you can only request this once every 60 seconds': 'Bitte warte 60 Sekunden vor einer erneuten Anfrage.',
  'Email rate limit exceeded': 'Zu viele Versuche. Bitte warte kurz.',
};

const mapError = (msg) => {
  if (!msg) return 'Ein unbekannter Fehler ist aufgetreten.';
  for (const [en, de] of Object.entries(DE_ERRORS)) {
    if (msg.includes(en)) return de;
  }
  return msg;
};

export default function AuthModal({ onClose }) {
  const { signIn, signUp, sendPasswordReset } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'reset'

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onClose();
    } catch (err) {
      setError(mapError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Das Passwort muss mindestens 8 Zeichen haben.'); return; }
    if (password !== confirmPassword) { setError('Die Passwörter stimmen nicht überein.'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name || undefined);
      setSuccess('Konto erstellt! Bitte prüfe dein E-Mail-Postfach und bestätige deine Adresse.');
    } catch (err) {
      setError(mapError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ── Password Reset ─────────────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccess('Reset-Link gesendet! Bitte prüfe dein E-Mail-Postfach.');
    } catch (err) {
      setError(mapError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 rounded-2xl border border-stone-700 p-8 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher – hidden on password-reset screen */}
        {tab !== 'reset' && (
          <div className="flex rounded-xl bg-stone-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'login' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'register' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'}`}
            >
              Registrieren
            </button>
          </div>
        )}

        {/* Password-Reset header */}
        {tab === 'reset' && (
          <div className="text-center mb-6">
            <h3 className="text-white font-semibold text-lg">Passwort zurücksetzen</h3>
            <p className="text-stone-500 text-xs mt-1">Wir senden dir einen Reset-Link per E-Mail.</p>
          </div>
        )}

        {/* Feedback banners */}
        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-3 py-2.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {/* ── LOGIN FORM ─────────────────────────────────────────────────── */}
        {tab === 'login' && !success && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="deine@email.de" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" className={INPUT_CLASS} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Anmelden…' : 'Anmelden →'}
            </button>
            <button
              type="button"
              onClick={() => switchTab('reset')}
              className="w-full py-2 text-stone-500 text-xs hover:text-stone-300 transition-colors"
            >
              Passwort vergessen?
            </button>
          </form>
        )}

        {/* ── REGISTER FORM ──────────────────────────────────────────────── */}
        {tab === 'register' && !success && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Name <span className="text-stone-600">(optional)</span></label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Dein Anzeigename" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="deine@email.de" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Passwort <span className="text-stone-600">(min. 8 Zeichen)</span></label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" className={INPUT_CLASS} />
            </div>
            <div>
              <label className={LABEL_CLASS}>Passwort wiederholen</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                required placeholder="••••••••" className={INPUT_CLASS} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Konto wird erstellt…' : 'Konto erstellen →'}
            </button>
          </form>
        )}

        {/* ── PASSWORD RESET FORM ────────────────────────────────────────── */}
        {tab === 'reset' && !success && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="deine@email.de" className={INPUT_CLASS} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? 'Wird gesendet…' : 'Reset-Link senden →'}
            </button>
            <button
              type="button"
              onClick={() => switchTab('login')}
              className="w-full py-2 text-stone-500 text-xs hover:text-stone-300 transition-colors"
            >
              ← Zurück zum Login
            </button>
          </form>
        )}

        {/* ── SUCCESS STATE – close/back buttons ────────────────────────── */}
        {success && (
          <button
            type="button"
            onClick={tab === 'register' ? onClose : () => switchTab('login')}
            className="w-full mt-2 py-3 bg-stone-800 text-stone-300 rounded-xl font-medium hover:bg-stone-700 transition-colors text-sm"
          >
            {tab === 'register' ? 'Schließen' : '← Zurück zum Login'}
          </button>
        )}
      </div>
    </div>
  );
}