// Starts the API, plus the built website when dist/ exists (npm run build).
// Locally: npm run dev (API on :3001, website on :5180). On Vercel the API runs from api/index.ts instead.
import './env.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import { app } from './app.js';

const dist = path.resolve('dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, () => console.log(`☕ Lore listening on http://localhost:${port}`));
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — is Lore already running in another terminal? Close it and try again.`);
    process.exit(1);
  }
  throw err;
});
