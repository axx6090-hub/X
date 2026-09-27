import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';
function secret(prompt) {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal.');
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const done = () => { process.stdin.removeListener('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const onKey = (input, key = {}) => {
      if (key.ctrl && key.name === 'c') { done(); reject(new Error('Cancelled')); }
      else if (key.name === 'return') { done(); resolve(value); }
      else if (key.name === 'backspace') value = value.slice(0, -1);
      else if (input && !key.ctrl && !key.meta && !/[\u0000-\u001f]/.test(input)) value += input;
    };
    process.stdin.on('keypress', onKey);
  });
}
try {
  const password = await secret('New admin password (hidden, at least 14 characters): ');
  if (password.length < 14 || password.length > 256) throw new Error('Use 14–256 characters.');
  if (password !== await secret('Confirm password (hidden): ')) throw new Error('Passwords do not match.');
  const salt = randomBytes(16);
  const hash = 'pbkdf2-sha256$100000$' + salt.toString('hex') + '$' + pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  console.log('\nSave this complete value as the ADMIN_PASSWORD_HASH secret. Never commit it.\n');
  console.log(hash);
} catch (e) { console.error(e.message); process.exitCode = 1; }
