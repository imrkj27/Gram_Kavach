import http from 'http';
import fs from 'fs';
import path from 'path';
import express from 'express';
import app, { ROOT_DIR, getRuntimeConfig } from './app.mjs';

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const HOST = '0.0.0.0';
const httpServer = http.createServer(app);

async function startUnifiedServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.join(ROOT_DIR, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: ROOT_DIR,
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    const { apiKey } = getRuntimeConfig();
    console.log(
      `[Gram Kawach] Unified Web App & API listening on http://${HOST}:${PORT} (engine: ${
        apiKey ? 'gemini-live' : 'gram-kawach-shield'
      })`
    );
  });
}

startUnifiedServer().catch((err) => {
  console.error('Failed to start Gram Kawach server:', err);
  process.exit(1);
});
