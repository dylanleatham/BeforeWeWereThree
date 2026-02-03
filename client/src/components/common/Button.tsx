import { motion } from 'motion/react';
import clsx from 'clsx';
import type { ReactNode, MouseEventHandler } from 'react';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  /** Visual style of the button */
  variant?: ButtonVariant;
  /** Size of the button - all sizes have 48px min touch target */
  size?: ButtonSize;
  /** Button contents */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Click handler */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  'aria-label'?: string;
  /** Form ID to associate with */
  form?: string;
  /** Name attribute */
  name?: string;
  /** Value attribute */
  value?: string;
}

/**
 * Primary UI button component with Golden Hour design system styling.
 *
 * Features:
 * - Subtle scale animation on hover/tap using motion
 * - Three variants: primary (sunrise gold), secondary (outline), ghost (text only)
 * - Three sizes: sm, md, lg - all maintain 48px minimum touch target
 * - Full accessibility support with focus visible styles
 */
export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  disabled,
  type = 'button',
  onClick,
  'aria-label': ariaLabel,
  form,
  name,
  value,
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      className={clsx(
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        className
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      form={form}
      name={name}
      value={value}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.button>
  );
}
