/**
 * Common UI Components - Barrel Export
 *
 * Re-exports all shared UI components for easy importing.
 * Usage: import { Button, Heading, Text, Card } from '@/components/common';
 */

export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Heading, Text } from './Typography';
export type {
  HeadingProps,
  HeadingLevel,
  TextProps,
  TextVariant,
  TextColor,
} from './Typography';

export { Card } from './Card';
export type { CardProps } from './Card';

export { ErrorBoundary } from './ErrorBoundary';

export { SpotifyButton } from './SpotifyButton';

export { MediaAttachment } from './MediaAttachment';
