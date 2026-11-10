'use client';

import { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import apiClient from '@/lib/axios';
import { SYSTEM_LOGO_UPDATED_EVENT } from '@/components/layout/SystemLogo';

interface BrandingData {
  system_logo_url: string;
  login_banner_url: string;
  login_banner_title: string;
  login_banner_subtitle: string;
}

export function AuthVisualPanel() {
  const [branding, setBranding] = useState<BrandingData>({
    system_logo_url: '',
    login_banner_url: '',
    login_banner_title: 'SSO Campus',
    login_banner_subtitle: 'Enterprise Identity Platform',
  });
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handleLogoUpdated = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (typeof url === 'string') {
        setBranding((current) => ({ ...current, system_logo_url: url }));
      }
    };
    window.addEventListener(SYSTEM_LOGO_UPDATED_EVENT, handleLogoUpdated);

    apiClient
      .get('/auth/branding')
      .then((res) => {
        if (isMounted && res.data?.data) {
          setBranding({
            system_logo_url: res.data.data.system_logo_url || '',
            login_banner_url: res.data.data.login_banner_url || '',
            login_banner_title: res.data.data.login_banner_title || 'SSO Campus',
            login_banner_subtitle: res.data.data.login_banner_subtitle || 'Enterprise Identity Platform',
          });
        }
      })
      .catch(() => {
        // Fallback default jika endpoint tidak merespons
      })
      .finally(() => {
        if (isMounted) setIsLoaded(true);
      });

    return () => {
      isMounted = false;
      window.removeEventListener(SYSTEM_LOGO_UPDATED_EVENT, handleLogoUpdated);
    };
  }, []);

  const hasCustomBanner = Boolean(branding.login_banner_url) && !imageError;

  return (
    <div className="hidden lg:flex flex-1 relative bg-[#0B0F19] items-end p-12 xl:p-16 overflow-hidden select-none">
      {/* ── Background: Foto Banner Kustom atau Default Dark Tech ── */}
      {hasCustomBanner ? (
        <>
          {/* Foto Banner Kustom */}
          <div
            className={`absolute inset-0 bg-cover bg-center transition-all duration-700 ${
              isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            style={{ backgroundImage: `url(${branding.login_banner_url})` }}
          />
          {/* Hidden img untuk menangkap onError jika URL tidak valid / 404 */}
          <img
            src={branding.login_banner_url}
            alt="Login Banner"
            className="hidden"
            onError={() => setImageError(true)}
          />

          {/* Lapisan Gradient Overlay Elegan (agar foto indah & teks branding selalu terbaca kontras) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/95 via-[#0B0F19]/40 to-transparent" />
          <div className="absolute inset-0 bg-blue-950/20 mix-blend-multiply" />
        </>
      ) : (
        <>
          {/* Abstract background elements bawaan (Default Dark Futuristic) */}
          <div className="absolute inset-0 bg-[url('/auth-bg.png')] bg-cover bg-center opacity-30 mix-blend-luminosity" />

          {/* Deep blue/purple glowing orbs for tech feel */}
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-600/20 blur-[120px]" />
          <div className="absolute top-[40%] -left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-600/10 blur-[100px]" />
          <div className="absolute bottom-0 right-[10%] w-[70%] h-[50%] rounded-full bg-indigo-600/20 blur-[140px]" />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-transparent to-transparent opacity-80" />
        </>
      )}

      {/* ── Branding Badge Card (Pojok Kanan Bawah) ── */}
      <div className="relative z-10 ml-auto flex items-center gap-4 bg-slate-900/60 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/15 shadow-2xl transition-all duration-300 hover:border-white/25 hover:bg-slate-900/75 max-w-md">
        <div className="w-11 h-11 shrink-0 flex items-center justify-center overflow-hidden bg-blue-600/80 rounded-xl text-white ring-1 ring-white/20 shadow-lg shadow-blue-600/30">
          {branding.system_logo_url ? (
            <img
              src={branding.system_logo_url}
              alt="Logo sistem"
              className="h-full w-full object-contain bg-white p-1"
              onError={() => setBranding((current) => ({ ...current, system_logo_url: '' }))}
            />
          ) : (
            <Layers size={22} strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-white font-semibold tracking-wide text-lg leading-tight truncate">
            {branding.login_banner_title || 'SSO Campus'}
          </div>
          <div className="text-slate-300/90 text-sm font-medium mt-0.5 truncate">
            {branding.login_banner_subtitle || 'Enterprise Identity Platform'}
          </div>
        </div>
      </div>
    </div>
  );
}
