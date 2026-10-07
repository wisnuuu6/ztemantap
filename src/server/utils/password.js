import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedValue) {
  if (!storedValue || typeof storedValue !== 'string') {
    return false;
  }

  const [algo, salt, storedHash] = storedValue.split(':');
  if (algo !== 'scrypt' || !salt || !storedHash) {
    return false;
  }

  const candidateHash = scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
