# Shreyas Grampurohit - Personal Website

Academic website with AI-powered chatbot built with vanilla HTML/CSS/JS and Google Gemini API.

## Features

- 📄 Responsive portfolio design
- 🤖 RAG-based chatbot with knowledge from your documents
- 📝 Publications, research, projects, and experience sections
- 🎨 Professional academic styling

## Live Site

Visit: [https://shreyasgrampurohit.github.io/website/](https://shreyasgrampurohit.github.io/website/)

## Chatbot Setup

The chatbot uses a Cloudflare Worker proxy to securely call Google Gemini API (your API key stays server-side).

### 1. Deploy the Cloudflare Worker

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) (free account)
2. Navigate to **Workers & Pages** → **Create Application** → **Create Worker**
3. Name it (e.g., `gemini-proxy`) and click **Deploy**
4. Click **Edit code** and replace all content with the code from `cloudflare-worker.js`
5. Go to **Settings** → **Variables** → **Add variable**:
   - Name: `GEMINI_API_KEY`
   - Value: Your [Gemini API key](https://aistudio.google.com/apikey)
   - Click **Encrypt**
6. Click **Save and deploy**
7. Copy your worker URL (e.g., `https://gemini-proxy.your-subdomain.workers.dev`)

### 2. Update Your Website Config

Edit `config.js` and replace the placeholder with your worker URL:

```js
const CONFIG = {
    PROXY_URL: 'https://gemini-proxy.your-subdomain.workers.dev',
};
```

Commit and push the change.

### Adding Materials

1. Add your documents to the `materials/` folder (PDFs, markdown, text, etc.)
2. Run the build script to update the knowledge base:
   ```bash
   python build_knowledge.py
   ```
3. Commit and push the updated `knowledge_base.json`

### Requirements

Install Python dependencies:
```bash
pip install PyPDF2
```

### Rebuilding Knowledge Base

Anytime you:
- Add new files to `materials/`
- Update your CV
- Change content in `index.html`

Run:
```bash
python build_knowledge.py
```

This creates/updates `knowledge_base.json` which the chatbot uses for context.

## File Structure

```
.
├── index.html              # Main website
├── style.css               # Styling
├── script.js               # UI interactions
├── chatbot.js              # Chatbot logic
├── config.js               # Proxy URL configuration
├── cloudflare-worker.js    # Worker code (deploy to Cloudflare)
├── build_knowledge.py      # Knowledge base builder
├── knowledge_base.json     # Pre-built search index
├── materials/              # Your documents (PDFs, papers, etc.)
├── CV.pdf                  # Your CV
└── profile.jpeg            # Profile photo
```

## Customization

- **Colors**: Edit CSS variables in `style.css`
- **Content**: Update `index.html`
- **Chatbot behavior**: Modify `SYSTEM_PROMPT` in `chatbot.js`
- **Search settings**: Adjust `CHUNK_SIZE`, `MAX_CONTEXT_CHUNKS` in `build_knowledge.py` or `chatbot.js`

## Tech Stack

- HTML5, CSS3, JavaScript (ES6+)
- Google Gemini API for LLM responses
- Cloudflare Workers for secure API proxy
- TF-IDF for document retrieval
- PyPDF2 for PDF processing
- GitHub Pages for hosting

## License

Personal academic website © 2026 Shreyas Grampurohit
