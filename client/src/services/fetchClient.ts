import type { ApiResponse } from 'shared';
import { STRINGS } from '../constants/strings';

const API_BASE = '/api';

/**
 * Base fetch wrapper
 * Includes credentials for cookie handling and proper HTTP status checking
 */
export async function apiFetch<T>(
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

    // Check if response is OK before parsing JSON
    if (!response.ok) {
      // Try to parse error response as JSON
      try {
        const errorData = await response.json();
        if (errorData && typeof errorData === 'object' && 'error' in errorData) {
          // Detect stale session after admin reset — notify app to return to PIN entry
          if (errorData.error?.code === 'SESSION_EXPIRED') {
            window.dispatchEvent(new CustomEvent('session-expired'));
          }
          return errorData as ApiResponse<T>;
        }
      } catch {
        // Response is not JSON (e.g., HTML error page)
      }

      // Return generic error based on status code
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: response.statusText || `Request failed with status ${response.status}`,
        },
      };
    }

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API error:', error);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: STRINGS.API_ERROR_NETWORK,
      },
    };
  }
}
