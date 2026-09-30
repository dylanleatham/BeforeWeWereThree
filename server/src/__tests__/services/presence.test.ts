/**
 * PresenceTracker tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PresenceTracker } from '../../services/presence.js';

const ROOM = 'activity:env-1';

describe('PresenceTracker', () => {
  let presence: PresenceTracker;

  beforeEach(() => {
    presence = new PresenceTracker();
  });

  it('reports arrival for a partner\'s first socket only', () => {
    expect(presence.join(ROOM, 'a', 's1').arrived).toBe(true);
    expect(presence.join(ROOM, 'a', 's2').arrived).toBe(false);
  });

  it('treats the same socket joining twice as one presence', () => {
    presence.join(ROOM, 'a', 's1');
    expect(presence.join(ROOM, 'a', 's1').arrived).toBe(false);
    expect(presence.leave(ROOM, 'a', 's1').departed).toBe(true);
  });

  it('reports departure only when the partner\'s last socket leaves', () => {
    presence.join(ROOM, 'a', 's1');
    presence.join(ROOM, 'a', 's2');
    expect(presence.leave(ROOM, 'a', 's1').departed).toBe(false);
    expect(presence.leave(ROOM, 'a', 's2').departed).toBe(true);
  });

  it('ignores a socket that was never in the room', () => {
    presence.join(ROOM, 'a', 's1');
    expect(presence.leave(ROOM, 'a', 'unknown').departed).toBe(false);
    expect(presence.leave('activity:other', 'a', 's1').departed).toBe(false);
    expect(presence.otherPartner(ROOM, 'b')).toBe('a');
  });

  it('finds the other partner in the room, never yourself', () => {
    expect(presence.otherPartner(ROOM, 'a')).toBeNull();
    presence.join(ROOM, 'a', 's1');
    expect(presence.otherPartner(ROOM, 'a')).toBeNull();
    presence.join(ROOM, 'b', 's2');
    expect(presence.otherPartner(ROOM, 'a')).toBe('b');
    expect(presence.otherPartner(ROOM, 'b')).toBe('a');
  });

  it('keeps rooms independent', () => {
    presence.join(ROOM, 'a', 's1');
    presence.join('activity:env-2', 'b', 's2');
    expect(presence.otherPartner(ROOM, 'b')).toBe('a');
    expect(presence.otherPartner('activity:env-2', 'a')).toBe('b');
  });

  it('forgets a partner once they have left', () => {
    presence.join(ROOM, 'a', 's1');
    presence.leave(ROOM, 'a', 's1');
    expect(presence.otherPartner(ROOM, 'b')).toBeNull();
    expect(presence.join(ROOM, 'a', 's3').arrived).toBe(true);
  });
});
