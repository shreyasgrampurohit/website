/**
 * Cloudflare Worker - Gemini API Proxy
 * 
 * Securely proxies requests to Google Gemini API, keeping your API key server-side.
 * 
 * Setup:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Workers & Pages > Create Application > Create Worker
 * 3. Name it (e.g., "gemini-proxy")
 * 4. Deploy, then click "Edit code"
 * 5. Replace all code with this file's contents
 * 6. Go to Settings > Variables > Add variable:
 *    - Name: GEMINI_API_KEY
 *    - Value: your actual API key
 *    - Click "Encrypt"
 * 7. Save and deploy
 * 8. Copy your worker URL (e.g., https://gemini-proxy.YOUR_SUBDOMAIN.workers.dev)
 * 9. Update PROXY_URL in your website's config.js
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// CORS headers for your website
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // In production, restrict to your domain
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        // Only allow POST
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        try {
            // Get the request body
            const body = await request.json();

            // Validate required fields
            if (!body.contents || !Array.isArray(body.contents)) {
                return new Response(JSON.stringify({ error: 'Invalid request: contents required' }), {
                    status: 400,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }

            // Get API key from environment variable
            const apiKey = env.GEMINI_API_KEY;
            if (!apiKey) {
                return new Response(JSON.stringify({ error: 'API key not configured' }), {
                    status: 500,
                    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                });
            }

            // Forward to Gemini API
            const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const geminiData = await geminiResponse.json();

            // Return the response
            return new Response(JSON.stringify(geminiData), {
                status: geminiResponse.status,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });

        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }
    },
};
