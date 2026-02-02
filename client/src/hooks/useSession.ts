import { useState, useEffect, useCallback } from 'react';
import type { Role, Designation } from 'shared';
import { validatePin as apiValidatePin, getSession, logout as apiLogout } from '../services/api';
import { getDeviceFingerprint } from '../services/fingerprint';

/**
 * Session state interface
 */
interface SessionState {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  participantId: string | null;
  designation: Designation | null;
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
    error: null,
  });

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
            error: null,
          });
        }
      } catch (error) {
        setState({
          isLoading: false,
          isAuthenticated: false,
          role: null,
          participantId: null,
          designation: null,
          error: null,
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
    } catch (error) {
      const errorMessage = 'Unable to connect to server';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    // Clear local state immediately
    setState({
      isLoading: false,
      isAuthenticated: false,
      role: null,
      participantId: null,
      designation: null,
      error: null,
    });

    // Call logout API (fire and forget)
    apiLogout();
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
