import { db } from '../connection.js';

/**
 * Database queries for app configuration
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

// Config keys for PIN storage
const CONFIG_KEYS = {
  GUEST_PIN: 'guest_pin',
  ADMIN_PIN: 'admin_pin',
} as const;

/**
 * Get the stored guest PIN
 * @returns Guest PIN string or null if not set
 */
export async function getGuestPin(): Promise<string | null> {
  const config = await db.appConfig.findUnique({
    where: { key: CONFIG_KEYS.GUEST_PIN },
  });
  return config?.value ?? null;
}

/**
 * Get the stored admin PIN
 * @returns Admin PIN string or null if not set
 */
export async function getAdminPin(): Promise<string | null> {
  const config = await db.appConfig.findUnique({
    where: { key: CONFIG_KEYS.ADMIN_PIN },
  });
  return config?.value ?? null;
}

/**
 * Set a PIN value in the config
 * @param key - 'guest_pin' or 'admin_pin'
 * @param value - The PIN value (8 digit MMDDYYYY format)
 */
export async function setPin(key: typeof CONFIG_KEYS.GUEST_PIN | typeof CONFIG_KEYS.ADMIN_PIN, value: string): Promise<void> {
  await db.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

/**
 * Get a config value by key
 * @param key - Config key
 * @returns Config value or null
 */
export async function getConfig(key: string): Promise<string | null> {
  const config = await db.appConfig.findUnique({
    where: { key },
  });
  return config?.value ?? null;
}

/**
 * Set a config value
 * @param key - Config key
 * @param value - Config value
 */
export async function setConfig(key: string, value: string): Promise<void> {
  await db.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
