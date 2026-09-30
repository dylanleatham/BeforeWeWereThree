/**
 * Tracks which partners (designation A or B) are present in each activity room.
 *
 * Kept free of any transport so it can be tested directly: the Socket.io adapter feeds it
 * join/leave events and broadcasts what it reports. Azure SignalR's REST (serverless) mode
 * never sees connections, so presence is only available over Socket.io.
 *
 * A partner may have several sockets in a room (two tabs, a reconnect racing a disconnect),
 * so arrival and departure are reported only for the first and last socket.
 */
export class PresenceTracker {
  /** room -> userId -> socketIds */
  private readonly rooms = new Map<string, Map<string, Set<string>>>();

  /** Records a partner's socket in a room. `arrived` is true if they weren't already there. */
  join(room: string, userId: string, socketId: string): { arrived: boolean } {
    let users = this.rooms.get(room);
    if (!users) {
      users = new Map();
      this.rooms.set(room, users);
    }
    let sockets = users.get(userId);
    const arrived = !sockets || sockets.size === 0;
    if (!sockets) {
      sockets = new Set();
      users.set(userId, sockets);
    }
    sockets.add(socketId);
    return { arrived };
  }

  /** Records a socket leaving a room. `departed` is true if it was the partner's last one there. */
  leave(room: string, userId: string, socketId: string): { departed: boolean } {
    const users = this.rooms.get(room);
    const sockets = users?.get(userId);
    if (!users || !sockets?.delete(socketId)) return { departed: false };
    if (sockets.size > 0) return { departed: false };
    users.delete(userId);
    if (users.size === 0) this.rooms.delete(room);
    return { departed: true };
  }

  /** The partner other than `userId` currently in the room, if any */
  otherPartner(room: string, userId: string): string | null {
    for (const id of this.rooms.get(room)?.keys() ?? []) {
      if (id !== userId) return id;
    }
    return null;
  }
}
