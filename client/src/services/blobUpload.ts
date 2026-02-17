/**
 * Direct XHR upload to Azure Blob Storage.
 *
 * The Azure SDK's BlockBlobClient.uploadData uses the Fetch API internally,
 * which does not support upload progress events in browsers. XHR's
 * upload.onprogress provides granular, real-time progress tracking.
 *
 * Azure Blob Storage accepts a simple PUT with the blob body and required
 * headers — no SDK needed for the upload itself.
 */

interface UploadOptions {
  onProgress?: (percent: number) => void;
}

interface BlobUploadResult {
  xhr: XMLHttpRequest;
  promise: Promise<void>;
}

/**
 * Upload a file to Azure Blob Storage via XHR PUT with progress tracking.
 * The SAS URL already contains all auth info as query parameters.
 *
 * Returns { xhr, promise } so the caller can abort during upload.
 */
export function uploadToBlob(
  sasUrl: string,
  file: File,
  options?: UploadOptions
): BlobUploadResult {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && options?.onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        options.onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to a network error'));
    });

    xhr.addEventListener('abort', () => {
      const abortError = new Error('Upload aborted');
      abortError.name = 'AbortError';
      reject(abortError);
    });

    xhr.open('PUT', sasUrl);
    xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });

  return { xhr, promise };
}
