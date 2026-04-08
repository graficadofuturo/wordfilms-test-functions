import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to proxy Notion requests
  app.get('/api/notion-tasks', async (req, res) => {
    const NOTION_KEY = req.query.key as string;
    const PAGE_ID = req.query.pageId as string;

    if (!NOTION_KEY || !PAGE_ID) {
      return res.status(400).json({ error: 'Missing Notion Key or Page ID' });
    }

    try {
      const response = await fetch(`https://api.notion.com/v1/blocks/${PAGE_ID}/children`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${NOTION_KEY}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Notion API Error:', response.status, errorData);
        return res.status(response.status).json({ error: `Notion API Error: ${response.statusText}`, details: errorData });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Proxy Error:', error);
      res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  });

  // API Route for Gemini Chat (Proxy to bypass client-side interceptors)
  app.post('/api/chat', async (req, res) => {
    try {
      const { history, message, apiKey, systemInstruction } = req.body;

      if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required' });
      }

      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [...history, { role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: 'Failed to generate response', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
