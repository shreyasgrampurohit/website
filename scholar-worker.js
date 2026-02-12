// Cloudflare Worker to fetch Google Scholar stats
// Deploy this separately as a new worker

const SCHOLAR_URL = 'https://scholar.google.com/citations?user=zMlAm6gAAAAJ&hl=en&authuser=1';
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

        try {
            // Check cache first
            const cache = caches.default;
            const cacheKey = new Request(request.url, { method: 'GET' });
            let response = await cache.match(cacheKey);

            if (!response) {
                // Fetch from Google Scholar
                const scholarResponse = await fetch(SCHOLAR_URL, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    }
                });

                if (!scholarResponse.ok) {
                    throw new Error(`Failed to fetch Scholar page: ${scholarResponse.status}`);
                }

                const html = await scholarResponse.text();

                // Parse citations and h-index from HTML
                const stats = parseScholarStats(html);

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
};

function parseScholarStats(html) {
    const stats = {
        citations: 0,
        hIndex: 0
    };

    try {
        // Match citations count
        // Pattern: <td class="gsc_rsb_std">123</td> (first occurrence)
        const citationsMatch = html.match(/<td class="gsc_rsb_std">(\d+)<\/td>/);
        if (citationsMatch) {
            stats.citations = parseInt(citationsMatch[1], 10);
        }

        // Match h-index
        // Pattern: Look for the second gsc_rsb_std after "All" row
        const allMatches = html.match(/<td class="gsc_rsb_std">(\d+)<\/td>/g);
        if (allMatches && allMatches.length >= 3) {
            // Third value is usually h-index (citations, citations since 2020, h-index)
            const hIndexMatch = allMatches[2].match(/(\d+)/);
            if (hIndexMatch) {
                stats.hIndex = parseInt(hIndexMatch[1], 10);
            }
        }
    } catch (error) {
        console.error('Error parsing Scholar stats:', error);
    }

    return stats;
}
