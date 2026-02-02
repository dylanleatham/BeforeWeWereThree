/**
 * Standard API response types
 * Per CLAUDE.md: All responses use consistent shape
 */

/**
 * Standard API error shape
 */
export interface ApiError {
  code: string;
  message: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Helper to create success response
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/**
 * Helper to create error response
 */
export function errorResponse(code: string, message: string): ApiErrorResponse {
  return { success: false, error: { code, message } };
}
