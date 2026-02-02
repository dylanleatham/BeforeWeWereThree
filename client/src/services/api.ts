import type { ApiResponse, ValidatePinResponse, SessionResponse } from 'shared';

/**
 * API client for Before We Were Three
 * Base fetch wrapper with credentials for cookie handling
 */

const API_BASE = '/api';

/**
 * Base fetch wrapper
 * Includes credentials for cookie handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server',
      },
    };
  }
}

/**
 * Validate PIN and create session
 * @param pin - 8 digit PIN in MMDDYYYY format
 * @param deviceFingerprint - Device fingerprint
 * @returns API response with role and participant info
 */
export async function validatePin(
  pin: string,
  deviceFingerprint: string
): Promise<ApiResponse<ValidatePinResponse>> {
  return apiFetch<ValidatePinResponse>('/auth/validate-pin', {
    method: 'POST',
    body: JSON.stringify({ pin, deviceFingerprint }),
  });
}

/**
 * Get current session info
 * @returns API response with session info or 401 if not authenticated
 */
export async function getSession(): Promise<ApiResponse<SessionResponse>> {
  return apiFetch<SessionResponse>('/auth/session');
}

/**
 * Logout and clear session
 */
export async function logout(): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}
