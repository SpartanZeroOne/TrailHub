// Netlify Function: geocode
// Server-side proxy for Mapbox Geocoding API.
// The Mapbox token stays server-side (process.env.MAPBOX_TOKEN, no VITE_ prefix).
// Frontend calls /api/geocode?q=Berlin&lang=de — no token exposed in browser.

export const handler = async (event) => {
    // Only GET requests
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { q, lang = 'de' } = event.queryStringParameters || {};

    if (!q || q.trim().length < 2) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Query parameter "q" is required (min 2 chars)' }),
        };
    }

    const token = process.env.MAPBOX_TOKEN;
    if (!token) {
        console.error('MAPBOX_TOKEN environment variable is not set');
        return { statusCode: 500, body: JSON.stringify({ error: 'Geocoding service not configured' }) };
    }

    const encoded = encodeURIComponent(q.trim());
    const allowedLangs = ['de', 'fr', 'nl', 'en'];
    const safeLang = allowedLangs.includes(lang) ? lang : 'de';

    try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
            `?access_token=${token}&types=place&limit=1&language=${safeLang}`;

        const res = await fetch(url);

        if (!res.ok) {
            console.error(`Mapbox API error: ${res.status}`);
            return { statusCode: 502, body: JSON.stringify({ error: 'Geocoding service error' }) };
        }

        const data = await res.json();

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600', // cache geocoding results for 1h
            },
            body: JSON.stringify(data),
        };
    } catch (err) {
        console.error('Geocode proxy error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
    }
};
