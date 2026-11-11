import Link from 'next/link';
import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

interface BaseButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'outline' | 'outline-danger' | 'tab';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean;
  icon?: ReactNode;
  full?: boolean;
  children?: ReactNode;
  disabled?: boolean;
}

export type ButtonProps = BaseButtonProps & (
  | ({ as?: 'button'; href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
  | ({ as: 'a'; href?: string } & AnchorHTMLAttributes<HTMLAnchorElement>)
);

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  isLoading = false,
  icon,
  full = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const isTab = variant === 'tab';
  const baseClass = isTab ? '' : 'btn';
  const variantClass = isTab ? '' : `btn-${variant}`;
  const sizeClass = size !== 'md' && !isTab ? `btn-${size}` : '';
  const fullClass = full ? 'btn-full' : '';
  const isBusy = loading || isLoading;
  const combinedClass = `${baseClass} ${variantClass} ${sizeClass} ${fullClass} ${className}`.trim();

  if (props.as === 'a') {
    const { as: _as, href = '#', ...anchorProps } = props;
    const isExternal = typeof href === 'string' && (/^(?:https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:'));

    if (isExternal) {
      return (
        <a
          href={href}
          className={combinedClass}
          aria-disabled={disabled || isBusy ? true : undefined}
          suppressHydrationWarning
          {...anchorProps}
        >
          {isBusy ? <span className="spinner" /> : icon}
          {children}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={combinedClass}
        aria-disabled={disabled || isBusy ? true : undefined}
        suppressHydrationWarning
        {...anchorProps}
      >
        {isBusy ? <span className="spinner" /> : icon}
        {children}
      </Link>
    );
  }

  const { as: _as, ...buttonProps } = props;
  return (
    <button
      className={combinedClass}
      disabled={disabled || isBusy}
      suppressHydrationWarning
      {...buttonProps}
    >
      {isBusy ? (
        <span className="spinner" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
