'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  ChevronLeft,
  GraduationCap,
  Search,
  Star,
  X,
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useDomain } from '@/hooks/useDomain';
import { SYSTEM_MODULES, APP_NAME, ROUTES, DEFAULT_MODULE_CODE, TENANT_DEFAULT } from '@/lib/constants';
import { menuService } from '@/services/menu.service';
import { moduleService, AppModule } from '@/services/module.service';
import { SystemLogo } from '@/components/layout/SystemLogo';
import { Menu } from '@/types/menu';

export function Sidebar({ tenantModule }: { tenantModule: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  
  const { sidebar_open, toggleSidebar } = useUiStore();
  const lastActiveModule = useUiStore((s) => s.last_active_module);
  const setLastActiveModule = useUiStore((s) => s.setLastActiveModule);
  const { user } = useAuth();
  const { isDev: isDevHost, moduleSlug: domainModuleSlug } = useDomain();

  const [dynamicMenus, setDynamicMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Nama aplikasi & modul dari Master Modul (dikelola superadmin).
  const [appModules, setAppModules] = useState<AppModule[]>([]);
  useEffect(() => {
    moduleService
      .getAllModules()
      .then((res) => setAppModules(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  // Accordion grup + Favorit (persist localStorage per browser)
  const FAVORITES_KEY = 'sidebar_favorites_v1';
  const readStoredArray = (key: string): string[] => {
    try {
      if (typeof window === 'undefined') return [];
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string') : [];
    } catch {
      return [];
    }
  };

  const [favorites, setFavorites] = useState<string[]>(() => readStoredArray(FAVORITES_KEY));

  const persistFavorites = (next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    } catch {}
  };

  const toggleFavorite = (url: string) => {
    persistFavorites(favorites.includes(url) ? favorites.filter((u) => u !== url) : [...favorites, url]);
  };

  // Modul portal (SSO) = entitas Master Modul yang tidak terdaftar sebagai
  // modul fungsional di SYSTEM_MODULES. Tanpa hardcode kode modul — bila
  // superadmin mengubah nama/kode modul portal, brand & fallback ikut berubah.
  const portalModule = useMemo(
    () =>
      appModules.find(
        (m) => !SYSTEM_MODULES.some((s) => s.value === m.code?.toLowerCase())
      ) ??
      appModules[0] ??
      null,
    [appModules]
  );

  // Segmen pertama path yang terdaftar sebagai modul: Master Modul (sumber
  // kebenaran) atau konstanta prefix rute aplikasi.
  const pathModule = useMemo(() => {
    const seg = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
    if (!seg) return null;
    const known =
      appModules.some((m) => (m.code || '').toLowerCase() === seg) ||
      SYSTEM_MODULES.some((m) => m.value === seg);
    return known ? seg : null;
  }, [pathname, appModules]);

  // Modul yang men-drive menu kiri. Urutan prioritas:
  // 1. Segmen path yang terdaftar sebagai modul (navigasi antar-modul di host
  //    yang sama tidak me-remount layout, jadi `tenantModule` dari server bisa
  //    masih menunjuk modul sebelumnya — path harus menang).
  // 2. Host dev tanpa subdomain modul (localhost) memakai satu host untuk semua
  //    modul & portal, sehingga modul ditentukan dari path, bukan konteks tenant
  //    basi dari server.
  // 3. Konteks tenant subdomain dari server (produksi / *.localhost).
  // 4. Portal (SSO) sebagai default.
  const moduleCode = useMemo(() => {
    const portalCode = (portalModule?.code || DEFAULT_MODULE_CODE).toLowerCase();

    if (pathModule) return pathModule;

    const seg = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';

    if (isDevHost && !domainModuleSlug) {
      // Modul dinamis yang belum termuat di daftar Master Modul: header server
      // pada full load masih valid untuk segmen path yang sama.
      if (seg && seg === tenantModule.toLowerCase()) return seg;

      // Halaman profil mempertahankan menu modul terakhir yang dibuka.
      if (pathname.startsWith(ROUTES.PROFILE)) {
        const saved = lastActiveModule?.toLowerCase();
        if (saved && appModules.some((m) => (m.code || '').toLowerCase() === saved)) {
          return saved;
        }
      }
      return portalCode;
    }

    if (tenantModule !== TENANT_DEFAULT) return tenantModule;

    if (pathname.startsWith(ROUTES.PROFILE)) {
      const saved = lastActiveModule?.toLowerCase();
      if (saved && appModules.some((m) => (m.code || '').toLowerCase() === saved)) {
        return saved;
      }
    }

    return portalCode;
  }, [
    pathModule,
    pathname,
    tenantModule,
    isDevHost,
    domainModuleSlug,
    appModules,
    portalModule,
    lastActiveModule,
  ]);

  // Ingat modul terakhir yang dibuka user (dipakai saat berada di /profile).
  useEffect(() => {
    if (pathModule && pathModule !== lastActiveModule) {
      setLastActiveModule(pathModule);
    }
  }, [pathModule, lastActiveModule, setLastActiveModule]);

  useEffect(() => {
    let cancelled = false;

    if (user) {
      const fetchMenus = async () => {
        try {
          setLoading(true);
          setMenuError(null);
          // Jangan tampilkan menu modul sebelumnya saat modul berganti.
          setDynamicMenus([]);
          const menus = await menuService.getMyMenus(moduleCode);
          if (!cancelled) setDynamicMenus(menus || []);
        } catch (error) {
          console.error("Failed to load menus", error);
          if (!cancelled) {
            setDynamicMenus([]);
            setMenuError("Gagal memuat menu dari server.");
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      fetchMenus();
    } else {
      setDynamicMenus([]);
      setMenuError(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id, moduleCode]);

  // Satu-satunya URL menu yang boleh aktif: exact match menang, lalu prefix TERPANJANG.
  // Mencegah dua menu beda fitur menyala bersamaan (mis. /siakad/obe + /siakad/obe/cpl).
  const computeActiveUrl = (menus: Menu[]): string | null => {
    const moduleRoots = [
      '/siakad', '/lms', '/sikeu', '/simpeg', '/spmb', '/sinapra', '/sippm', '/admin', '/dashboard',
      '/sikeu/master', '/siakad/master', '/simpeg/master',
    ];
    let best: string | null = null;
    const consider = (url: string, isTopLevel = false) => {
      if (!url || url.startsWith('#')) return;
      if (url === '/lms' && pathname === '/lms/dashboard' && isTopLevel) {
        if (!best || best.length < url.length) best = url;
        return;
      }
      if (moduleRoots.includes(url)) {
        if (pathname === url && (!best || best.length < url.length)) best = url;
        return;
      }
      if (pathname !== url && !pathname.startsWith(url + '/')) return;
      if (!best || best.length < url.length) best = url;
    };
    menus.forEach((m) => {
      consider(m.url, true);
      m.children?.forEach((c) => consider(c.url));
    });
    return best;
  };

  // ID pemenang tunggal: exact > prefix terpanjang; anak grup > menu atas bila URL sama.
  const computeActiveId = (menus: Menu[]): string | number | null => {
    const moduleRoots = [
      '/siakad', '/lms', '/sikeu', '/simpeg', '/spmb', '/sinapra', '/sippm', '/admin', '/dashboard',
      '/sikeu/master', '/siakad/master', '/simpeg/master',
    ];
    let bestId: string | number | null = null;
    let bestScore: [number, number, number] | null = null;
    const consider = (url: string, id: string | number, depth: number) => {
      if (!url || url.startsWith('#')) return;
      let exact = false;
      if (url === '/lms' && pathname === '/lms/dashboard' && depth === 0) {
        exact = true;
      } else if (moduleRoots.includes(url)) {
        if (pathname !== url) return;
        exact = true;
      } else if (pathname === url) {
        exact = true;
      } else if (!pathname.startsWith(url + '/')) {
        return;
      }
      const score: [number, number, number] = [exact ? 1 : 0, url.length, depth];
      const better =
        !bestScore ||
        score[0] > bestScore[0] ||
        (score[0] === bestScore[0] && (score[1] > bestScore[1] || (score[1] === bestScore[1] && score[2] > bestScore[2])));
      if (better) {
        bestScore = score;
        bestId = id;
      }
    };
    menus.forEach((m) => {
      consider(m.url, m.id, 0);
      m.children?.forEach((c) => consider(c.url, c.id, 1));
    });
    return bestId;
  };

  // Dedup + saring + urutkan (dipakai render & penanda aktif)
  const processedMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const unique: Menu[] = [];

    for (const menu of dynamicMenus) {
      const normalizedUrl = menu.url.replace(/\/$/, '');
      const key = menu.url.startsWith('#')
        ? `header|${menu.name.toLowerCase().trim()}`
        : `link|${menu.name.toLowerCase().trim()}|${normalizedUrl.replace('/dashboard', '')}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(menu);
      }
    }

    const filtered = unique.filter((menu) => {
      const kids = menu.children || [];
      if (menu.url.startsWith('#')) {
        return kids.some((c) => !q || c.name.toLowerCase().includes(q));
      }
      if (!q) return true;
      return (
        menu.name.toLowerCase().includes(q) ||
        kids.some((c) => c.name.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [dynamicMenus, searchQuery]);

  const activeMenuUrl = computeActiveUrl(processedMenus);
  const activeMenuId = computeActiveId(processedMenus);

  // Grup yang memuat menu aktif ikut terbuka sebagai bawaan
  // (nilai eksplisit pilihan user di openGroups tetap menang).
  const activeGroupKey = useMemo(() => {
    for (const m of processedMenus) {
      if (m.children?.some((c) => c.id === activeMenuId)) return `g:${m.id}`;
    }
    return null;
  }, [processedMenus, activeMenuId]);

  // Grup dropdown: pilihan buka/tutup user menang; selebihnya grup yang
  // memuat menu aktif terbuka sebagai bawaan.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isGroupOpen = (key: string) => openGroups[key] ?? (key === activeGroupKey || key === 'fav');
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !(prev[key] ?? (key === activeGroupKey || key === 'fav')) }));


  // Shortcut Ctrl+K / Cmd+K: buka panel lalu fokus ke pencarian.
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSidebarOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSidebarOpen]);

  // Link daun untuk seksi Favorit (hanya yang ada di menu modul aktif)
  const favoriteLinks = useMemo(() => {
    const leaves: Menu[] = [];
    for (const m of processedMenus) {
      if (!m.url.startsWith('#')) leaves.push(m);
      m.children?.forEach((c) => {
        if (!c.url.startsWith('#')) leaves.push(c);
      });
    }
    const seen = new Set<string>();
    return favorites
      .map((u) => leaves.find((l) => l.url === u))
      .filter((l): l is Menu => {
        if (!l || seen.has(l.url)) return false;
        seen.add(l.url);
        return true;
      });
  }, [favorites, processedMenus]);

  const isMainActive = (path: string, id?: string | number) => {
    if (!path || path.startsWith('#')) return false;
    if (activeMenuId !== null && id !== undefined) return activeMenuId === id;
    if (activeMenuUrl) return activeMenuUrl === path;
    if (pathname === path) return true;

    const isModuleRoot = [
      '/siakad', '/lms', '/sikeu', '/simpeg', '/spmb', '/sinapra', '/sippm', '/admin', '/dashboard',
      '/sikeu/master', '/siakad/master', '/simpeg/master'
    ].includes(path);
    if (isModuleRoot) {
      return pathname === path;
    }

    if (pathname.startsWith(path + '/')) {
      // Check if there is another menu in dynamicMenus that matches pathname more specifically
      const hasSpecificMatch = dynamicMenus.some((m) => {
        if (m.url !== path && (m.url === pathname || (m.url.length > path.length && pathname.startsWith(m.url + '/')))) return true;
        if (m.children?.some((c) => c.url !== path && (c.url === pathname || (c.url.length > path.length && pathname.startsWith(c.url + '/'))))) return true;
        return false;
      });
      return !hasSpecificMatch;
    }

    return false;
  };


  const portalLabel = 'Menu Utama';

  // Slug modul aktif mengikuti sumber yang sama dengan pemuatan menu.
  const activeModuleSlug = moduleCode;

  // Baris 1: nama aplikasi mengikuti Master Modul portal (setting superadmin).
  const appName = portalModule?.name || APP_NAME;

  // Baris 2: nama modul aktif + "Utama", otomatis berubah per modul.
  const activeModuleName = appModules.find((m) => m.code === activeModuleSlug)?.name;
  const moduleSubtitle = activeModuleName ? `${activeModuleName} Utama` : portalLabel;

  const q = searchQuery.trim().toLowerCase();

  const renderItem = (item: Menu) => {
    const isFav = favorites.includes(item.url);
    const itemActive = isMainActive(item.url, item.id);
    return (
      <div key={item.id} className="sidebar-link-row">
        <Link
          href={item.url}
          className={`sidebar-panel-item${itemActive ? ' active' : ''}`}
          title={item.name}
          aria-current={itemActive ? 'page' : undefined}
        >
          <span>{item.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => toggleFavorite(item.url)}
          className={`sidebar-pin${isFav ? ' is-fav' : ''}`}
          title={isFav ? 'Lepas dari Favorit' : 'Sematkan ke Favorit'}
          aria-label={isFav ? 'Lepas dari Favorit' : 'Sematkan ke Favorit'}
        >
          <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  // Satu grup dropdown: judul bisa diklik untuk buka/tutup daftar submenu.
  const renderGroup = (key: string, title: string, items: Menu[], forceOpen = false) => {
    const open = forceOpen || isGroupOpen(key);
    const hasActive = items.some((c) => c.id === activeMenuId);
    return (
      <div key={key} className="sidebar-acc">
        <button
          type="button"
          onClick={() => toggleGroup(key)}
          className={`sidebar-acc-head${open ? ' open' : ''}${hasActive ? ' has-active' : ''}`}
          aria-expanded={open}
        >
          <span className="sidebar-acc-title">{title}</span>
          <ChevronDown size={14} className="sidebar-acc-chev" aria-hidden="true" />
        </button>
        {open && <div className="sidebar-acc-list">{items.map((c) => renderItem(c))}</div>}
      </div>
    );
  };

  const renderMenuList = () => {
    if (loading) {
      return <div className="sidebar-loading">Loading menus...</div>;
    }

    if (menuError && processedMenus.length === 0) {
      return (
        <div className="p-4 text-center">
          <div className="text-xs text-rose-500 font-medium mb-2">{menuError}</div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setMenuError(null);
              menuService
                .getMyMenus(moduleCode)
                .then((m) => setDynamicMenus(m || []))
                .catch(() => {
                  setDynamicMenus([]);
                  setMenuError('Gagal memuat menu dari server.');
                })
                .finally(() => setLoading(false));
            }}
            className="text-2xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
          >
            Muat ulang
          </button>
        </div>
      );
    }

    if (processedMenus.length === 0) {
      return <div className="sidebar-loading">{q ? 'Menu tidak ditemukan.' : 'Belum ada menu tersedia.'}</div>;
    }

    // Saat mencari, semua grup yang cocok terbuka otomatis.
    const nodes: React.ReactNode[] = [];
    if (!q && favoriteLinks.length > 0) {
      nodes.push(renderGroup('fav', 'Favorit', favoriteLinks));
    }
    for (const menu of processedMenus) {
      const kids = menu.children || [];
      if (menu.url.startsWith('#')) {
        const shown = q ? kids.filter((c) => c.name.toLowerCase().includes(q)) : kids;
        if (shown.length > 0) nodes.push(renderGroup(`g:${menu.id}`, menu.name, shown, !!q));
        continue;
      }
      // Menu tunggal tanpa anak: tautan langsung. Dengan anak: jadi grup
      // yang anggota pertamanya adalah menu itu sendiri.
      if (kids.length === 0) {
        nodes.push(<div key={menu.id} className="sidebar-acc-single">{renderItem(menu)}</div>);
      } else {
        const shown = q ? kids.filter((c) => c.name.toLowerCase().includes(q)) : kids;
        const self = !q || menu.name.toLowerCase().includes(q) ? [menu] : [];
        nodes.push(renderGroup(`g:${menu.id}`, menu.name, [...self, ...shown], !!q));
      }
    }
    return <>{nodes}</>;
  };

  return (
    <aside className={`sidebar sidebar-dropdown ${sidebar_open ? '' : 'sidebar-collapsed'}`}>
      {/* Strip tipis saat sidebar disembunyikan di desktop: hanya logo + tombol buka */}
      {!sidebar_open && (
        <div className="sidebar-mini hide-mobile">
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-rail-logo"
            title={appName}
            aria-label={`Tampilkan menu ${appName}`}
          >
            <SystemLogo
              className="sidebar-logo overflow-hidden !bg-transparent"
              imageClassName="h-full w-full object-contain"
              fallback={<GraduationCap size={22} color="white" />}
            />
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-rail-toggle"
            title="Tampilkan menu"
            aria-label="Tampilkan menu"
          >
            <ChevronLeft size={18} className="sidebar-rail-toggle-flip" />
          </button>
        </div>
      )}

      {sidebar_open && (
        <div className="sidebar-panel">
          <div className="sidebar-panel-brand-row">
            <SystemLogo
              className="sidebar-logo overflow-hidden !bg-transparent"
              imageClassName="h-full w-full object-contain"
              fallback={<GraduationCap size={22} color="white" />}
            />
            <div className="sidebar-panel-brand">
              <div className="sidebar-brand-text">{appName}</div>
              <div className="sidebar-brand-sub">{moduleSubtitle}</div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn btn-ghost btn-icon btn-sm hide-mobile"
              title="Sembunyikan menu"
              aria-label="Sembunyikan menu"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn btn-ghost btn-icon btn-sm hide-desktop"
              title="Tutup menu"
              aria-label="Tutup menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="sidebar-panel-search">
            <div className="sidebar-search-wrap">
              <Search size={14} className="sidebar-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
                aria-label="Cari menu"
              />
              <kbd className="sidebar-search-kbd">Ctrl K</kbd>
            </div>
          </div>

          <nav className="sidebar-panel-body" aria-label="Navigasi utama">
            {renderMenuList()}
          </nav>

          {/* Info pengguna */}
          {user && (
            <div className="sidebar-footer">
              <div className="sidebar-user-card">
                <div className="avatar avatar-sm">
                  {(user.name || user.nama_lengkap || user.username)
                    ? (user.name || user.nama_lengkap || user.username).slice(0, 2).toUpperCase()
                    : 'US'}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{user.name || user.nama_lengkap || user.username}</div>
                  <div className="sidebar-user-role">{user.roles?.[0]?.name || user.roles?.[0]?.role?.name || 'User'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
