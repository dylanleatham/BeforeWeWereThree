import FingerprintJS, { Agent } from '@fingerprintjs/fingerprintjs';

/**
 * Device fingerprinting service
 * Uses FingerprintJS to generate a unique device identifier
 * Cached in memory to avoid regenerating on each use
 */

let cachedFingerprint: string | null = null;
let fpPromise: Promise<Agent> | null = null;

/**
 * Initialize FingerprintJS agent (lazy load)
 */
function getAgent(): Promise<Agent> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  return fpPromise;
}

/**
 * Get the device fingerprint
 * Generates once and caches for subsequent calls
 * @returns Device fingerprint string
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    const agent = await getAgent();
    const result = await agent.get();
    const fingerprint = result.visitorId;
    cachedFingerprint = fingerprint;
    return fingerprint;
  } catch (error) {
    // Fallback: generate a persistent random ID if fingerprinting fails
    console.error('Fingerprinting failed, using fallback:', error);
    const storageKey = 'bwwt-device-fingerprint';
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      cachedFingerprint = stored;
    } else {
      cachedFingerprint = `fallback-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      localStorage.setItem(storageKey, cachedFingerprint);
    }
    return cachedFingerprint;
  }
}

/**
 * Clear cached fingerprint (for testing)
 */
export function clearCachedFingerprint(): void {
  cachedFingerprint = null;
}
