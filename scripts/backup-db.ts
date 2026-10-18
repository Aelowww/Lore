// Save a copy of every Firestore collection to backups/lore-<date>.json:  npm run backup
import '../server/env.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { dumpAll } from '../server/db.js';

const data = await dumpAll();
mkdirSync('backups', { recursive: true });
const file = path.resolve('backups', `lore-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);
writeFileSync(file, JSON.stringify(data, null, 2));
const counts = Object.entries(data).map(([k, v]) => `${k} ${v.length}`).join(', ');
console.log(`Backup saved to ${file}\n(${counts})`);
