import type { Metadata } from 'next';
import { Layers } from 'lucide-react';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { AuthVisualPanel } from '@/components/auth/AuthVisualPanel';
import { SystemLogo } from '@/components/layout/SystemLogo';

export const metadata: Metadata = {
  title: 'Autentikasi - SSO Campus',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <DemoBanner />
      <div className="flex flex-1 min-h-screen bg-white">
      {/* ── Left Panel: Form (45-50%) ── */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col px-6 sm:px-12 lg:px-16 xl:px-24 py-8 lg:py-10 min-h-screen relative">
        {/* Top Logo */}
        <div className="flex items-center gap-4 mb-auto">
          <SystemLogo
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-white shadow-sm"
            imageClassName="h-full w-full object-contain"
            fallback={<Layers size={30} strokeWidth={2.25} />}
          />
          <span className="font-bold text-2xl tracking-tight text-slate-900">SSO Campus</span>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-[420px] mx-auto py-12 lg:py-20">
          {children}
        </div>
        
        {/* Footer spacer */}
        <div className="mt-auto text-xs font-medium text-slate-400 text-center lg:text-left">
          &copy; {new Date().getFullYear()} SSO Campus. All rights reserved.
        </div>
      </div>

      {/* ── Right Panel: Visual (50-60%) dengan Foto Banner Dinamis dari Pengaturan SSO/IAM ── */}
      <AuthVisualPanel />
    </div>
    </div>
  );
}
