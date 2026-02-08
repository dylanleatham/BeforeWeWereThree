import { useMemo } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import type { Photo } from 'shared';

// Import lightbox styles
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface SlideshowViewerProps {
  /** Array of photos to display */
  photos: Photo[];
  /** Whether the slideshow is open */
  isOpen: boolean;
  /** Starting photo index */
  startIndex: number;
  /** Callback when slideshow is closed */
  onClose: () => void;
  /** Whether to shuffle the photo order */
  shuffle?: boolean;
}

/**
 * Fisher-Yates shuffle algorithm
 * Creates a new shuffled array without mutating the original
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }
  return shuffled;
}

/**
 * Fullscreen slideshow viewer using yet-another-react-lightbox
 *
 * Features:
 * - Zoom capability
 * - Slideshow mode with autoplay
 * - Thumbnail navigation
 * - Optional shuffle mode
 */
export function SlideshowViewer({
  photos,
  isOpen,
  startIndex,
  onClose,
  shuffle = false,
}: SlideshowViewerProps) {
  // Memoize slides to avoid reshuffling on every render
  const slides = useMemo(() => {
    const orderedPhotos = shuffle ? shuffleArray(photos) : photos;
    return orderedPhotos.map((photo) => ({
      src: photo.blobUrl,
      alt: photo.filename,
    }));
  }, [photos, shuffle]);

  // Don't render if no photos or not open
  if (photos.length === 0 || !isOpen) {
    return null;
  }

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      index={startIndex}
      slides={slides}
      plugins={[Zoom, Slideshow, Thumbnails]}
      slideshow={{
        autoplay: false,
        delay: 3000,
      }}
      zoom={{
        maxZoomPixelRatio: 3,
        scrollToZoom: true,
      }}
      thumbnails={{
        position: 'bottom',
        width: 80,
        height: 60,
        border: 2,
        borderRadius: 4,
        gap: 8,
      }}
      styles={{
        container: {
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
        },
      }}
      carousel={{
        finite: false,
      }}
    />
  );
}
