import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
} from '@azure/storage-blob';
import {
  getPhotoById,
  createPhoto as createPhotoRecord,
  deletePhotoById,
} from '../db/queries/media.js';
import type { Photo, UploadSasResponse } from 'shared';
import { logger } from '../utils/logger.js';

/**
 * Media service for Azure Blob Storage operations
 * Handles SAS token generation and photo management
 */

// Constants
const CONTAINER_NAME = 'photos';
const SAS_EXPIRY_MINUTES = 10;

/**
 * Get Azure Storage configuration from environment
 * Throws if required env vars are missing
 */
function getStorageConfig(): { accountName: string; accountKey: string } {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT;
  const accountKey = process.env.AZURE_STORAGE_KEY;

  if (!accountName || !accountKey) {
    throw new Error(
      'Azure Storage not configured. Set AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY environment variables.'
    );
  }

  return { accountName, accountKey };
}

/**
 * Create Azure Blob Service client with shared key credential
 */
function createBlobServiceClient(): {
  client: BlobServiceClient;
  credential: StorageSharedKeyCredential;
  accountName: string;
} {
  const { accountName, accountKey } = getStorageConfig();
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const client = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
  return { client, credential, accountName };
}

/**
 * Sanitize filename for blob storage
 * Removes special characters, keeps extension
 */
function sanitizeFilename(filename: string): string {
  // Get extension
  const parts = filename.split('.');
  const ext = parts.length > 1 ? `.${parts.pop()}` : '';
  const baseName = parts.join('.');

  // Remove special characters, replace spaces with hyphens
  const sanitized = baseName
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  return sanitized + ext;
}

/**
 * Generate a unique blob name
 */
function generateBlobName(filename: string): string {
  const sanitized = sanitizeFilename(filename);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}-${sanitized}`;
}

/**
 * Generate SAS token for browser upload
 * Returns URL with token for PUT request and the final blob URL
 */
export async function generateUploadSas(
  filename: string,
  contentType: string
): Promise<UploadSasResponse> {
  const { credential, accountName } = createBlobServiceClient();

  const blobName = generateBlobName(filename);
  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + SAS_EXPIRY_MINUTES * 60 * 1000);

  // Generate SAS token with create and write permissions
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // create, write
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
      contentType, // Set content type header
    },
    credential
  ).toString();

  const blobUrl = `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}`;
  const sasUrl = `${blobUrl}?${sasToken}`;

  logger.debug('Generated SAS token for upload', {
    filename,
    blobName,
    expiresAt: expiresOn.toISOString(),
  });

  return {
    sasUrl,
    blobUrl,
    expiresAt: expiresOn.toISOString(),
  };
}

/**
 * Delete photo from Azure Blob Storage
 * Parses blob name from URL and deletes it
 */
export async function deletePhotoFromBlob(blobUrl: string): Promise<void> {
  const { client } = createBlobServiceClient();

  // Parse blob name from URL
  // Format: https://{account}.blob.core.windows.net/{container}/{blobName}
  const url = new URL(blobUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (pathParts.length < 2) {
    throw new Error(`Invalid blob URL: ${blobUrl}`);
  }

  const containerName = pathParts[0];
  const blobName = pathParts.slice(1).join('/');

  const containerClient = client.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  logger.debug('Deleting blob from storage', { containerName, blobName });

  await blobClient.deleteIfExists();
}

/**
 * Register a photo in the database after successful upload
 */
export async function registerPhoto(
  blobUrl: string,
  filename: string,
  contentType: string,
  uploadedById: string
): Promise<Photo> {
  return createPhotoRecord({
    blobUrl,
    filename,
    contentType,
    uploadedById,
  });
}

/**
 * Remove a photo completely (from blob storage and database)
 */
export async function removePhoto(photoId: string): Promise<Photo | null> {
  // Get photo first to get blob URL
  const photo = await getPhotoById(photoId);
  if (!photo) {
    return null;
  }

  // Delete from blob storage
  try {
    await deletePhotoFromBlob(photo.blobUrl);
  } catch (error) {
    // Log but continue - blob might already be deleted
    logger.warn('Failed to delete blob from storage', {
      photoId,
      blobUrl: photo.blobUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Delete from database
  return deletePhotoById(photoId);
}

/**
 * Check if Azure Storage is configured
 * Useful for graceful degradation
 */
export function isStorageConfigured(): boolean {
  return !!(process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY);
}
