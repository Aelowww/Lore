// First-time setup of a new Firebase project:  npm run seed
// Adds the starting menu and promo codes, and creates the staff accounts with new PINs.
// Safe to run again: it never overwrites an existing menu or staff account.
import '../server/env';
import { publishMenuChange, seed } from '../server/db';

const created = await seed();
await publishMenuChange();
console.log('Menu and promo codes are ready.');
if (created.length) {
  console.log('\nStaff PINs (shown only this once — write them down):');
  for (const s of created) console.log(`  ${s.name}: ${s.pin}`);
  console.log('\nChange one any time with: npm run set-pin -- manager <4 digits>');
} else {
  console.log('Staff accounts already exist. Use npm run set-pin to change a PIN.');
}
