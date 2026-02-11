/**
 * Chatbot Module
 * RAG-based chatbot that searches a pre-built knowledge base
 * and uses Google Gemini API to generate answers.
 */

const Chatbot = (() => {
    // --- Configuration ---
    const PROXY_URL = CONFIG.PROXY_URL;
    const KNOWLEDGE_BASE_URL = 'knowledge_base.json';
    const MAX_CONTEXT_CHUNKS = 8;
    const MAX_HISTORY = 10;

    // --- State ---
    let knowledgeBase = null;
    let conversationHistory = [];
    let isOpen = false;
    let isLoading = false;

    // --- System prompt ---
    const SYSTEM_PROMPT = `You are a helpful assistant on Shreyas Grampurohit's personal academic website. 
You answer questions about Shreyas based on the provided context from his documents, CV, papers, and website content.
Be concise, friendly, and accurate. If the context doesn't contain enough information to answer, say so honestly.
Do not make up information. You can format responses with markdown.
Refer to Shreyas in third person unless quoting directly.`;

    // --- Knowledge Base Loading ---
    async function loadKnowledgeBase() {
        try {
            const response = await fetch(KNOWLEDGE_BASE_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            knowledgeBase = await response.json();
            console.log(`Chatbot: Loaded ${knowledgeBase.total_chunks} chunks from ${knowledgeBase.sources.length} sources`);
            return true;
        } catch (err) {
            console.warn('Chatbot: Could not load knowledge base:', err.message);
            return false;
        }
    }

    // --- Search / Retrieval ---
    function tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);
    }

    function computeTFIDF(query, chunks) {
        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return chunks.map(() => 0);

        // Document frequency
        const df = {};
        for (const chunk of chunks) {
            const tokens = new Set(tokenize(chunk.text));
            for (const token of tokens) {
                df[token] = (df[token] || 0) + 1;
            }
        }

        const N = chunks.length;
        const scores = chunks.map(chunk => {
            const chunkTokens = tokenize(chunk.text);
            const tf = {};
            for (const t of chunkTokens) {
                tf[t] = (tf[t] || 0) + 1;
            }
            let score = 0;
            for (const qt of queryTokens) {
                const termFreq = tf[qt] || 0;
                const docFreq = df[qt] || 0;
                if (termFreq > 0 && docFreq > 0) {
                    const idf = Math.log(N / docFreq);
                    score += (termFreq / chunkTokens.length) * idf;
                }
            }
            // Boost exact phrase matches
            if (chunk.text.toLowerCase().includes(query.toLowerCase())) {
                score *= 2;
            }
            return score;
        });

        return scores;
    }

    function searchKnowledge(query) {
        if (!knowledgeBase || !knowledgeBase.chunks.length) return [];

        const scores = computeTFIDF(query, knowledgeBase.chunks);
        const ranked = knowledgeBase.chunks
            .map((chunk, i) => ({ ...chunk, score: scores[i] }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, MAX_CONTEXT_CHUNKS);

        return ranked;
    }

    // --- Gemini API (via proxy) ---
    async function callGemini(query, contextChunks) {
        if (!PROXY_URL) throw new Error('Proxy URL not configured');

        const contextText = contextChunks.length > 0
            ? contextChunks.map(c => `[Source: ${c.source}]\n${c.text}`).join('\n\n---\n\n')
            : 'No specific context found in the knowledge base.';

        // Build messages
        const contents = [];

        // Add conversation history (limited)
        const recentHistory = conversationHistory.slice(-MAX_HISTORY);
        for (const msg of recentHistory) {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        }

        // Add current query with context
        const userMessage = `Context from Shreyas's documents:\n\n${contextText}\n\n---\n\nQuestion: ${query}`;
        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const body = {
            contents,
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.');
            throw new Error(err?.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) throw new Error('No response from Gemini');

        return reply;
    }

    // --- Chat Logic ---
    async function handleUserMessage(message) {
        if (isLoading) return;
        if (!message.trim()) return;

        // Add user message to UI and history
        appendMessage('user', message);
        conversationHistory.push({ role: 'user', text: message });

        isLoading = true;
        showTypingIndicator();

        try {
            // Search knowledge base
            const relevant = searchKnowledge(message);

            // Call Gemini
            const reply = await callGemini(message, relevant);

            removeTypingIndicator();
            appendMessage('bot', reply);
            conversationHistory.push({ role: 'assistant', text: reply });
        } catch (err) {
            removeTypingIndicator();
            appendMessage('bot', `⚠️ ${err.message}`, true);
        } finally {
            isLoading = false;
        }
    }

    // --- Markdown rendering (lightweight) ---
    function renderMarkdown(text) {
        let html = text
            // Code blocks
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Line breaks
            .replace(/\n/g, '<br>');
        return html;
    }

    // --- UI ---
    function createUI() {
        // Floating button
        const fab = document.createElement('button');
        fab.className = 'chatbot-fab';
        fab.id = 'chatbot-fab';
        fab.innerHTML = '<i class="fas fa-comment-dots"></i>';
        fab.setAttribute('aria-label', 'Open chat');
        fab.addEventListener('click', toggleChat);

        // Chat window
        const chatWindow = document.createElement('div');
        chatWindow.className = 'chatbot-window';
        chatWindow.id = 'chatbot-window';
        chatWindow.innerHTML = `
            <div class="chatbot-header">
                <div class="chatbot-header-info">
                    <div class="chatbot-avatar">SG</div>
                    <div>
                        <div class="chatbot-header-title">Chat with Shreyas's AI</div>
                        <div class="chatbot-header-subtitle">Ask about my research, experience, or skills</div>
                    </div>
                </div>
                <button class="chatbot-close" id="chatbot-close" aria-label="Close chat">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="chatbot-messages" id="chatbot-messages"></div>
            <div class="chatbot-input-area" id="chatbot-input-area">
                <textarea id="chatbot-input" placeholder="Ask me anything..." rows="1"></textarea>
                <button id="chatbot-send" aria-label="Send message">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;

        document.body.appendChild(fab);
        document.body.appendChild(chatWindow);

        // Event listeners
        document.getElementById('chatbot-close').addEventListener('click', toggleChat);
        document.getElementById('chatbot-send').addEventListener('click', sendMessage);
        
        const input = document.getElementById('chatbot-input');
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        input.addEventListener('input', autoResize);

        // Show welcome message on first open
        setTimeout(() => {
            if (document.getElementById('chatbot-messages').children.length === 0) {
                appendMessage('bot', "Hi! 👋 I'm an AI assistant for Shreyas's website. Ask me about his research, publications, experience, skills, or anything else you'd like to know!");
            }
        }, 100);
    }

    function toggleChat() {
        isOpen = !isOpen;
        const window = document.getElementById('chatbot-window');
        const fab = document.getElementById('chatbot-fab');
        window.classList.toggle('open', isOpen);
        fab.classList.toggle('active', isOpen);
        
        if (isOpen) {
            fab.innerHTML = '<i class="fas fa-times"></i>';
            const input = document.getElementById('chatbot-input');
            setTimeout(() => input.focus(), 300);
        } else {
            fab.innerHTML = '<i class="fas fa-comment-dots"></i>';
        }
    }

    function sendMessage() {
        const input = document.getElementById('chatbot-input');
        const msg = input.value.trim();
        if (!msg || isLoading) return;
        input.value = '';
        input.style.height = 'auto';
        handleUserMessage(msg);
    }

    function appendMessage(role, text, isError = false) {
        const container = document.getElementById('chatbot-messages');
        const bubble = document.createElement('div');
        bubble.className = `chatbot-msg chatbot-msg-${role}${isError ? ' chatbot-msg-error' : ''}`;
        
        if (role === 'bot') {
            bubble.innerHTML = renderMarkdown(text);
        } else {
            bubble.textContent = text;
        }

        container.appendChild(bubble);
        container.scrollTop = container.scrollHeight;
    }

    function showTypingIndicator() {
        const container = document.getElementById('chatbot-messages');
        const indicator = document.createElement('div');
        indicator.className = 'chatbot-msg chatbot-msg-bot chatbot-typing';
        indicator.id = 'chatbot-typing';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(indicator);
        container.scrollTop = container.scrollHeight;
    }

    function removeTypingIndicator() {
        const el = document.getElementById('chatbot-typing');
        if (el) el.remove();
    }

    function autoResize() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    }

    // --- Init ---
    async function init() {
        createUI();
        await loadKnowledgeBase();
    }

    // Public API
    return { init };
})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => Chatbot.init());
