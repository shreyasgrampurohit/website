# Google Scholar Stats Setup

This guide explains how to set up automatic fetching of your Google Scholar citation statistics.

## Prerequisites

- Cloudflare account
- Your Google Scholar profile ID
- Wrangler CLI installed (or use Cloudflare Dashboard)

## Step 1: Find Your Google Scholar ID

1. Go to your Google Scholar profile
2. Look at the URL: `https://scholar.google.com/citations?user=XXXXXXXXXX&hl=en`
3. Copy the value after `user=` (the XXXXXXXXXX part)

## Step 2: Update the Worker Code

1. Open `scholar-worker.js`
2. Replace `YOUR_SCHOLAR_ID` on line 4 with your actual Scholar ID:
   ```javascript
   const SCHOLAR_URL = 'https://scholar.google.com/citations?user=YOUR_ACTUAL_ID&hl=en';
   ```

## Step 3: Deploy the Worker

### Option A: Using Wrangler CLI

```bash
# Deploy the worker
npx wrangler deploy scholar-worker.js --config wrangler-scholar.toml

# Note the deployed URL (something like https://scholar-stats.YOUR_SUBDOMAIN.workers.dev)
```

### Option B: Using Cloudflare Dashboard

1. Go to Cloudflare Dashboard → Workers & Pages
2. Click "Create Application" → "Create Worker"
3. Name it "scholar-stats"
4. Copy the content of `scholar-worker.js` into the editor
5. Update line 4 with your Scholar ID
6. Click "Save and Deploy"
7. Copy the worker URL

## Step 4: Update Frontend

1. Open `script.js`
2. Find line ~272 where it says `SCHOLAR_WORKER_URL`
3. Replace with your actual worker URL:
   ```javascript
   const SCHOLAR_WORKER_URL = 'https://scholar-stats.YOUR_SUBDOMAIN.workers.dev';
   ```

## Step 5: Test

1. Commit and push all changes
2. Wait for GitHub Pages to rebuild
3. Visit your website and check the citations/h-index display

## Caching

- The worker caches results for 24 hours
- This prevents hitting Google Scholar too frequently
- Stats will update automatically once per day

## Troubleshooting

### Stats show "—"
- Check browser console for errors
- Verify Scholar ID is correct
- Verify worker is deployed and accessible
- Try visiting the worker URL directly in browser

### Worker returns errors
- Google Scholar may be blocking requests
- Try adding a longer cache duration
- Consider using SerpApi as an alternative (requires API key)

## Alternative: Manual Updates

If the worker approach doesn't work well, you can revert to manual updates:

```javascript
async function loadCitationStats() {
    const stats = {
        citations: '245',  // Update manually
        hIndex: '8'        // Update manually
    };
    
    document.getElementById('total-citations').textContent = stats.citations;
    document.getElementById('h-index').textContent = stats.hIndex;
}
```

Update these values whenever your stats change significantly.
