// Cloudflare Pages Function: /api/geocode
// Replaces the Netlify Function (netlify/functions/geocode.js).
// The Mapbox token stays server-side (env.MAPBOX_TOKEN, no VITE_ prefix).
// Frontend calls /api/geocode?q=Berlin&lang=de — token never exposed in browser.

const ALLOWED_LANGS = ['de', 'fr', 'nl', 'en'];

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const q = url.searchParams.get('q');
    const lang = url.searchParams.get('lang') || 'de';

    if (!q || q.trim().length < 2) {
        return new Response(
            JSON.stringify({ error: 'Query parameter "q" is required (min 2 chars)' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const token = context.env.MAPBOX_TOKEN;
    if (!token) {
        console.error('MAPBOX_TOKEN environment variable is not set');
        return new Response(
            JSON.stringify({ error: 'Geocoding service not configured' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const encoded = encodeURIComponent(q.trim());
    const safeLang = ALLOWED_LANGS.includes(lang) ? lang : 'de';

    try {
        const mapboxUrl =
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
            `?access_token=${token}&types=place&limit=1&language=${safeLang}`;

        const res = await fetch(mapboxUrl);

        if (!res.ok) {
            console.error(`Mapbox API error: ${res.status}`);
            return new Response(
                JSON.stringify({ error: 'Geocoding service error' }),
                { status: 502, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const data = await res.json();

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (err) {
        console.error('Geocode proxy error:', err);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
