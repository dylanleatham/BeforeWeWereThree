import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import './Typography.css';

/* ===========================================
 * HEADING COMPONENT
 * =========================================== */

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level (1-4) */
  level: HeadingLevel;
  /** Heading content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Heading component using Fraunces display font.
 *
 * Renders semantic heading tags (h1-h4) with Golden Hour styling.
 * Uses optical sizing for improved rendering at different sizes.
 */
export function Heading({
  level,
  children,
  className,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as const;

  return (
    <Tag
      className={clsx('heading', `heading--${level}`, className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

/* ===========================================
 * TEXT COMPONENT
 * =========================================== */

export type TextVariant = 'body' | 'small' | 'caption';
export type TextColor = 'primary' | 'secondary' | 'muted';

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  /** Text size variant */
  variant?: TextVariant;
  /** Text color using semantic color tokens */
  color?: TextColor;
  /** Text content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Render as span instead of paragraph */
  as?: 'p' | 'span';
}

/**
 * Text component using Source Sans 3 body font.
 *
 * Three variants:
 * - body: Default body text (16px)
 * - small: Smaller text for secondary content (14px)
 * - caption: Smallest for labels and captions (12px)
 *
 * Three colors mapped to semantic tokens:
 * - primary: Main text color (warm charcoal)
 * - secondary: Deemphasized text (soft graphite)
 * - muted: Hints and disabled states (muted stone)
 */
export function Text({
  variant = 'body',
  color = 'primary',
  children,
  className,
  as: Component = 'p',
  ...props
}: TextProps) {
  return (
    <Component
      className={clsx(
        'text',
        `text--${variant}`,
        `text--${color}`,
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
