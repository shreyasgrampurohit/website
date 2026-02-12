// Cloudflare Worker to fetch Google Scholar stats using SerpApi
// Deploy this separately as a new worker

const SCHOLAR_USER_ID = 'zMlAm6gAAAAJ'; // Your Google Scholar user ID
const CACHE_DURATION = 86400; // 24 hours in seconds

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: CORS_HEADERS
            });
        }

        // Only allow GET
        if (request.method !== 'GET') {
            return new Response(JSON.stringify({ error: 'Method not allowed' }), {
                status: 405,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        // Check for API key
        if (!env.SERPAPI_KEY) {
            return new Response(JSON.stringify({
                error: 'Configuration error',
                message: 'SERPAPI_KEY not configured'
            }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }

        try {
            // Check cache first
            const cache = caches.default;
            const cacheKey = new Request(request.url, { method: 'GET' });
            let response = await cache.match(cacheKey);

            if (!response) {
                // Fetch from SerpApi
                const serpApiUrl = `https://serpapi.com/search.json?engine=google_scholar_author&author_id=${SCHOLAR_USER_ID}&api_key=${env.SERPAPI_KEY}`;
                
                const serpResponse = await fetch(serpApiUrl);

                if (!serpResponse.ok) {
                    throw new Error(`SerpApi request failed: ${serpResponse.status}`);
                }

                const data = await serpResponse.json();

                // Extract stats from SerpApi response
                const stats = {
                    citations: data.cited_by?.table?.[0]?.citations?.all || 0,
                    hIndex: data.cited_by?.table?.[0]?.h_index?.all || 0
                };

                response = new Response(JSON.stringify(stats), {
                    status: 200,
                    headers: {
                        ...CORS_HEADERS,
                        'Content-Type': 'application/json',
                        'Cache-Control': `public, max-age=${CACHE_DURATION}`
                    }
                });

                // Store in cache
                ctx.waitUntil(cache.put(cacheKey, response.clone()));
            }

            return response;

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Failed to fetch Scholar stats',
                message: error.message
            }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
            });
        }
    }
}
