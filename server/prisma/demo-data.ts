/**
 * Fixed values for the local demo (see seed-demo.ts): PINs, reveal keys and
 * participant identities that scripts can use to sign in as each person.
 */

/** Demo PINs (MMDDYYYY, like the real ones) */
export const DEMO_PINS = {
  guest: '06012026',
  admin: '06022026',
  friendMaya: '07012026',
  friendJordan: '07022026',
  friendSam: '07032026',
} as const;

/** Gender-reveal keys each partner enters */
export const DEMO_REVEAL_KEYS = { keyA: '09142019', keyB: '05302021' } as const;

/** Fixed participant IDs so scripts can mint sessions for them */
export const DEMO_PARTICIPANTS = {
  a: { id: '00000000-0000-4000-8000-00000000000a', fingerprint: 'demo-device-a', designation: 'A' },
  b: { id: '00000000-0000-4000-8000-00000000000b', fingerprint: 'demo-device-b', designation: 'B' },
  admin: { id: '00000000-0000-4000-8000-0000000000ad', fingerprint: 'demo-device-admin' },
  maya: { id: '00000000-0000-4000-8000-0000000000f1', fingerprint: 'demo-device-maya', friendId: '00000000-0000-4000-8000-00000000f001' },
} as const;
