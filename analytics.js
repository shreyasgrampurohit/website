// Optional Google Analytics 4 setup.
// Enabled via CONFIG.ANALYTICS in config.js.
(function initAnalytics() {
    if (!window.CONFIG || !window.CONFIG.ANALYTICS) {
        return;
    }

    const analytics = window.CONFIG.ANALYTICS;
    const measurementId = (analytics.GA_MEASUREMENT_ID || '').trim();

    if (!analytics.ENABLED || !measurementId || measurementId === 'G-XXXXXXXXXX') {
        return;
    }

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
        anonymize_ip: true,
        transport_type: 'beacon'
    });

    // Shared lightweight helper for custom event tracking.
    window.trackEvent = function trackEvent(eventName, params = {}) {
        if (typeof window.gtag !== 'function') {
            return;
        }
        window.gtag('event', eventName, params);
    };
})();
