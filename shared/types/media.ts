import { z } from 'zod';

/**
 * Media types for Before We Were Three
 * Defines the data model for photo uploads to Azure Blob Storage
 */

/**
 * Photo metadata (API response format)
 */
export interface Photo {
  id: string;
  blobUrl: string;
  filename: string;
  contentType: string;
  uploadedById: string;
  createdAt: string;
}

/**
 * SAS token response for browser uploads
 * Client uses sasUrl to PUT the file directly to Azure Blob Storage
 */
export interface UploadSasResponse {
  /** Full URL with SAS token for PUT request */
  sasUrl: string;
  /** The blob URL without SAS token (for storage after upload) */
  blobUrl: string;
  /** When the SAS token expires (ISO string) */
  expiresAt: string;
}

/**
 * GET /api/media response
 */
export interface PhotoListResponse {
  photos: Photo[];
}

/**
 * POST /api/media/register request
 * After uploading to blob storage, register the photo in the database
 */
export interface RegisterPhotoRequest {
  blobUrl: string;
  filename: string;
  contentType: string;
}

// ============================================================
// Zod Schemas for validation
// ============================================================

/**
 * Request for SAS token generation
 * Accepts image, video, and audio content types
 */
export const generateSasSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  contentType: z
    .string()
    .min(1, 'Content type is required')
    .refine(
      (ct) => ct.startsWith('image/') || ct.startsWith('video/') || ct.startsWith('audio/'),
      { message: 'Only image, video, and audio files are allowed' }
    ),
});

export type GenerateSasRequest = z.infer<typeof generateSasSchema>;

/**
 * Register photo after upload
 */
export const registerPhotoSchema = z.object({
  blobUrl: z.string().url('Invalid blob URL'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  contentType: z.string().min(1, 'Content type is required'),
});

export type RegisterPhotoRequestValidated = z.infer<typeof registerPhotoSchema>;
