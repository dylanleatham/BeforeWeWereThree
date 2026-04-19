import archiver from 'archiver';
import sharp from 'sharp';
import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type {
  MemoriesDataResponse,
  MemoryLetter,
  MemoryWyrResult,
  MemoryPhotoPrompt,
  MemoryNameMatch,
  MemoryTriviaResult,
  MemoryGenderReveal,
  MemoryFriendLetter,
  MemoryPhoto,
} from 'shared';
import { logger } from '../utils/logger.js';

/**
 * Memories export service
 * Generates an HTML keepsake with photos referenced from a sibling folder,
 * bundled together in a zip archive.
 */

// Concurrency limit for fetching photos from Azure Blob Storage
const PHOTO_FETCH_CONCURRENCY = 5;

/** Formats that browsers can render natively */
const BROWSER_NATIVE_FORMATS = new Set(['jpeg', 'png', 'gif', 'webp']);

/**
 * Fetch a remote image, detecting its actual format from content (not headers).
 * iPhone photos are often HEIC stored with a .jpeg extension and image/jpeg
 * content-type. Only non-browser formats are converted to JPEG via sharp.
 */
async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const raw = Buffer.from(await response.arrayBuffer());

    const metadata = await sharp(raw).metadata();
    const format = metadata.format ?? 'unknown';

    if (BROWSER_NATIVE_FORMATS.has(format)) {
      return raw;
    }

    // Non-native (HEIC, DNG, TIFF, etc.) — resize and convert to JPEG.
    // Raw formats like DNG can be 50MB+ at full resolution; capping at 2048px
    // keeps conversion fast and output size reasonable for a keepsake.
    return await sharp(raw)
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (error) {
    logger.warn('Failed to fetch/convert image for export', { url, error });
    return null;
  }
}

/**
 * Process items with concurrency limit
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

/** Escape HTML special characters */
function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sanitize a string for use in a filename */
function sanitize(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '-');
}

/** Placeholder extension for photo map — actual ext determined at fetch time */
function extFromUrl(_url: string): string {
  return 'jpg';
}

/**
 * Build a map from original blob URL -> local filename in photos/ folder.
 * This map is used by both the HTML generator (for <img src>) and the
 * zip builder (for archive entries).
 */
function buildPhotoMap(data: MemoriesDataResponse): Map<string, string> {
  const map = new Map<string, string>();

  data.photos.forEach((photo, i) => {
    map.set(photo.url, `photos/photo-${i + 1}.${extFromUrl(photo.url)}`);
  });

  for (const letter of data.letters) {
    if (letter.photoUrl && !map.has(letter.photoUrl)) {
      map.set(letter.photoUrl, `photos/letter-${sanitize(letter.envelopeTitle)}.${extFromUrl(letter.photoUrl)}`);
    }
  }

  for (const fl of data.friendLetters) {
    if (fl.mediaUrl && !map.has(fl.mediaUrl)) {
      map.set(fl.mediaUrl, `photos/friend-letter-${sanitize(fl.friendName)}.${extFromUrl(fl.mediaUrl)}`);
    }
  }

  for (const pp of data.photoPrompts) {
    for (const r of pp.responses) {
      if (r.photoUrl && !map.has(r.photoUrl)) {
        map.set(r.photoUrl, `photos/prompt-${sanitize(pp.envelopeTitle)}-${sanitize(r.participantDesignation)}.${extFromUrl(r.photoUrl)}`);
      }
    }
  }

  return map;
}

// ---------- HTML section builders ----------

function renderLetters(letters: MemoryLetter[], photos: Map<string, string>): string {
  if (letters.length === 0) return '';
  const cards = letters.map((letter) => {
    const src = letter.photoUrl ? photos.get(letter.photoUrl) : undefined;
    const photo = src
      ? `<img src="${esc(src)}" alt="Letter photo" class="memory-card__photo" />`
      : '';
    return `
      <div class="memory-card">
        <div class="memory-card__header">
          <span class="memory-card__label">${esc(letter.envelopeTitle)}</span>
          <span class="text-small text-muted">${esc(letter.participantDesignation)}</span>
        </div>
        <p class="text-small text-muted memory-card__prompt">${esc(letter.prompt)}</p>
        <p class="memory-card__content">${esc(letter.content)}</p>
        ${photo}
      </div>`;
  }).join('');

  return renderSection('Letters to Baby', cards);
}

function renderWyr(results: MemoryWyrResult[]): string {
  if (results.length === 0) return '';
  const cards = results.map((wyr) => {
    const sameChoice = wyr.voteA && wyr.voteB && wyr.voteA === wyr.voteB;
    const matchClass = sameChoice ? 'memory-wyr__match' : 'memory-wyr__different';
    const matchText = sameChoice ? 'You agreed!' : 'Different choices!';
    return `
      <div class="memory-card">
        <span class="memory-card__label">${esc(wyr.envelopeTitle)}</span>
        <div class="memory-wyr">
          <div class="memory-wyr__option${wyr.voteA ? ' memory-wyr__option--chosen' : ''}">
            <span>${esc(wyr.optionA)}</span>
            ${wyr.voteA ? `<span class="text-small text-muted">${esc(wyr.voteA)}</span>` : ''}
          </div>
          <div class="memory-wyr__option${wyr.voteB ? ' memory-wyr__option--chosen' : ''}">
            <span>${esc(wyr.optionB)}</span>
            ${wyr.voteB ? `<span class="text-small text-muted">${esc(wyr.voteB)}</span>` : ''}
          </div>
        </div>
        <span class="text-small ${matchClass}">${matchText}</span>
      </div>`;
  }).join('');

  return renderSection('Would You Rather', cards);
}

function renderPhotoPrompts(prompts: MemoryPhotoPrompt[], photos: Map<string, string>): string {
  if (prompts.length === 0) return '';
  const cards = prompts.map((pp) => {
    const responses = pp.responses.map((r) => {
      const src = r.photoUrl ? photos.get(r.photoUrl) : undefined;
      const photo = src
        ? `<img src="${esc(src)}" alt="${esc(r.participantDesignation)}'s photo" class="memory-card__photo" />`
        : '';
      return `
        <div class="memory-photos__item">
          ${photo}
          <span class="text-small text-muted">${esc(r.participantDesignation)}</span>
        </div>`;
    }).join('');

    return `
      <div class="memory-card">
        <span class="memory-card__label">${esc(pp.envelopeTitle)}</span>
        <p class="text-small text-muted">${esc(pp.prompt)}</p>
        <div class="memory-photos__grid">${responses}</div>
      </div>`;
  }).join('');

  return renderSection('Photo Prompts', cards);
}

function renderPhotoGallery(galleryPhotos: MemoryPhoto[], photos: Map<string, string>): string {
  if (galleryPhotos.length === 0) return '';
  const items = galleryPhotos.map((photo, i) => {
    const src = photos.get(photo.url);
    if (!src) return '';
    return `
      <div class="memory-photos__item">
        <img src="${esc(src)}" alt="${esc(photo.caption ?? `Photo ${i + 1}`)}" class="memory-card__photo" />
      </div>`;
  }).join('');

  return renderSection('Photo Gallery', `<div class="memory-photos__grid">${items}</div>`);
}

function renderNames(names: MemoryNameMatch[]): string {
  if (names.length === 0) return '';
  const items = names.map((n) => `<li class="memory-names__item">${esc(n.name)}</li>`).join('');
  return renderSection('Names We Both Loved', `
    <div class="memory-card">
      <ul class="memory-names">${items}</ul>
    </div>`);
}

function renderTrivia(results: MemoryTriviaResult[]): string {
  if (results.length === 0) return '';
  const lines = results.map((r) =>
    `<p>${esc(r.participantDesignation)}: ${r.correctCount} / ${r.totalCount} correct</p>`
  ).join('');
  return renderSection('Trivia Scores', `<div class="memory-card">${lines}</div>`);
}

function renderGenderReveal(reveal: MemoryGenderReveal | null): string {
  if (!reveal?.genderValue) return '';
  const label = reveal.genderValue === 'boy' ? "It's a Boy!" : "It's a Girl!";
  return renderSection('Gender Reveal', `
    <div class="memory-card memory-card--gender">
      <h3 class="memory-gender__value">${esc(label)}</h3>
    </div>`);
}

function renderFriendLetters(letters: MemoryFriendLetter[], photos: Map<string, string>): string {
  if (letters.length === 0) return '';
  const cards = letters.map((fl) => {
    const src = fl.mediaUrl ? photos.get(fl.mediaUrl) : undefined;
    const photo = src
      ? `<img src="${esc(src)}" alt="Photo from ${esc(fl.friendName)}" class="memory-card__photo" />`
      : '';
    return `
      <div class="memory-card">
        <div class="memory-card__header">
          <span class="memory-card__label">From ${esc(fl.friendName)}</span>
          <span class="text-small text-muted">to ${esc(fl.recipient)}</span>
        </div>
        <p class="memory-card__content">${esc(fl.content)}</p>
        ${photo}
      </div>`;
  }).join('');

  return renderSection('Letters from Friends', cards);
}

function renderSection(title: string, content: string): string {
  return `
    <section class="memory-section">
      <h2 class="memory-section__title">${esc(title)}</h2>
      <div class="memory-section__content">${content}</div>
    </section>`;
}

/**
 * Generate an HTML keepsake that references images from a sibling photos/ folder.
 * Must be opened from the extracted zip so relative paths resolve.
 */
export function generateMemoriesHtml(data: MemoriesDataResponse, photos: Map<string, string>): string {
  const closedDate = new Date(data.closedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sections = [
    renderLetters(data.letters, photos),
    renderWyr(data.wyrResults),
    renderPhotoPrompts(data.photoPrompts, photos),
    renderPhotoGallery(data.photos, photos),
    renderNames(data.nameMatches),
    renderTrivia(data.triviaResults),
    renderGenderReveal(data.genderReveal),
    renderFriendLetters(data.friendLetters, photos),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Before We Were Three — Our Memories</title>
  <style>
    /* Reset & base */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Source Sans 3', 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #333;
      line-height: 1.5;
    }

    /* Memories View — Golden Hour Scrapbook Style */
    .memories-view {
      min-height: 100vh;
      background: #FAF3E8;
      padding: 1rem;
      padding-bottom: 2rem;
    }

    .memories-view__header {
      text-align: center;
      margin-bottom: 2rem;
      padding-top: 0.5rem;
    }

    .memories-view__title {
      font-family: 'Fraunces', Georgia, serif;
      color: #BC6C4A;
      margin: 0.5rem 0 0.25rem;
      font-size: 2rem;
    }

    .memories-view__date {
      display: block;
      margin-bottom: 1rem;
      color: #888;
    }

    .memories-view__sections {
      display: flex;
      flex-direction: column;
      gap: 2rem;
      max-width: 640px;
      margin: 0 auto;
    }

    /* Section */
    .memory-section__title {
      font-family: 'Fraunces', Georgia, serif;
      color: #BC6C4A;
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #F4A261;
    }

    .memory-section__content {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    /* Cards */
    .memory-card {
      background: white;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(244, 162, 97, 0.2);
    }

    .memory-card__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.5rem;
    }

    .memory-card__label {
      font-weight: 600;
      color: #BC6C4A;
    }

    .memory-card__prompt {
      font-style: italic;
      margin-bottom: 0.5rem;
    }

    .memory-card__content {
      white-space: pre-wrap;
      line-height: 1.6;
    }

    .memory-card__photo {
      width: 100%;
      object-fit: contain;
      border-radius: 8px;
      margin-top: 0.75rem;
    }

    .memory-card--gender {
      text-align: center;
      padding: 1.5rem;
    }

    /* Text helpers */
    .text-small { font-size: 0.875rem; }
    .text-muted { color: #888; }

    /* WYR */
    .memory-wyr {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }

    .memory-wyr__option {
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      background: #FAF3E8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .memory-wyr__option--chosen {
      border-left: 3px solid #F4A261;
    }

    .memory-wyr__match {
      color: #9DB5A0;
      font-weight: 600;
    }

    .memory-wyr__different {
      color: #E07A5F;
    }

    /* Photos grid */
    .memory-photos__grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
    }

    .memory-photos__item {
      text-align: center;
    }

    /* Names */
    .memory-names {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .memory-names__item {
      background: #FAF3E8;
      padding: 0.375rem 0.75rem;
      border-radius: 20px;
      border: 1px solid #F4A261;
    }

    /* Gender reveal */
    .memory-gender__value {
      font-family: 'Fraunces', Georgia, serif;
      color: #E07A5F;
      font-size: 1.5rem;
    }

    /* Print styles */
    @media print {
      .memories-view { padding: 0; }
      .memory-card { break-inside: avoid; }
      .memory-card__photo { max-height: 400px; }
    }
  </style>
</head>
<body>
  <div class="memories-view">
    <header class="memories-view__header">
      <h1 class="memories-view__title">Our Memories</h1>
      <span class="memories-view__date">${esc(closedDate)}</span>
    </header>
    <div class="memories-view__sections">
      ${sections}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate a zip archive containing the HTML keepsake and all photos.
 * The HTML references photos via relative paths (photos/filename.ext),
 * so the zip must be extracted before opening.
 */
export async function generateMemoriesZip(data: MemoriesDataResponse): Promise<Readable> {
  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    logger.error('Archive error', { error: err });
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  // Build a single URL -> local filename map used by both HTML and zip entries
  const photoMap = buildPhotoMap(data);

  // Generate HTML keepsake (references photos/ via relative paths)
  const html = generateMemoriesHtml(data, photoMap);
  archive.append(html, { name: 'Before We Were Three.html' });

  // Fetch all photos and add to the archive
  const entries = Array.from(photoMap.entries());
  await mapWithConcurrency(entries, PHOTO_FETCH_CONCURRENCY, async ([url, filename]) => {
    const buffer = await fetchImage(url);
    if (buffer) {
      archive.append(buffer, { name: filename });
    }
  });

  archive.finalize();

  return passthrough;
}
