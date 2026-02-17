import { db } from '../connection.js';
import { Prisma } from '@prisma/client';
import type { Photo as PrismaPhoto } from '@prisma/client';
import type { Photo } from 'shared';

/**
 * Database queries for Photo records
 * Uses typed query functions per CLAUDE.md (no raw SQL in handlers)
 */

/**
 * Transform Prisma Photo to API Photo
 * Converts Date objects to ISO strings for transport
 */
function toApiPhoto(photo: PrismaPhoto): Photo {
  return {
    id: photo.id,
    blobUrl: photo.blobUrl,
    filename: photo.filename,
    contentType: photo.contentType,
    uploadedById: photo.uploadedById,
    createdAt: photo.createdAt.toISOString(),
  };
}

/**
 * Get photo by ID
 */
export async function getPhotoById(id: string): Promise<Photo | null> {
  const photo = await db.photo.findUnique({
    where: { id },
  });
  return photo ? toApiPhoto(photo) : null;
}

/**
 * Get photo by blob URL
 */
export async function getPhotoByBlobUrl(blobUrl: string): Promise<Photo | null> {
  const photo = await db.photo.findUnique({
    where: { blobUrl },
  });
  return photo ? toApiPhoto(photo) : null;
}

/**
 * Get all photos
 */
export async function getAllPhotos(): Promise<Photo[]> {
  const photos = await db.photo.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return photos.map(toApiPhoto);
}

/**
 * Get photos uploaded by a specific participant
 */
export async function getPhotosByUploader(uploadedById: string): Promise<Photo[]> {
  const photos = await db.photo.findMany({
    where: { uploadedById },
    orderBy: { createdAt: 'desc' },
  });
  return photos.map(toApiPhoto);
}

/**
 * Create photo record (after successful blob upload)
 */
export async function createPhoto(data: {
  blobUrl: string;
  filename: string;
  contentType: string;
  uploadedById: string;
}): Promise<Photo> {
  const photo = await db.photo.create({
    data: {
      blobUrl: data.blobUrl,
      filename: data.filename,
      contentType: data.contentType,
      uploadedById: data.uploadedById,
    },
  });
  return toApiPhoto(photo);
}

/**
 * Delete photo record by ID
 */
export async function deletePhotoById(id: string): Promise<Photo | null> {
  try {
    const photo = await db.photo.delete({
      where: { id },
    });
    return toApiPhoto(photo);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return null;
    }
    throw error;
  }
}
