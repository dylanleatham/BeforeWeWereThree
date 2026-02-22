import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Hash a key using scrypt with a random salt.
 * Returns a string in the format "salt:hash" (both hex-encoded).
 */
export async function hashKey(key: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/**
 * Verify a plaintext key against a stored "salt:hash" string.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyKey(key: string, storedHash: string): Promise<boolean> {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const storedDerived = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(key, salt, KEY_LENGTH)) as Buffer;

  if (derived.length !== storedDerived.length) return false;
  return timingSafeEqual(derived, storedDerived);
}
