import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type { MemoriesDataResponse } from 'shared';
import { logger } from '../utils/logger.js';

/**
 * Memories export service
 * Generates PDF and zip files for the babymoon keepsake
 */

// Concurrency limit for fetching photos from Azure Blob Storage
const PHOTO_FETCH_CONCURRENCY = 5;

/**
 * Fetch a remote image as a Buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.warn('Failed to fetch image for export', { url, error });
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

// --- PDF layout constants ---
const MARGIN = 50;
const PAGE_WIDTH = 612; // US Letter
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  if (doc.y > 650) doc.addPage();
  doc
    .moveDown(1.5)
    .font('Times-Bold')
    .fontSize(18)
    .text(title, MARGIN, undefined, { width: CONTENT_WIDTH })
    .moveDown(0.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor('#F4A261')
    .lineWidth(1)
    .stroke()
    .moveDown(0.5);
}

function addBodyText(doc: PDFKit.PDFDocument, text: string): void {
  doc.font('Helvetica').fontSize(11).text(text, MARGIN, undefined, { width: CONTENT_WIDTH });
}

function addLabel(doc: PDFKit.PDFDocument, label: string): void {
  doc.font('Helvetica-Bold').fontSize(11).text(label, MARGIN, undefined, {
    width: CONTENT_WIDTH,
    continued: false,
  });
}

/**
 * Generate a PDF document from memories data
 */
export async function generateMemoriesPdf(data: MemoriesDataResponse): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'letter',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      info: {
        Title: 'Before We Were Three',
        Author: 'Before We Were Three App',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // === Cover Page ===
    doc.moveDown(6);
    doc
      .font('Times-Bold')
      .fontSize(32)
      .text('Before We Were Three', MARGIN, undefined, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

    doc.moveDown(1);
    doc
      .font('Times-Roman')
      .fontSize(14)
      .fillColor('#666666')
      .text('Our Babymoon Memories', MARGIN, undefined, {
        width: CONTENT_WIDTH,
        align: 'center',
      });

    doc.moveDown(0.5);
    const closedDate = new Date(data.closedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(closedDate, MARGIN, undefined, { width: CONTENT_WIDTH, align: 'center' });
    doc.fillColor('#000000');

    // === Letters Section ===
    if (data.letters.length > 0) {
      doc.addPage();
      addSectionHeader(doc, 'Letters to Baby');

      for (const letter of data.letters) {
        if (doc.y > 600) doc.addPage();
        addLabel(doc, `${letter.envelopeTitle} — ${letter.participantDesignation}`);
        doc.moveDown(0.3);
        doc.font('Helvetica-Oblique').fontSize(10).text(`Prompt: ${letter.prompt}`, MARGIN, undefined, { width: CONTENT_WIDTH });
        doc.moveDown(0.3);
        addBodyText(doc, letter.content);
        doc.moveDown(1);
      }
    }

    // === Would You Rather Section ===
    if (data.wyrResults.length > 0) {
      doc.addPage();
      addSectionHeader(doc, 'Would You Rather');

      for (const wyr of data.wyrResults) {
        if (doc.y > 650) doc.addPage();
        addLabel(doc, wyr.envelopeTitle);
        doc.moveDown(0.3);
        const aVoters = wyr.voteA ?? '—';
        const bVoters = wyr.voteB ?? '—';
        addBodyText(doc, `A: ${wyr.optionA} (${aVoters})`);
        addBodyText(doc, `B: ${wyr.optionB} (${bVoters})`);
        doc.moveDown(0.8);
      }
    }

    // === Names We Loved Section ===
    if (data.nameMatches.length > 0) {
      doc.addPage();
      addSectionHeader(doc, 'Names We Both Loved');

      for (const name of data.nameMatches) {
        addBodyText(doc, `• ${name.name}`);
      }
      doc.moveDown(1);
    }

    // === Trivia Scores ===
    if (data.triviaResults.length > 0) {
      addSectionHeader(doc, 'Trivia Scores');

      for (const result of data.triviaResults) {
        addBodyText(doc, `${result.participantDesignation}: ${result.correctCount} / ${result.totalCount} correct`);
      }
      doc.moveDown(1);
    }

    // === Gender Reveal ===
    if (data.genderReveal?.genderValue) {
      addSectionHeader(doc, 'Gender Reveal');
      const genderLabel = data.genderReveal.genderValue === 'boy' ? 'Boy' : 'Girl';
      addBodyText(doc, `It's a ${genderLabel}!`);
      if (data.genderReveal.revealedAt) {
        const revealDate = new Date(data.genderReveal.revealedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        doc.font('Helvetica').fontSize(10).fillColor('#666666').text(`Revealed on ${revealDate}`, MARGIN, undefined, { width: CONTENT_WIDTH });
        doc.fillColor('#000000');
      }
      doc.moveDown(1);
    }

    // === Friend Letters ===
    if (data.friendLetters.length > 0) {
      doc.addPage();
      addSectionHeader(doc, 'Letters from Friends');

      for (const fl of data.friendLetters) {
        if (doc.y > 600) doc.addPage();
        addLabel(doc, `From ${fl.friendName} (to ${fl.recipient})`);
        doc.moveDown(0.3);
        addBodyText(doc, fl.content);
        doc.moveDown(1);
      }
    }

    doc.end();
  });
}

/**
 * Generate a zip archive containing the PDF and all photos
 * Returns a readable stream for piping to HTTP response
 */
export async function generateMemoriesZip(data: MemoriesDataResponse): Promise<Readable> {
  const passthrough = new PassThrough();
  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    logger.error('Archive error', { error: err });
    passthrough.destroy(err);
  });

  archive.pipe(passthrough);

  // Generate PDF
  const pdfBuffer = await generateMemoriesPdf(data);
  archive.append(pdfBuffer, { name: 'Before We Were Three.pdf' });

  // Collect all photo URLs
  const photoUrls: { url: string; filename: string }[] = [];

  // Photos from media library
  data.photos.forEach((photo, i) => {
    const ext = photo.url.split('.').pop()?.split('?')[0] ?? 'jpg';
    photoUrls.push({ url: photo.url, filename: `photos/photo-${i + 1}.${ext}` });
  });

  // Photos from letters
  for (const letter of data.letters) {
    if (letter.photoUrl) {
      const ext = letter.photoUrl.split('.').pop()?.split('?')[0] ?? 'jpg';
      photoUrls.push({ url: letter.photoUrl, filename: `photos/letter-${letter.envelopeTitle.replace(/[^a-z0-9]/gi, '-')}.${ext}` });
    }
  }

  // Photos from photo prompts
  for (const pp of data.photoPrompts) {
    for (const r of pp.responses) {
      if (r.photoUrl) {
        const ext = r.photoUrl.split('.').pop()?.split('?')[0] ?? 'jpg';
        photoUrls.push({ url: r.photoUrl, filename: `photos/prompt-${pp.envelopeTitle.replace(/[^a-z0-9]/gi, '-')}-${r.participantDesignation}.${ext}` });
      }
    }
  }

  // Fetch and add photos with concurrency limit
  await mapWithConcurrency(photoUrls, PHOTO_FETCH_CONCURRENCY, async ({ url, filename }) => {
    const buffer = await fetchImageBuffer(url);
    if (buffer) {
      archive.append(buffer, { name: filename });
    }
  });

  archive.finalize();

  return passthrough;
}
