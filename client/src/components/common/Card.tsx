import clsx from 'clsx';
import type { HTMLAttributes, ReactNode, KeyboardEvent } from 'react';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Elevated style with stronger shadow */
  elevated?: boolean;
  /** Click handler - when provided, card becomes interactive */
  onClick?: () => void;
}

/**
 * Card wrapper component with Golden Hour design system styling.
 *
 * Features:
 * - Cream background with subtle shadow
 * - Optional elevated variant with white background and stronger shadow
 * - Interactive mode when onClick is provided (adds hover lift effect)
 * - Accessible keyboard interaction (Enter/Space) when clickable
 */
export function Card({
  children,
  className,
  elevated = false,
  onClick,
  ...props
}: CardProps) {
  const isInteractive = typeof onClick === 'function';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={clsx(
        'card',
        elevated && 'card--elevated',
        isInteractive && 'card--interactive',
        className
      )}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
