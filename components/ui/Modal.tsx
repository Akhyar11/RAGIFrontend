'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  className?: string;
  bodyClassName?: string;
  footerClassName?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  size = 'md',
  className,
  bodyClassName,
  footerClassName,
  children,
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  const isVisible = open ?? isOpen ?? false;
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isVisible, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => closeOnOverlay && e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={cn('modal', `modal-${size}`, className)}
      >
        {title && (
          <div className="modal-header">
            <h2 id="modal-title" style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-icon btn-sm"
              aria-label="Tutup modal"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('modal-body', bodyClassName)}>{children}</div>
        {footer && <div className={cn('modal-footer', footerClassName)}>{footer}</div>}
      </div>
    </div>
  );
}
