// Loads .env (if present) for local runs. Import this first, before anything that uses Firebase.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
