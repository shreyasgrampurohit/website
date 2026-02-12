/**
 * Cloudflare Worker - Gemini API Proxy (Service Worker Format)
 * 
 * Copy this ENTIRE file into your Cloudflare Worker in the Dashboard.
 * 
 * Setup:
 * 1. Go to https://dash.cloudflare.com/
 * 2. Workers & Pages > Create Application > Create Worker
 * 3. Click "Edit code"
 * 4. Replace ALL code with this file's contents
 * 5. Click "Save and Deploy"
 * 6. Go to Settings > Variables > Add variable:
 *    - Name: GEMINI_API_KEY
 *    - Value: your actual API key
 *    - Click "Encrypt"
 * 7. Click "Save and Deploy" again
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env) {
        return handleRequest(request, env);
    }
};

async function handleRequest(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { 
            status: 204,
            headers: CORS_HEADERS 
        });
    }

    // Only allow POST
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
            status: 405,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await request.json();
        if (!body.contents || !Array.isArray(body.contents)) {
            return new Response(JSON.stringify({ error: 'Invalid request: contents array required' }), {
                status: 400,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const systemPrompt = body?.systemInstruction?.parts?.[0]?.text || '';
        const messages = normalizeMessages(body.contents);

        const errors = [];

        // Provider order: Claude -> OpenAI -> Gemini
        const claudeKey = env?.CLAUDE_API_KEY || null;
        if (claudeKey) {
            const res = await callClaude(messages, systemPrompt, claudeKey, body?.generationConfig);
            if (res.ok) return respondJSON(res.data);
            errors.push({ provider: 'claude', error: res.error, status: res.status });
        } else {
            errors.push({ provider: 'claude', error: 'CLAUDE_API_KEY not set' });
        }

        const openaiKey = env?.OPENAI_API_KEY || null;
        if (openaiKey) {
            const res = await callOpenAI(messages, systemPrompt, openaiKey, body?.generationConfig);
            if (res.ok) return respondJSON(res.data);
            errors.push({ provider: 'openai', error: res.error, status: res.status });
        } else {
            errors.push({ provider: 'openai', error: 'OPENAI_API_KEY not set' });
        }

        const geminiKey = env?.GEMINI_API_KEY || null;
        if (geminiKey) {
            const res = await callGemini(body, geminiKey);
            if (res.ok) return respondJSON(res.data);
            errors.push({ provider: 'gemini', error: res.error, status: res.status });
        } else {
            errors.push({ provider: 'gemini', error: 'GEMINI_API_KEY not set' });
        }

        // All providers failed
        return new Response(JSON.stringify({ error: 'All providers failed', details: errors }), {
            status: 502,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });

    } catch (err) {
        return new Response(JSON.stringify({ 
            error: 'Worker error',
            message: err.message,
            stack: err.stack
        }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
}

function respondJSON(data) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

function normalizeMessages(contents) {
    return contents.map(c => ({
        role: c.role === 'model' ? 'assistant' : 'user',
        text: (c.parts || []).map(p => p.text || '').join('\n')
    }));
}

async function callClaude(messages, systemPrompt, apiKey, gen = {}) {
    try {
        const body = {
            model: CLAUDE_MODEL,
            max_tokens: gen.maxOutputTokens || 1024,
            temperature: gen.temperature ?? 0.7,
            system: systemPrompt || undefined,
            messages: messages.map(m => ({
                role: m.role,
                content: [{ type: 'text', text: m.text }]
            })),
        };

        const resp = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        });

        const data = await resp.json();
        if (!resp.ok) return { ok: false, status: resp.status, error: data };

        const text = data?.content?.[0]?.text || '';
        return { ok: true, data: { candidates: [{ content: { parts: [{ text }] } }] } };
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}

async function callOpenAI(messages, systemPrompt, apiKey, gen = {}) {
    try {
        const openAIMessages = [];
        if (systemPrompt) openAIMessages.push({ role: 'system', content: systemPrompt });
        for (const m of messages) {
            openAIMessages.push({ role: m.role, content: m.text });
        }

        const body = {
            model: OPENAI_MODEL,
            messages: openAIMessages,
            temperature: gen.temperature ?? 0.7,
            max_tokens: gen.maxOutputTokens || 1024,
        };

        const resp = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });

        const data = await resp.json();
        if (!resp.ok) return { ok: false, status: resp.status, error: data };

        const text = data?.choices?.[0]?.message?.content || '';
        return { ok: true, data: { candidates: [{ content: { parts: [{ text }] } }] } };
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}

async function callGemini(originalBody, apiKey) {
    try {
        const resp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(originalBody),
        });

        const data = await resp.json();
        if (!resp.ok) return { ok: false, status: resp.status, error: data };

        return { ok: true, data };
    } catch (e) {
        return { ok: false, status: 500, error: e.message };
    }
}
