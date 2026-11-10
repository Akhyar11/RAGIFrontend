'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Grid,
  Shield,
  Users,
  CreditCard,
  UserPlus,
  BookOpen,
  FlaskConical,
  LayoutGrid,
  Building2,
  Archive,
  GraduationCap,
  X,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { moduleService, AppModule } from '@/services/module.service';
import { getModuleUrl } from '@/lib/domain';
import { useAuthStore } from '@/store/authStore';

const MODULE_META: Record<string, { subpath: string; icon: LucideIcon }> = {
  sso: {
    subpath: '',
    icon: Shield,
  },
  simpeg: {
    subpath: '',
    icon: Users,
  },
  sippm: {
    subpath: '/proposal',
    icon: FlaskConical,
  },
  sikeu: {
    subpath: '',
    icon: CreditCard,
  },
  spmb: {
    subpath: '',
    icon: UserPlus,
  },
  siakad: {
    subpath: '',
    icon: BookOpen,
  },
  sinapra: {
    subpath: '',
    icon: Building2,
  },
  arsip: {
    subpath: '',
    icon: Archive,
  },
  lms: {
    subpath: '',
    icon: GraduationCap,
  },
};

export function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const [moduleResult, setModuleResult] = useState<{
    identity: string;
    modules: AppModule[];
  } | null>(null);
  const userId = useAuthStore((state) => state.user?.id);
  const accessToken = useAuthStore((state) => state.access_token);
  const authIdentity = `${userId ?? ''}:${accessToken ?? ''}`;
  const modules = moduleResult?.identity === authIdentity ? moduleResult.modules : [];
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let isCurrentUser = true;

    if (!accessToken) {
      return () => {
        isCurrentUser = false;
      };
    }

    moduleService
      .getMyModules()
      .then((res) => {
        if (isCurrentUser) {
          setModuleResult({
            identity: authIdentity,
            modules: Array.isArray(res) ? res.filter((m) => m.is_active) : [],
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load user modules:', err);
        if (isCurrentUser) {
          setModuleResult({ identity: authIdentity, modules: [] });
        }
      });

    return () => {
      isCurrentUser = false;
    };
  }, [accessToken, authIdentity]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-ghost btn-icon ${isOpen ? 'text-primary-600 bg-primary-50' : ''}`}
        title="Modul Switcher Terintegrasi"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Grid size={20} />
      </button>

      {isOpen && (
        <>
          {/* Mobile Dark Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[998] sm:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* App Switcher Dropdown Container */}
          <div className="fixed inset-x-3 top-16 z-[999] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[540px] bg-white rounded-2xl p-4 shadow-2xl border border-slate-200/90 animate-fade-in max-h-[85vh] overflow-y-auto">
            {/* Header Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary-50 text-primary-600">
                  <LayoutGrid size={16} />
                </div>
                <span className="font-bold text-sm text-slate-900">Sub-Sistem SSO</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-2xs font-bold">
                  {modules.length} Modul
                </span>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Tutup Modul Switcher"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modules Grid (Mobile: 1-column list | Desktop: 3-column grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {modules.map((app) => {
                const meta = MODULE_META[app.code] || {
                  subpath: '',
                  icon: LayoutGrid,
                };
                const targetHref = getModuleUrl(app.code, meta.subpath);
                const IconComp = meta.icon;
                const primaryColor = app.primary_color || 'var(--module-primary, #3b82f6)';

                return (
                  <Link
                    key={app.id}
                    href={targetHref}
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center sm:flex-col sm:items-start p-3 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 transition-all text-left"
                    role="menuitem"
                  >
                    <div
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mb-0 sm:mb-2 mr-3 sm:mr-0 transition-colors"
                      style={{
                        backgroundColor: app.primary_color ? `${app.primary_color}1A` : 'rgba(59, 130, 246, 0.1)',
                        color: primaryColor,
                      }}
                    >
                      <IconComp size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                        {app.name}
                      </div>
                      <div className="text-2xs text-slate-500 line-clamp-1 mt-0.5">
                        {app.description || 'Modul terintegrasi'}
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-slate-400 group-hover:text-primary-600 sm:hidden shrink-0 ml-2" />
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}