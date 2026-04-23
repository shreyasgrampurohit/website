// Configuration file for the website
// This file should be committed — it only contains the proxy URL (no secrets)

const CONFIG = {
    // Replace with your Cloudflare Worker URL after deployment
    PROXY_URL: 'https://website-gemini-proxy.shreyasg0512.workers.dev',

    // Website traffic analytics (Google Analytics 4)
    // Set ENABLED to true and replace GA_MEASUREMENT_ID to start tracking
    ANALYTICS: {
        ENABLED: true,
        GA_MEASUREMENT_ID: 'G-J3LWQEXQ6W',
    },
};

// Explicitly expose config for other scripts loaded in the browser
window.CONFIG = CONFIG;
