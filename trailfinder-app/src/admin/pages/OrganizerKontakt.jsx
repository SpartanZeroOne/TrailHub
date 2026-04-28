// ─── TrailHub Admin – Organizer Kontakt Form ──────────────────────────────────
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../services/supabaseClient';

export default function OrganizerKontakt({ toast }) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
      const senderName = profile?.name || user?.email?.split('@')[0] || 'Organizer';

      const { error } = await supabase.functions.invoke('send-contact-message', {
        body: {
          sender_name: senderName,
          sender_email: user?.email,
          subject,
          message,
          source: 'admin',
        },
      });

      if (error) throw error;

      setSent(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setSendError('Fehler: Die Nachricht konnte nicht gesendet werden. Bitte kontaktiere uns direkt per E-Mail an info@trailhub.mx');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-100">{t('organizer.kontaktTitle')}</h1>
        <p className="text-stone-500 text-sm mt-1">{t('organizer.kontaktSubtitle')}</p>
      </div>

      {sent ? (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-green-300 mb-2">{t('organizer.kontaktSent')}</h2>
          <p className="text-stone-400 text-sm mb-5">{t('organizer.kontaktSentSub')}</p>
          <button
            onClick={() => setSent(false)}
            className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-sm hover:bg-stone-700 transition-colors"
          >
            {t('organizer.kontaktAnother')}
          </button>
        </div>
      ) : (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">{t('organizer.kontaktSubject')}</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                placeholder={t('organizer.kontaktSubjectPlaceholder')}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">{t('organizer.kontaktMessage')}</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={6}
                placeholder={t('organizer.kontaktMessagePlaceholder')}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 resize-y transition-colors"
              />
            </div>
            {sendError && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-400 text-sm">
                {sendError}
              </div>
            )}
            <button
              type="submit"
              disabled={sending || !subject.trim() || !message.trim()}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
              {sending ? t('organizer.kontaktSending') : t('organizer.kontaktSubmit')}
            </button>
          </form>
        </div>
      )}

      <div className="bg-stone-900/50 rounded-xl border border-stone-800/50 p-4">
        <p className="text-stone-500 text-xs">{t('organizer.kontaktNote')}</p>
      </div>
    </div>
  );
}
