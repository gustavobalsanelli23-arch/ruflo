#!/usr/bin/env node
/**
 * Gera o hash da senha de um administrador para FUTZONE_ADMIN_n_PASSWORD_HASH.
 * A senha é digitada sem aparecer na tela e nunca é gravada em disco.
 *
 *   npm run admin:hash
 */
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';

const ITERATIONS = 600_000;

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) return reject(new Error('Execute em um terminal interativo.'));
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      if (ch === '\u0003') process.exit(130);
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off('data', onData);
        stdout.write('\n');
        return resolve(value);
      }
      if (ch === '\u007f') value = value.slice(0, -1);
      else value += ch;
    };
    stdin.on('data', onData);
  });
}

const problems = (pw) => [
  pw.length < 12 && 'pelo menos 12 caracteres',
  !(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) && 'letras maiúsculas e minúsculas',
  !/\d/.test(pw) && 'um número',
  !/[^A-Za-z0-9]/.test(pw) && 'um símbolo',
].filter(Boolean);

const password = await readHidden('Senha do administrador: ');
const issues = problems(password);
if (issues.length) {
  console.error(`Senha fraca. Ela precisa de: ${issues.join(', ')}.`);
  process.exit(1);
}
if ((await readHidden('Confirme a senha: ')) !== password) {
  console.error('As senhas não conferem.');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
console.log(`\npbkdf2-sha256:${ITERATIONS}:${salt.toString('base64url')}:${hash.toString('base64url')}\n`);
console.log('Copie a linha acima para FUTZONE_ADMIN_n_PASSWORD_HASH.');
