'use client';

import { useEffect, useState, type ReactNode } from 'react';
import apiClient from '@/lib/axios';

export const SYSTEM_LOGO_UPDATED_EVENT = 'ragi:system-logo-updated';

export function notifySystemLogoUpdated(url: string) {
  window.dispatchEvent(new CustomEvent(SYSTEM_LOGO_UPDATED_EVENT, { detail: url }));
}

type SystemLogoProps = {
  alt?: string;
  className?: string;
  imageClassName?: string;
  fallback: ReactNode;
};

export function SystemLogo({
  alt = 'Logo sistem',
  className,
  imageClassName,
  fallback,
}: SystemLogoProps) {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadLogo = () => {
      apiClient
        .get('/auth/branding')
        .then((response) => {
          if (mounted) setLogoUrl(response.data?.data?.system_logo_url || '');
        })
        .catch(() => {
          if (mounted) setLogoUrl('');
        });
    };
    const handleLogoUpdated = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (typeof url === 'string') setLogoUrl(url);
      else loadLogo();
    };

    loadLogo();
    window.addEventListener(SYSTEM_LOGO_UPDATED_EVENT, handleLogoUpdated);

    return () => {
      mounted = false;
      window.removeEventListener(SYSTEM_LOGO_UPDATED_EVENT, handleLogoUpdated);
    };
  }, []);

  return (
    <span className={className}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={alt}
          className={imageClassName}
          onError={() => setLogoUrl('')}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
