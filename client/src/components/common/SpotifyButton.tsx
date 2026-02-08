import { Music } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import './SpotifyButton.css';

/**
 * Floating Spotify playlist button
 *
 * Appears in bottom-right corner when a Spotify URL is configured.
 * Opens the playlist in a new tab when clicked.
 *
 * Styled with app theme colors (Golden Hour) - NOT Spotify green.
 */
export function SpotifyButton() {
  const { spotifyUrl, isLoading } = useConfig();

  // Don't render if loading or no URL configured
  if (isLoading || !spotifyUrl) {
    return null;
  }

  return (
    <a
      href={spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="spotify-button"
      aria-label="Open Spotify playlist"
    >
      <Music size={24} strokeWidth={2} />
    </a>
  );
}
