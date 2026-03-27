// Convex Client Service
// Placeholder – configure VITE_CONVEX_URL in .env.local

// import { ConvexReactClient } from 'convex/react';
// const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
// export default convex;

export const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || '';

export const isConvexConfigured = () => !!CONVEX_URL;

// Stub functions for future Convex integration
export const fetchEvents = async () => {
    console.warn('Convex not configured – using local data');
    return null;
};

export const saveEvent = async (event) => {
    console.warn('Convex not configured – saving locally');
    return null;
};

export const deleteEvent = async (eventId) => {
    console.warn('Convex not configured – deleting locally');
    return null;
};
