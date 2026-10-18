import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp } from 'firebase-admin/app';

/**
 * Connects the server to Firebase as an admin.
 * - On Render: the service account key's JSON is pasted into the FIREBASE_SERVICE_ACCOUNT setting.
 * - On your computer: GOOGLE_APPLICATION_CREDENTIALS in .env points at firebase-admin-key.json.
 * The key is loaded explicitly so staff sign-in tokens are signed locally (no extra Google APIs needed).
 */
export function initFirebaseAdmin() {
  if (getApps().length) return;
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const json = process.env.FIREBASE_SERVICE_ACCOUNT ?? (file ? readFileSync(file, 'utf8') : null);
  initializeApp(json ? { credential: cert(JSON.parse(json)) } : undefined);
}
