import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function PasswordResetModal({ onDone }) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Mindestens 8 Zeichen erforderlich.'); return; }
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern des Passworts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-8 max-w-sm w-full shadow-2xl">

        {/* Icon */}
        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        {!success ? (
          <>
            <h2 className="text-white font-semibold text-lg text-center mb-1">Neues Passwort festlegen</h2>
            <p className="text-stone-500 text-xs text-center mb-6">Wähle ein sicheres Passwort mit mindestens 8 Zeichen.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-stone-400 text-xs mb-1.5">Neues Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-stone-400 text-xs mb-1.5">Passwort bestätigen</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 bg-stone-800 border border-stone-700 rounded-lg text-white text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Spinner />}
                {loading ? 'Wird gespeichert…' : 'Passwort speichern →'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">Passwort erfolgreich zurückgesetzt!</h2>
            <p className="text-stone-400 text-sm mb-6">Melde dich jetzt mit deinem neuen Passwort an.</p>
            <button
              onClick={onDone}
              className="w-full py-3 bg-amber-500 text-stone-950 rounded-xl font-semibold hover:bg-amber-400 transition-colors"
            >
              Zum Login →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}