/**
 * useSignalREvent hook tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockConnection = {
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('../../context/SignalRContext', () => ({
  useSignalRConnection: vi.fn(() => ({
    connection: mockConnection,
    isConnected: true,
  })),
}));

import { useSignalRConnection } from '../../context/SignalRContext';
import { useSignalREvent } from '../../hooks/useSignalREvent';

describe('useSignalREvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should subscribe to event on mount', () => {
    const handler = vi.fn();

    renderHook(() => useSignalREvent('testEvent', handler));

    expect(mockConnection.on).toHaveBeenCalledWith('testEvent', expect.any(Function));
  });

  it('should unsubscribe on unmount with the same handler reference', () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useSignalREvent('testEvent', handler));

    const registeredHandler = mockConnection.on.mock.calls[0]![1];
    unmount();

    // Verify off() is called with the exact same function reference as on()
    expect(mockConnection.off).toHaveBeenCalledWith('testEvent', registeredHandler);
  });

  it('should call handler when event fires', () => {
    const handler = vi.fn();

    renderHook(() => useSignalREvent<{ value: string }>('testEvent', handler));

    // Get the registered wrapper function and call it
    const registeredHandler = mockConnection.on.mock.calls[0]![1];
    registeredHandler({ value: 'hello' });

    expect(handler).toHaveBeenCalledWith({ value: 'hello' });
  });

  it('should use latest handler ref without resubscribing', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(
      ({ handler }) => useSignalREvent('testEvent', handler),
      { initialProps: { handler: handler1 } }
    );

    // First subscription
    expect(mockConnection.on).toHaveBeenCalledTimes(1);

    // Update handler
    rerender({ handler: handler2 });

    // Should not have re-subscribed (on only called once)
    expect(mockConnection.on).toHaveBeenCalledTimes(1);

    // But calling the registered handler should use handler2
    const registeredHandler = mockConnection.on.mock.calls[0]![1];
    registeredHandler('data');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith('data');
  });

  it('should not subscribe when connection is null', () => {
    vi.mocked(useSignalRConnection).mockReturnValue({
      connection: null,
      isConnected: false,
    } as ReturnType<typeof useSignalRConnection>);

    const handler = vi.fn();

    renderHook(() => useSignalREvent('testEvent', handler));

    expect(mockConnection.on).not.toHaveBeenCalled();
  });
});
