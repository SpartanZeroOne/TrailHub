// Date utility functions

const localeMap = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
};

export function formatDate(dateStr, language = 'de') {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const locale = localeMap[language] || 'de-DE';
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

export function calculateDuration(start, end, t = null) {
    if (!start) return t ? t('day1') : '1 Tag';
    if (!end) return t ? t('day1') : '1 Tag';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (t) {
        return days === 1 ? t('day1') : `${days} ${t('days')}`;
    }
    return days === 1 ? '1 Tag' : `${days} Tage`;
}

export function isThisWeekend(dateStr) {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + daysUntilSaturday);
    saturday.setHours(0, 0, 0, 0);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    return eventDate >= saturday && eventDate <= sunday;
}
