// Re-export mockEvents from the monolith
// This module serves as the canonical import point for event data.
// Once the monolith is fully decomposed, this file will hold the data directly.

export { mockEvents } from '../OffroadEventsApp';
