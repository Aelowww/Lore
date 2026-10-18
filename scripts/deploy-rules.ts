// Upload firestore.rules to Firebase:  npm run deploy:rules
// Uses the same service account key as the server, so no `firebase login` is needed.
import '../server/env.js';
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const project = `projects/${process.env.VITE_FIREBASE_PROJECT_ID ?? 'lore-coffee-station'}`;
const api = 'https://firebaserules.googleapis.com/v1';
const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();

const { data: ruleset } = await client.request<{ name: string }>({
  url: `${api}/${project}/rulesets`,
  method: 'POST',
  data: { source: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } },
});
const release = `${project}/releases/cloud.firestore`;
await client.request({ url: `${api}/${release}`, method: 'PATCH', data: { release: { name: release, rulesetName: ruleset.name } } });
console.log('Firestore rules are live.');
