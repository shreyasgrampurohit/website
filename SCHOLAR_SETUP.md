# Google Scholar Stats Setup (Using SerpApi)

This guide explains how to set up automatic Google Scholar citation statistics fetching for your website using SerpApi.

## Overview

The `scholar-worker.js` Cloudflare Worker uses SerpApi to fetch your Google Scholar citation count and h-index. SerpApi handles all the complexity of scraping Google Scholar reliably.

## Prerequisites

1. A Cloudflare account (free tier works)
2. A SerpApi account with API key (free tier: 100 searches/month)

## Setup Steps

### 1. Get Your SerpApi API Key

1. Go to [serpapi.com](https://serpapi.com/)
2. Sign up for a free account
3. Go to your dashboard and copy your API key
4. Free tier gives you 100 searches/month (perfect since we cache for 24 hours)

### 2. Configure the Worker

The worker is already configured with your Scholar ID (`zMlAm6gAAAAJ`). If you need to change it, edit line 4 in `scholar-worker.js`.

### 3. Deploy the Worker

#### Option A: Using Cloudflare Dashboard (Easiest)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create Application** → **Create Worker**
4. Name it `scholar-stats` and click **Deploy**
5. Click **Edit Code**
6. Copy and paste the entire content of `scholar-worker.js`
7. Click **Save and Deploy**
8. Go to **Settings** → **Variables**
9. Click **Add variable**:
   - Variable name: `SERPAPI_KEY`
   - Value: Your SerpApi API key
   - Type: Secret (encrypted)
10. Click **Save**

#### Option B: Using Wrangler CLI

```bash
# Deploy the worker
npx wrangler deploy scholar-worker.js --config wrangler-scholar.toml

# Add your SerpApi key as a secret
npx wrangler secret put SERPAPI_KEY --config wrangler-scholar.toml
# When prompted, paste your SerpApi API key
```

### 4. Update Your Frontend

The frontend (`script.js`) should already be configured to use:
```
https://scholar-stats.shreyasg0512.workers.dev
```

If you named your worker differently, update line 272 in `script.js`.

### 5. Test It

Visit your website and check if the citation stats load. You can also test the worker directly:
```
https://scholar-stats.shreyasg0512.workers.dev
```

You should see:
```json
{"citations":123,"hIndex":4}
```

## How It Works

1. Your website calls the Cloudflare Worker
2. The worker checks its cache (valid for 24 hours)
3. If not cached, it calls SerpApi to get fresh Scholar data
4. The worker returns the citation count and h-index as JSON
5. Your website displays the stats

## Troubleshooting

### "SERPAPI_KEY not configured" error
- Make sure you added the `SERPAPI_KEY` variable in your worker settings
- Make sure it's set as a "Secret" (encrypted) variable

### Stats show as "—"
- Check browser console for errors
- Verify the worker URL in `script.js` is correct
- Test the worker URL directly in your browser

### "Failed to fetch Scholar stats"
- Check your SerpApi API key is valid
- Verify you haven't exceeded your SerpApi quota (100/month on free tier)
- Check SerpApi dashboard for error details

## Cost

- **Cloudflare Workers**: Free (up to 100,000 requests/day)
- **SerpApi**: Free tier (100 searches/month)
- With 24-hour caching, you'll use ~30 API calls/month (well within free tier)

## Next Steps

1. Get SerpApi API key from serpapi.com
2. Deploy the worker from the Cloudflare dashboard
3. Add your API key as a secret variable
4. Refresh your website and enjoy automatic stats! 🎉
