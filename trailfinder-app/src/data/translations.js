// Re-export translations and countryTranslations from the monolith
// This module serves as the canonical import point for translation data.
// Once the monolith is fully decomposed, this file will hold the data directly.

export { translations, countryTranslations } from '../OffroadEventsApp';
