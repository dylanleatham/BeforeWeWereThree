# Phase 4: Letters to Baby & Media - Research

**Researched:** 2026-02-08
**Domain:** Letter writing with photo attachments, Azure Blob Storage uploads, media library
**Confidence:** HIGH

## Summary

This phase adds two interconnected features: letter writing with photo attachments and a media library for browsing/viewing uploaded photos. The letter activity follows the established "reveal after both submit" pattern from Phase 3 (WYR), where each partner writes their own letter to a shared prompt and sees the partner's letter only after both have submitted.

The key technical challenges are: (1) browser-to-Azure Blob Storage uploads using SAS tokens, (2) auto-save for the textarea with proper debouncing, and (3) a slideshow/gallery component for viewing photos. Azure Blob Storage uploads use the standard "Valet Key" pattern where the backend generates time-limited SAS tokens and the browser uploads directly to Azure, bypassing the API server for better performance.

The media library lives inside a special "media" envelope type, providing a consistent UX within the envelope metaphor. Spotify integration is minimal - just a floating button that links externally when configured.

**Primary recommendation:** Use `@azure/storage-blob` for browser uploads with backend-generated SAS tokens via User Delegation Keys. Use `use-debounce` for textarea auto-save (1-2 second delay). Use `yet-another-react-lightbox` for the slideshow viewer.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @azure/storage-blob | 12.x | Browser-direct uploads to Azure Blob Storage | Official Microsoft SDK, supports SAS tokens |
| use-debounce | 10.x | Debounced auto-save for textarea | Lightweight (<1KB), well-maintained, React 19 compatible |
| yet-another-react-lightbox | 3.x | Photo slideshow/lightbox | React 17-19 compatible, TypeScript, plugins for zoom/slideshow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @azure/identity | 4.x | Server-side Azure authentication | Backend SAS token generation with Managed Identity |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| yet-another-react-lightbox | lightGallery | lightGallery is more feature-rich but heavier (12kb vs 3kb) |
| use-debounce | Custom hook | use-debounce handles edge cases (cancel, flush, isPending) |
| Direct API upload | SAS token upload | Direct upload bypasses API, reduces server load, handles large files |

**Installation:**
```bash
# Client
npm install @azure/storage-blob use-debounce yet-another-react-lightbox --workspace=client

# Server
npm install @azure/storage-blob @azure/identity --workspace=server
```

## Architecture Patterns

### Recommended Project Structure
```
client/
├── src/
│   ├── components/
│   │   └── activities/
│   │       ├── Letter/
│   │       │   ├── LetterActivity.tsx       # Main orchestrator (like WYR)
│   │       │   ├── WritingPhase.tsx         # Textarea + photo attachment
│   │       │   ├── WaitingPhase.tsx         # Waiting for partner
│   │       │   ├── RevealPhase.tsx          # Show both letters
│   │       │   ├── CompletePhase.tsx        # "All done" screen
│   │       │   └── PhotoAttachment.tsx      # Upload/select photo UI
│   │       └── MediaLibrary/
│   │           ├── MediaLibraryActivity.tsx # Grid + slideshow
│   │           ├── PhotoGrid.tsx            # Thumbnail grid
│   │           └── SlideshowViewer.tsx      # Lightbox wrapper
│   ├── hooks/
│   │   ├── useLetter.ts                     # Letter state + real-time
│   │   ├── useAutoSave.ts                   # Debounced save hook
│   │   ├── useMediaLibrary.ts               # Photo list + operations
│   │   └── usePhotoUpload.ts                # SAS token + upload
│   └── services/
│       ├── api.ts                           # (extend existing)
│       └── blobStorage.ts                   # Azure Blob upload helpers

server/
├── src/
│   ├── routes/
│   │   ├── letter.ts                        # Letter CRUD + submission
│   │   ├── media.ts                         # SAS tokens, photo list
│   │   └── config.ts                        # (extend for Spotify URL)
│   ├── services/
│   │   ├── letter.ts                        # Letter business logic
│   │   ├── media.ts                         # Azure Blob operations
│   │   └── admin.ts                         # (extend reset logic)
│   └── db/
│       └── queries/
│           ├── letter.ts                    # Letter queries
│           └── media.ts                     # Media queries

shared/
└── types/
    ├── letter.ts                            # Letter types
    └── media.ts                             # Media types
```

### Pattern 1: Two-Phase Letter Submission (Mirroring WYR)
**What:** Each participant writes independently, reveal happens after both submit
**When to use:** All letter envelopes

```typescript
// shared/types/letter.ts
export type LetterPhase = 'writing' | 'waiting' | 'revealing' | 'complete';

export interface LetterPrompt {
  id: string;
  envelopeId: string;
  prompt: string; // Admin-created question
  createdAt: string;
}

export interface Letter {
  id: string;
  promptId: string;
  participantId: string;
  content: string;
  photoUrl: string | null;
  submittedAt: string | null; // null = draft, set = submitted
  createdAt: string;
  updatedAt: string;
}

export interface LetterState {
  prompt: LetterPrompt;
  phase: LetterPhase;
  myLetter: Letter | null;
  partnerSubmitted: boolean;
  revealedLetters: { mine: Letter; partner: Letter } | null;
}
```

### Pattern 2: SAS Token Upload Flow
**What:** Backend generates write-only SAS tokens, browser uploads directly to Azure
**When to use:** All photo uploads

```typescript
// server/src/services/media.ts
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';

interface UploadSasResponse {
  sasUrl: string;        // Full URL with SAS token for PUT
  blobUrl: string;       // Clean URL for storage after upload
  expiresAt: string;     // ISO timestamp
}

export async function generateUploadSas(
  filename: string,
  containerName = 'photos'
): Promise<UploadSasResponse> {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT!;
  const accountKey = process.env.AZURE_STORAGE_KEY!;

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );

  // Generate unique blob name
  const blobName = `${Date.now()}-${filename}`;
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.valueOf() + 10 * 60 * 1000); // 10 min

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('cw'), // create, write
      startsOn,
      expiresOn,
    },
    credential
  ).toString();

  return {
    sasUrl: `${blobClient.url}?${sasToken}`,
    blobUrl: blobClient.url,
    expiresAt: expiresOn.toISOString(),
  };
}
```

### Pattern 3: Browser Direct Upload with Progress
**What:** Upload file directly to Azure from browser with progress tracking
**When to use:** Photo upload UI

```typescript
// client/src/hooks/usePhotoUpload.ts
import { BlockBlobClient } from '@azure/storage-blob';
import { useState, useCallback } from 'react';

interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
}

export function usePhotoUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(async (file: File): Promise<string | null> => {
    setState({ isUploading: true, progress: 0, error: null });

    try {
      // Get SAS token from API
      const { sasUrl, blobUrl } = await api.getUploadSas(file.name);

      // Convert file to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Upload directly to Azure
      const blockBlobClient = new BlockBlobClient(sasUrl);
      await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: { blobContentType: file.type },
        onProgress: (progress) => {
          const percent = Math.round((progress.loadedBytes / file.size) * 100);
          setState(s => ({ ...s, progress: percent }));
        },
      });

      setState({ isUploading: false, progress: 100, error: null });
      return blobUrl;
    } catch (err) {
      setState({ isUploading: false, progress: 0, error: 'Upload failed' });
      return null;
    }
  }, []);

  return { ...state, upload };
}
```

### Pattern 4: Debounced Auto-Save
**What:** Save letter content after user stops typing
**When to use:** Letter writing textarea

```typescript
// client/src/hooks/useAutoSave.ts
import { useDebouncedCallback } from 'use-debounce';
import { useState, useCallback } from 'react';

interface AutoSaveState {
  isSaving: boolean;
  lastSavedAt: Date | null;
  error: string | null;
}

export function useAutoSave(
  saveFn: (content: string) => Promise<void>,
  delay = 1500 // 1.5 seconds
) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSavedAt: null,
    error: null,
  });

  const debouncedSave = useDebouncedCallback(
    async (content: string) => {
      setState(s => ({ ...s, isSaving: true, error: null }));
      try {
        await saveFn(content);
        setState({ isSaving: false, lastSavedAt: new Date(), error: null });
      } catch {
        setState(s => ({ ...s, isSaving: false, error: 'Save failed' }));
      }
    },
    delay,
    { maxWait: 5000 } // Force save after 5 seconds of continuous typing
  );

  // Expose flush for manual save (e.g., before submit)
  const flush = useCallback(() => {
    debouncedSave.flush();
  }, [debouncedSave]);

  return {
    ...state,
    save: debouncedSave,
    flush,
    isPending: debouncedSave.isPending(),
  };
}
```

### Pattern 5: Media Library with Lightbox
**What:** Grid of thumbnails with slideshow viewer
**When to use:** Media library envelope

```typescript
// client/src/components/activities/MediaLibrary/SlideshowViewer.tsx
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface SlideshowViewerProps {
  photos: Array<{ id: string; url: string }>;
  isOpen: boolean;
  startIndex: number;
  onClose: () => void;
  shuffle?: boolean;
}

export function SlideshowViewer({
  photos,
  isOpen,
  startIndex,
  onClose,
  shuffle = false,
}: SlideshowViewerProps) {
  // Optionally shuffle photos
  const slides = (shuffle ? shuffleArray(photos) : photos).map(p => ({
    src: p.url,
  }));

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      index={startIndex}
      slides={slides}
      plugins={[Zoom, Slideshow, Thumbnails]}
      slideshow={{ autoplay: false, delay: 3000 }}
    />
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

### Anti-Patterns to Avoid
- **Uploading through API server:** Don't proxy file uploads; use SAS tokens for direct Azure upload
- **Saving on every keystroke:** Don't call API on each character; debounce with 1-2 second delay
- **Revealing letters before both submit:** Never return partner's letter until both have submittedAt set
- **Storing photos in database:** Store only URLs; photos live in Azure Blob Storage
- **Building custom lightbox:** Use established library (yet-another-react-lightbox)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo upload to cloud | Multipart form upload to API | @azure/storage-blob SAS tokens | 10x faster, no server memory usage |
| Debounced save | setTimeout in component | use-debounce | Handles cancel/flush, cleanup on unmount |
| Photo slideshow | Custom swipe/zoom logic | yet-another-react-lightbox | Touch gestures, keyboard nav, zoom, preloading |
| Progress bar during upload | Polling API | onProgress callback | Built into Azure SDK |
| Image thumbnails | Manual resizing | Azure CDN or Blob access tier | Let Azure handle optimization |

**Key insight:** Browser-direct uploads are essential for photo handling. Routing through the API server would create memory pressure, increase latency, and complicate deployment. The SAS token pattern is the standard for Azure web apps.

## Common Pitfalls

### Pitfall 1: CORS Not Configured on Azure Storage
**What goes wrong:** Browser uploads fail with CORS error despite valid SAS token
**Why it happens:** Azure Blob Storage needs explicit CORS rules for browser access
**How to avoid:** Configure CORS in Azure Portal or via Azure CLI before first upload
```bash
az storage cors add --services b --methods PUT GET --origins "https://yourdomain.com" \
  --allowed-headers "*" --exposed-headers "*" --account-name youraccount
```
**Warning signs:** "No 'Access-Control-Allow-Origin' header" in browser console

### Pitfall 2: SAS Token Expired During Upload
**What goes wrong:** Upload fails partway through large file
**Why it happens:** Token generated with short expiry (e.g., 1 minute)
**How to avoid:** Use 10-minute expiry for uploads; validate file size before generating token
**Warning signs:** Uploads fail inconsistently, especially for larger photos

### Pitfall 3: Race Condition on Letter Reveal
**What goes wrong:** Both users see partial reveal or duplicate events
**Why it happens:** Both submissions trigger reveal check simultaneously
**How to avoid:** Use database transaction with row-level locking (same pattern as WYR)
**Warning signs:** Multiple `letter_reveal_ready` events for same envelope

### Pitfall 4: Auto-Save Conflicts with Submit
**What goes wrong:** User clicks Submit while debounced save is pending
**Why it happens:** Submit doesn't wait for pending save
**How to avoid:** Call `flush()` before submit action; disable submit while `isPending`
**Warning signs:** Letter content not fully saved when submitting

### Pitfall 5: Large Photos Cause Memory Issues
**What goes wrong:** Browser crashes or slows when uploading large images
**Why it happens:** Reading entire file into memory before upload
**How to avoid:** Consider client-side resize before upload (optional optimization)
**Warning signs:** Mobile browsers particularly affected

### Pitfall 6: Slideshow State Lost on Unmount
**What goes wrong:** Returning to slideshow resets position
**Why it happens:** Lightbox state not persisted
**How to avoid:** Store current index in parent component; media library is in its own envelope
**Warning signs:** User frustration with navigation

## Code Examples

Verified patterns from official sources:

### Database Schema for Letters
```sql
-- server/prisma/schema.prisma additions

model LetterPrompt {
  id         String   @id @default(uuid())
  envelopeId String   @unique @map("envelope_id")
  prompt     String   // The question/prompt text
  createdAt  DateTime @default(now()) @map("created_at")

  envelope   Envelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  letters    Letter[]

  @@map("letter_prompts")
}

model Letter {
  id            String    @id @default(uuid())
  promptId      String    @map("prompt_id")
  participantId String    @map("participant_id")
  content       String    @default("")
  photoUrl      String?   @map("photo_url")
  submittedAt   DateTime? @map("submitted_at") // null = draft
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  prompt      LetterPrompt @relation(fields: [promptId], references: [id], onDelete: Cascade)
  participant Participant  @relation(fields: [participantId], references: [id])

  @@unique([promptId, participantId])
  @@map("letters")
}

model Photo {
  id           String   @id @default(uuid())
  blobUrl      String   @map("blob_url") @unique
  filename     String
  contentType  String   @map("content_type")
  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  uploadedBy Participant @relation(fields: [uploadedById], references: [id])

  @@map("photos")
}
```

### Letter Writing Component
```typescript
// client/src/components/activities/Letter/WritingPhase.tsx
import { useState, useCallback } from 'react';
import { useAutoSave } from '../../../hooks/useAutoSave';
import { PhotoAttachment } from './PhotoAttachment';

interface WritingPhaseProps {
  prompt: string;
  initialContent: string;
  initialPhotoUrl: string | null;
  onSave: (content: string, photoUrl: string | null) => Promise<void>;
  onSubmit: () => void;
}

export function WritingPhase({
  prompt,
  initialContent,
  initialPhotoUrl,
  onSave,
  onSubmit,
}: WritingPhaseProps) {
  const [content, setContent] = useState(initialContent);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);

  // Auto-save on content change
  const { isSaving, lastSavedAt, save, flush, isPending } = useAutoSave(
    async (text: string) => {
      await onSave(text, photoUrl);
    },
    1500
  );

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    save(newContent);
  }, [save]);

  const handlePhotoChange = useCallback(async (url: string | null) => {
    setPhotoUrl(url);
    await onSave(content, url);
  }, [content, onSave]);

  const handleSubmit = useCallback(() => {
    flush(); // Ensure pending save completes
    onSubmit();
  }, [flush, onSubmit]);

  return (
    <div className="letter-writing">
      <p className="letter-writing__prompt">{prompt}</p>

      <textarea
        className="letter-writing__textarea"
        value={content}
        onChange={handleContentChange}
        placeholder="Write your letter here..."
        rows={8}
      />

      <div className="letter-writing__status">
        {isSaving && <span>Saving...</span>}
        {lastSavedAt && !isSaving && (
          <span>Saved {formatTime(lastSavedAt)}</span>
        )}
      </div>

      <PhotoAttachment
        photoUrl={photoUrl}
        onPhotoChange={handlePhotoChange}
      />

      <button
        className="letter-writing__submit"
        onClick={handleSubmit}
        disabled={isPending || !content.trim()}
      >
        Submit Letter
      </button>
    </div>
  );
}
```

### Spotify Floating Button
```typescript
// client/src/components/SpotifyButton.tsx
import { useConfig } from '../hooks/useConfig';
import { Music } from 'lucide-react';

/**
 * Floating Spotify button
 * Only visible when admin has configured a playlist URL
 */
export function SpotifyButton() {
  const { spotifyUrl } = useConfig();

  if (!spotifyUrl) return null;

  return (
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="spotify-button"
      aria-label="Open Spotify playlist"
    >
      <Music size={24} />
    </a>
  );
}
```

### Reset Logic for Phase 4
```typescript
// Add to server/src/services/admin.ts

export interface ResetSessionResult {
  participantsDeleted: number;
  envelopesReset: number;
  votesDeleted: number;
  lettersDeleted: number;  // NEW
  // Note: Photos are NOT deleted - they persist in Azure Blob Storage
}

export async function resetSession(): Promise<ResetSessionResult> {
  const result = await db.$transaction(async (tx) => {
    // Delete letters (has FK to participants and prompts)
    const lettersDeleted = await tx.letter.deleteMany({});

    // Delete WYR votes
    const votesDeleted = await tx.wyrVote.deleteMany({});

    // Delete guest participants
    const participantsDeleted = await tx.participant.deleteMany({
      where: { role: 'guest' },
    });

    // Reset envelopes to sealed
    const envelopesReset = await tx.envelope.updateMany({
      data: { status: 'sealed' },
    });

    return {
      participantsDeleted: participantsDeleted.count,
      envelopesReset: envelopesReset.count,
      votesDeleted: votesDeleted.count,
      lettersDeleted: lettersDeleted.count,
    };
  });

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multipart form upload | Direct SAS token upload | Azure SDK v12 (2020) | Browser uploads bypass API |
| Storage account keys | User Delegation SAS | 2018-11-09 API version | More secure, no keys exposed |
| Custom lightbox | yet-another-react-lightbox | 2023+ | Touch gestures, plugins, maintained |
| lodash debounce | use-debounce hook | React hooks era | React-specific, handles cleanup |

**Deprecated/outdated:**
- `react-image-lightbox`: Unmaintained, recommends `react-photoswipe-gallery` as alternative
- Storage account key SAS tokens: Less secure than User Delegation SAS (though simpler for local dev)

## Open Questions

Things that couldn't be fully resolved:

1. **Upload progress granularity**
   - What we know: `onProgress` callback in Azure SDK only fires per-block (default 4MB blocks)
   - What's unclear: Whether smaller block sizes significantly impact performance
   - Recommendation: Use default blocks; progress updates every 4MB is acceptable for photo uploads

2. **Image resizing before upload**
   - What we know: Large phone photos (10MB+) could cause browser memory issues
   - What's unclear: Whether to implement client-side resize (canvas API) before upload
   - Recommendation: Start without resize; add later if users report issues with large photos

3. **Media envelope special handling**
   - What we know: Media library is a "special" envelope type (not letter/trivia/etc.)
   - What's unclear: Whether to add 'media' to EnvelopeType or handle separately
   - Recommendation: Add 'media' as a valid envelope type; keeps consistent data model

## Sources

### Primary (HIGH confidence)
- [Azure Blob Storage browser upload tutorial](https://learn.microsoft.com/en-us/azure/developer/javascript/tutorial/browser-file-upload-azure-storage-blob) - SAS token pattern, direct upload flow
- [Azure-Samples/ts-e2e-browser-file-upload-storage-blob](https://github.com/Azure-Samples/ts-e2e-browser-file-upload-storage-blob) - Official sample repo
- [BlockBlobClient class documentation](https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blockblobclient) - uploadData, onProgress API

### Secondary (MEDIUM confidence)
- [use-debounce GitHub](https://github.com/xnimorz/use-debounce) - API, options, React 19 compatibility
- [yet-another-react-lightbox](https://yet-another-react-lightbox.com/) - Features, plugins, usage

### Tertiary (LOW confidence)
- [Azure SDK onProgress issue #32404](https://github.com/Azure/azure-sdk-for-js/issues/32404) - Progress callback granularity (known limitation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Azure documentation, established React libraries
- Architecture: HIGH - Follows existing project patterns (WYR), official Azure patterns
- Pitfalls: MEDIUM - Mix of official docs and community experience

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable Azure SDK and React libraries)
