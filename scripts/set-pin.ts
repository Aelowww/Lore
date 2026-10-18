// Change a staff PIN:  npm run set-pin -- manager 4821
import '../server/env';
import { setStaffPin } from '../server/db';

const [id, pin] = process.argv.slice(2);
if (!id || !pin) {
  console.error('Usage: npm run set-pin -- <cashier|manager> <4-digit PIN>');
  process.exit(1);
}
try {
  await setStaffPin(id, pin);
  console.log(`PIN for "${id}" updated.`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
