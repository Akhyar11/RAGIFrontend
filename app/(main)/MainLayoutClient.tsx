'use client';

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { DemoBanner } from '@/components/layout/DemoBanner';
import { ImpersonateBanner } from '@/components/layout/ImpersonateBanner';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { menuService } from '@/services/menu.service';
import { useAuth } from '@/hooks/useAuth';
import { Menu } from '@/types/menu';
import { PUBLIC_ROUTES } from '@/lib/constants';
import { getCookie, getAuthTokenKey } from '@/lib/domain';
import { Loader2 } from 'lucide-react';
import NotFoundPage from '@/app/not-found';
import { generateModuleThemeStyles } from '@/lib/theme';

export function MainLayoutClient({
  children,
  tenantModule,
}: {
  children: React.ReactNode;
  tenantModule: string;
}) {
  const sidebar_open = useUiStore((s) => s.sidebar_open);
  const sidebar_width = useUiStore((s) => s.sidebar_width);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const module_colors = useUiStore((s) => s.module_colors);
  const fetchAllModuleColors = useUiStore((s) => s.fetchAllModuleColors);
  const setUser = useAuthStore((s) => s.setUser);
  const { isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isNotFound, setIsNotFound] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const extractUrls = (menus: Menu[]): string[] => {
    let urls: string[] = [];
    menus.forEach((m) => {
      if (m.url && !m.url.startsWith('#')) {
        urls.push(m.url);
      }
      if (m.children && m.children.length > 0) {
        urls = urls.concat(extractUrls(m.children));
      }
    });
    return urls;
  };

  useEffect(() => {
    const tokenKey = getAuthTokenKey();
    const token = typeof document !== 'undefined' ? getCookie(tokenKey) : null;

    if (token) {
      authService
        .getMe()
        .then(async (res: any) => {
          const userData = res?.data?.id ? res.data : res?.data?.user || res?.user || res?.data || res;
          if (userData && (userData.id || userData.username || userData.email)) {
            setUser(userData);
            if (isSuperAdmin || Boolean(userData.is_superadmin)) {
              setIsNotFound(false);
              return;
            }

            try {
              const myMenus = await menuService.getMyMenus('all');
              const allowedUrls = extractUrls(myMenus || []);
              const baseAllowed = [
                '/dashboard',
                '/profile',
                '/profile/sessions',
                '/profile/mfa',
              ];
              const currentPath = pathname.replace(/\/$/, '');
              const isAllowed =
                (PUBLIC_ROUTES as readonly string[]).includes(currentPath) ||
                baseAllowed.includes(currentPath) ||
                baseAllowed.some((b) => currentPath === b || currentPath.startsWith(b + '/')) ||
                allowedUrls.some((url) => {
                  const normUrl = url.replace(/\/$/, '');
                  return (
                    currentPath === normUrl ||
                    currentPath.startsWith(normUrl + '/') ||
                    normUrl.startsWith(currentPath + '/')
                  );
                });

              setIsNotFound(!isAllowed);
            } catch (err) {
              console.error('Gagal memverifikasi otorisasi menu:', err);
              setIsNotFound(false);
            }
          }
        })
        .catch(() => {
          const currentUrl = typeof window !== 'undefined' ? window.location.href : pathname;
          router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        })
        .finally(() => {
          setCheckingAccess(false);
        });
    } else {
      const isPublic = (PUBLIC_ROUTES as readonly string[]).includes(pathname);
      if (!isPublic) {
        const currentUrl = typeof window !== 'undefined' ? window.location.href : pathname;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      } else {
        setCheckingAccess(false);
      }
    }
  }, [setUser, pathname, router]);

  useEffect(() => {
    fetchAllModuleColors();
  }, [fetchAllModuleColors]);

  const activeModuleCode = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
  const activeModuleColor = module_colors?.[activeModuleCode] || null;
  const themeStyles = generateModuleThemeStyles(activeModuleColor);

  if (isNotFound) {
    return <NotFoundPage />;
  }

  if (checkingAccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-sm font-medium text-gray-500">Memeriksa otentikasi...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`main-layout ${sidebar_open ? '' : 'sidebar-collapsed'}`}
      style={{
        ...themeStyles,
        ...(sidebar_open ? { '--sidebar-width': `${sidebar_width}px` } : {}),
      } as React.CSSProperties}
    >
      <Suspense fallback={<div style={{ width: sidebar_width }} />}>
        <Sidebar tenantModule={tenantModule} />
      </Suspense>
      {sidebar_open && (
        <div className="sidebar-overlay hide-desktop" onClick={toggleSidebar} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%', minHeight: '100vh' }}>
        <div className="sticky top-0 z-50 flex flex-col w-full bg-white shadow-xs">
          <DemoBanner />
          <ImpersonateBanner />
          <Navbar />
        </div>
        <main className="flex-1 w-full min-w-0 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
