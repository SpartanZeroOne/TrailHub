// Mapbox Client Service
// Configure VITE_MAPBOX_TOKEN in .env.local

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

export const isMapboxConfigured = () => !!MAPBOX_TOKEN;

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

export const DEFAULT_CENTER = {
    lat: 49.8153, // Luxembourg – center of coverage area
    lng: 6.1296,
};

export const DEFAULT_ZOOM = 5;
