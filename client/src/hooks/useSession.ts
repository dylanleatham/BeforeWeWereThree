import { useState, useEffect, useCallback } from 'react';
import type { Role, Designation } from 'shared';
import { validatePin as apiValidatePin, getSession, logout as apiLogout } from '../services/api';
import { getDeviceFingerprint } from '../services/fingerprint';
import { STRINGS } from '../constants/strings';

/**
 * Session state interface
 */
interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  participantId: string | null;
  designation: Designation | null;
  friendId: string | null;
  error: string | null;
}

/**
 * Session hook return type
 */
interface UseSessionReturn extends SessionState {
  login: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  clearError: () => void;
}

/**
 * Session management hook
 * Handles authentication state and PIN validation
 */
export function useSession(): UseSessionReturn {
  const [state, setState] = useState<SessionState>({
    isLoading: true,
    isAuthenticated: false,
    role: null,
    participantId: null,
    designation: null,
    friendId: null,
    error: null,
  });

  // Listen for session-expired events (stale session after admin reset)
  useEffect(() => {
    const handleSessionExpired = () => {
      setState({
        isLoading: false,
        isAuthenticated: false,
        role: null,
        participantId: null,
        designation: null,
        friendId: null,
        error: null,
      });
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await getSession();

        if (response.success) {
          setState({
            isLoading: false,
            isAuthenticated: true,
            role: response.data.role,
            participantId: response.data.participantId,
            designation: response.data.designation,
            friendId: response.data.friendId ?? null,
            error: null,
          });
        } else {
          // Not authenticated, but not an error
          setState({
            isLoading: false,
            isAuthenticated: false,
            role: null,
            participantId: null,
            designation: null,
            friendId: null,
            error: null,
          });
        }
      } catch {
        // Network error — show error instead of silently showing PIN screen
        setState({
          isLoading: false,
          isAuthenticated: false,
          role: null,
          participantId: null,
          designation: null,
          friendId: null,
          error: STRINGS.SESSION_ERROR_NETWORK,
        });
      }
    }

    checkSession();
  }, []);

  /**
   * Login with PIN
   * @param pin - 8 digit PIN
   * @returns Success status and error message if failed
   */
  const login = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const fingerprint = await getDeviceFingerprint();
      const response = await apiValidatePin(pin, fingerprint);

      if (response.success) {
        setState({
          isLoading: false,
          isAuthenticated: true,
          role: response.data.role,
          participantId: response.data.participantId,
          designation: response.data.designation,
          friendId: response.data.friendId ?? null,
          error: null,
        });
        return { success: true };
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: response.error.message,
        }));
        return { success: false, error: response.error.message };
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: STRINGS.SESSION_ERROR_NETWORK,
      }));
      return { success: false, error: STRINGS.SESSION_ERROR_NETWORK };
    }
  }, []);

  /**
   * Logout and clear session
   * Clears local state immediately, then invalidates the server session.
   * If the API call fails, clears the session cookie client-side to prevent
   * auto-reauthentication on refresh.
   */
  const logout = useCallback(async () => {
    // Clear local state immediately so UI updates instantly
    setState({
      isLoading: false,
      isAuthenticated: false,
      role: null,
      participantId: null,
      designation: null,
      friendId: null,
      error: null,
    });

    try {
      await apiLogout();
    } catch {
      // Server session invalidation failed — clear cookie client-side
      // so the user isn't auto-authenticated on next page load
      document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    logout,
    clearError,
  };
}
