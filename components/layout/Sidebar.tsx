'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  ShieldCheck,
  Shield,
  Smartphone,
  Users,
  ShieldAlert,
  Key,
  Lock,
  UserCheck,
  Activity,
  History,
  ExternalLink,
  Bell,
  ChevronLeft,
  X,
  GraduationCap,
  Building2,
  Briefcase,
  Contact,
  Award,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  CheckSquare,
  List,
  Home,
  UserPlus,
  PieChart,
  Search,
  RefreshCw,
  BookOpen,
  Sparkles,
  Star,
  Database,
  Tags,
  Layers,
  Menu as MenuIcon,
  Sliders,
  Monitor,
  Settings,
  AlertTriangle,
  Coins,
  Tag,
  Share2,
  DoorOpen,
  Handshake,
  HeartHandshake,
  Fingerprint,
  Ruler,
  Package,
  Boxes,
  Stamp,
  Shapes,
  Lightbulb,
  FlaskConical,
  Scale
} from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { SYSTEM_MODULES, APP_NAME, ROUTES } from '@/lib/constants';
import { resolveDomainContext } from '@/lib/domain';
import { menuService } from '@/services/menu.service';
import { moduleService, AppModule } from '@/services/module.service';
import { Menu } from '@/types/menu';

const getIconComponent = (iconName?: string | null) => {
  const iconMap: Record<string, any> = {
    'FaHome': Home,
    'FaUserPlus': UserPlus,
    'FaChartPie': PieChart,
    'FaBalanceScale': Scale,
    'FaUsers': Users,
    'FaUserCheck': UserCheck,
    'FaList': List,
    'FaShieldAlt': Shield,
    'FaShield': Shield,
    'FaFileAlt': FileText,
    'FaClipboardCheck': CheckSquare,
    'FaFileCheck': CheckSquare,
    'FaCreditCard': DollarSign,
    'FaBookOpen': FileText,
    'FaAward': Award,
    'FaLayers': Layers,
    'FaListOl': List,
    'FaThList': List,
    'FaProjectDiagram': Share2,
    'FaLayerGroup': Layers,
    'FaShapes': Shapes,
    'FaLightbulb': Lightbulb,
    'FaFlaskConical': FlaskConical,
    'FaCubes': Boxes,
    'FaFileContract': FileText,
    'FaBoxes': Boxes,
    'FaCalendar': Calendar,
    'FaTrophy': Award,
    'FaBriefcase': Briefcase,
    'FaClock': Clock,
    'FaSitemap': Building2,
    'FaMoneyBillWave': DollarSign,
    'FaCalendarCheck': Calendar,
    'FaBuilding': Building2,
    'FaWrench': Activity,
    'FaShoppingCart': CheckSquare,
    'FaUser': User,
    'FaSmartphone': Smartphone,
    'FaShieldCheck': ShieldCheck,
    'FaLock': Lock,
    'FaKey': Key,
    'FaGraduationCap': GraduationCap,
    'FaUserGraduate': GraduationCap,
    'FaChalkboard': Users,
    'FaChalkboardTeacher': Users,
    'FaExchangeAlt': RefreshCw,
    'FaPen': FileText,
    'FaSyncAlt': RefreshCw,
    'FaCloudUploadAlt': RefreshCw,
    'FaDatabase': Database,
    'FaTags': Tags,
    'Database': Database,
    'Tags': Tags,
    'FaSlidersH': Sliders,
    'FaSliders': Sliders,
    'FaBars': MenuIcon,
    'FaMenu': MenuIcon,
    'FaDesktop': Monitor,
    'FaLaptop': Monitor,
    'FaMonitor': Monitor,
    'FaHistory': History,
    'FaCogs': Settings,
    'FaCog': Settings,
    'FaChartBar': PieChart,
    'FaSparkles': Sparkles,
    'FaHourglassHalf': Clock,
    'FaFileSignature': FileText,
    'FaCheckSquare': CheckSquare,
    'FaDollarSign': DollarSign,
    'FaCoins': Coins,
    'FaExclamationTriangle': AlertTriangle,
    'FaTag': Tag,
    'FaShareAlt': Share2,
    'FaDoorOpen': DoorOpen,
    'FaHandshake': Handshake,
    'FaHandsHelping': HeartHandshake,
    'BookOpen': BookOpen,
    'FaRulerCombined': Ruler,
    'Package': Package,
    'Boxes': Boxes,
    'Layers': Layers,
    'Tag': Tag,
    'FileSignature': FileText,
    'FileText': FileText,
    'FaStamp': Stamp,
    'FaFingerprint': Fingerprint,
    'FaBell': Bell,
  };
  const IconComponent = (iconName && iconMap[iconName]) || LayoutDashboard;
  return IconComponent;
};

/**
 * Pool ikon rail two-level navigation. Setiap grup menu di rail WAJIB memakai
 * ikon berbeda agar mudah dibedakan antar-modul (lihat desain Opsi C).
 * `buildRailIconMap` mengisi ikon yang duplikat / tidak dikenal dari pool ini.
 */
const RAIL_ICON_POOL: any[] = [
  LayoutDashboard, Home, Users, UserCheck, UserPlus, User, Shield, ShieldCheck,
  ShieldAlert, Key, Lock, Layers, Database, Tags, History, Settings, Sliders,
  Monitor, Smartphone, Activity, GraduationCap, Building2, Briefcase, Award,
  FileText, Calendar, Clock, DollarSign, Coins, TrendingUp, CheckSquare, List,
  PieChart, BookOpen, RefreshCw, Sparkles, Tag, Share2, DoorOpen, Handshake,
  HeartHandshake, Ruler, Package, Boxes, Stamp, Shapes, Lightbulb, Contact,
];

/**
 * Petakan setiap menu level-atas ke SATU ikon rail yang dijamin berbeda.
 * Prioritas: ikon bawaan menu bila belum dipakai grup lain; selebihnya ambil
 * berurutan dari RAIL_ICON_POOL. Deterministik per daftar menu.
 */
const buildRailIconMap = (menus: Menu[]): Map<string | number, any> => {
  const used = new Set<any>();
  const map = new Map<string | number, any>();
  const deferred: Menu[] = [];
  for (const menu of menus) {
    const comp = getIconComponent(menu.icon);
    const isFallback = comp === LayoutDashboard && menu.icon !== 'FaHome' && menu.icon !== undefined;
    if (!used.has(comp) && !isFallback) {
      used.add(comp);
      map.set(menu.id, comp);
    } else {
      deferred.push(menu);
    }
  }
  let poolIdx = 0;
  for (const menu of deferred) {
    while (poolIdx < RAIL_ICON_POOL.length && used.has(RAIL_ICON_POOL[poolIdx])) poolIdx++;
    const comp = RAIL_ICON_POOL[poolIdx] || LayoutDashboard;
    used.add(comp);
    map.set(menu.id, comp);
    poolIdx++;
  }
  return map;
};

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');
  
  const { sidebar_open, toggleSidebar } = useUiStore();
  const { user } = useAuth();

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

  // Determine module based on pathname or hostname dynamically without hardcoding
  const getModule = () => {
    if (typeof window !== 'undefined') {
      const ctx = resolveDomainContext(window.location.hostname);
      if (ctx.isModule && ctx.moduleSlug) return ctx.moduleSlug;
    }
    let mod = 'sso';
    if (pathname.startsWith('/simpeg')) mod = 'simpeg';
    else if (pathname.startsWith('/sippm')) mod = 'sippm';
    else if (pathname.startsWith('/sikeu')) mod = 'sikeu';
    else if (pathname.startsWith('/spmb')) mod = 'spmb';
    else if (pathname.startsWith('/sinapra')) mod = 'sinapra';
    else if (pathname.startsWith('/siakad')) mod = 'siakad';
    else if (pathname.startsWith('/lms')) mod = 'lms';
    else if (pathname.startsWith('/arsip')) mod = 'arsip';

    if (typeof window !== 'undefined') {
      if (pathname.startsWith('/profile')) {
        const savedMod = localStorage.getItem('last_active_module');
        if (savedMod) return savedMod;
      } else {
        localStorage.setItem('last_active_module', mod);
      }
    }
    return mod;
  };

  useEffect(() => {
    if (user) {
      const fetchMenus = async () => {
        try {
          setLoading(true);
          setMenuError(null);
          const mod = getModule();
          const menus = await menuService.getMyMenus(mod);
          setDynamicMenus(menus || []);
        } catch (error) {
          console.error("Failed to load menus", error);
          setDynamicMenus([]);
          setMenuError("Gagal memuat menu dari server.");
        } finally {
          setLoading(false);
        }
      };
      fetchMenus();
    } else {
      setDynamicMenus([]);
      setMenuError(null);
      setLoading(false);
    }
  }, [user?.id, pathname]);

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

  // ── Two-level navigation (Opsi C): rail ikon + panel submenu ──
  // Kunci rail: `g:<id>` untuk grup (url '#...'), id menu untuk daun.
  const railKeyOf = (menu: Menu): string | number =>
    menu.url.startsWith('#') ? `g:${menu.id}` : menu.id;

  // Ikon rail dijamin berbeda antar-grup dalam modul aktif.
  const railIconMap = useMemo(() => buildRailIconMap(processedMenus), [processedMenus]);

  // Grup yang memuat menu aktif (fallback seleksi awal).
  // Pilihan eksplisit user (pinnedSelection) menang sampai rute berubah.
  const [pinnedSelection, setPinnedSelection] = useState<string | number | null>(null);

  useEffect(() => {
    setPinnedSelection(null);
  }, [pathname]);

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

  // ── Seleksi rail efektif (Opsi C): pilihan user menang, selebihnya
  // mengikuti rute (grup menu aktif → daun aktif → item pertama).
  const firstRailKey = processedMenus.length > 0 ? railKeyOf(processedMenus[0]) : null;
  const derivedSelection = activeGroupKey ?? activeMenuId ?? firstRailKey;
  const effectiveSelection = pinnedSelection ?? derivedSelection;
  const selectedMenu =
    processedMenus.find((m) => railKeyOf(m) === effectiveSelection) ?? null;

  const portalLabel = 'Menu Utama';

  // Modul portal (SSO) = entitas Master Modul yang tidak terdaftar sebagai
  // modul fungsional di SYSTEM_MODULES. Tanpa hardcode string kode modul —
  // bila superadmin mengubah nama/kode modul portal, brand ikut berubah.
  const portalModule = useMemo(
    () =>
      appModules.find(
        (m) => !SYSTEM_MODULES.some((s) => s.value === m.code?.toLowerCase())
      ) ??
      appModules[0] ??
      null,
    [appModules]
  );

  // Slug modul aktif (domain → segmen path yang cocok dengan Master Modul → memori modul terakhir).
  const activeModuleSlug = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const ctx = resolveDomainContext(window.location.hostname);
        if (ctx.isModule && ctx.moduleSlug) return ctx.moduleSlug;
      } catch {}
    }
    const seg = pathname.split('/').filter(Boolean)[0]?.toLowerCase() || '';
    if (seg && appModules.some((m) => m.code?.toLowerCase() === seg)) return seg;
    if (seg === ROUTES.PROFILE.replace('/', '') && typeof window !== 'undefined') {
      const saved = localStorage.getItem('last_active_module');
      if (saved && appModules.some((m) => m.code?.toLowerCase() === saved.toLowerCase())) return saved;
    }
    return portalModule?.code ?? '';
  }, [pathname, appModules, portalModule]);

  // Baris 1: nama aplikasi mengikuti Master Modul portal (setting superadmin).
  const appName = portalModule?.name || APP_NAME;

  // Baris 2: nama modul aktif + "Utama", otomatis berubah per modul.
  const activeModuleName = appModules.find((m) => m.code === activeModuleSlug)?.name;
  const moduleSubtitle = activeModuleName ? `${activeModuleName} Utama` : portalLabel;

  return (
    <aside className={`sidebar sidebar-twolevel ${sidebar_open ? '' : 'sidebar-collapsed'}`}>
      {/* ── Rail ikon two-level (ikon tiap grup dijamin berbeda) ── */}
      <div className="sidebar-rail">
        <button
          type="button"
          onClick={toggleSidebar}
          className="sidebar-rail-logo"
          title={appName}
          aria-label={appName}
        >
          <div className="sidebar-logo">
            <GraduationCap size={22} color="white" />
          </div>
        </button>

        <nav className="sidebar-rail-nav" aria-label="Navigasi utama">
          {loading ? (
            <div className="sidebar-loading">…</div>
          ) : (
            <>
              {favoriteLinks.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPinnedSelection('fav');
                    setSidebarOpen(true);
                  }}
                  className={`sidebar-rail-item${effectiveSelection === 'fav' ? ' active' : ''}`}
                  title="Favorit"
                  aria-label="Menu favorit"
                >
                  <Star size={20} fill={effectiveSelection === 'fav' ? 'currentColor' : 'none'} />
                </button>
              )}
              {processedMenus.map((menu) => {
                const key = railKeyOf(menu);
                const RailIcon = railIconMap.get(menu.id) || LayoutDashboard;
                const railActive = key === effectiveSelection;
                if (menu.url.startsWith('#')) {
                  return (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => {
                        setPinnedSelection(key);
                        setSidebarOpen(true);
                      }}
                      className={`sidebar-rail-item${railActive ? ' active' : ''}`}
                      title={menu.name}
                      aria-label={menu.name}
                    >
                      <RailIcon size={20} />
                    </button>
                  );
                }
                // Daun (satu menu): ikon rail HANYA membuka panel, navigasi
                // tetap lewat klik item di panel (konsisten untuk semua menu).
                return (
                  <button
                    key={menu.id}
                    type="button"
                    onClick={() => {
                      setPinnedSelection(menu.id);
                      setSidebarOpen(true);
                    }}
                    className={`sidebar-rail-item${railActive ? ' active' : ''}`}
                    title={menu.name}
                    aria-label={menu.name}
                  >
                    <RailIcon size={20} />
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <button
          type="button"
          onClick={toggleSidebar}
          className="sidebar-rail-toggle hide-mobile"
          title={sidebar_open ? 'Sembunyikan panel' : 'Tampilkan panel'}
          aria-label={sidebar_open ? 'Sembunyikan panel' : 'Tampilkan panel'}
        >
          <ChevronLeft size={18} className={sidebar_open ? '' : 'sidebar-rail-toggle-flip'} />
        </button>
      </div>

      {/* ── Panel submenu two-level (Opsi C) ── */}
      {sidebar_open && (
        <div className="sidebar-panel">
          <div className="sidebar-panel-brand-row">
            <div className="sidebar-panel-brand">
              <div className="sidebar-brand-text">{appName}</div>
              <div className="sidebar-brand-sub">{moduleSubtitle}</div>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="btn btn-ghost btn-icon btn-sm hide-mobile"
              title="Sembunyikan panel"
              aria-label="Sembunyikan panel"
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
                placeholder="Cari"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="sidebar-search-input"
                aria-label="Cari menu"
              />
              <kbd className="sidebar-search-kbd">Ctrl K</kbd>
            </div>
          </div>

          <div className="sidebar-panel-body">
        {/* Dynamic Menus from Database */}
        {(() => {
          const q = searchQuery.trim().toLowerCase();

          const renderPanelItem = (item: Menu) => {
            const isFav = favorites.includes(item.url);
            const itemActive = isMainActive(item.url, item.id);
            return (
              <div key={item.id} className="sidebar-link-row">
                <Link
                  href={item.url}
                  className={`sidebar-panel-item${itemActive ? ' active' : ''}`}
                  title={item.name}
                >
                  {itemActive && <span className="sidebar-panel-dot" aria-hidden="true" />}
                  <span>{item.name}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item.url)}
                  className={`sidebar-pin${isFav ? ' is-fav' : ''}`}
                  title={isFav ? 'Lepas dari Favorit' : 'Sematkan ke Favorit'}
                >
                  <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                </button>
              </div>
            );
          };

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
                    const mod = getModule();
                    setLoading(true);
                    setMenuError(null);
                    menuService
                      .getMyMenus(mod)
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

          // Mode pencarian: hasil datar lintas grup dengan caption grup.
          if (q) {
            const grouped = new Map<string, Menu[]>();
            for (const menu of processedMenus) {
              if (menu.url.startsWith('#')) {
                const kids = (menu.children || []).filter((c) => c.name.toLowerCase().includes(q));
                if (kids.length > 0) grouped.set(menu.name, kids);
              } else if (menu.name.toLowerCase().includes(q)) {
                const list = grouped.get(portalLabel) || [];
                list.push(menu);
                grouped.set(portalLabel, list);
              }
            }
            if (grouped.size === 0) {
              return <div className="sidebar-loading">Menu tidak ditemukan.</div>;
            }
            return (
              <>
                {[...grouped.entries()].map(([group, items]) => (
                  <div key={group}>
                    <div className="sidebar-panel-caption">{group}</div>
                    {items.map((item) => renderPanelItem(item))}
                  </div>
                ))}
              </>
            );
          }

          // Tab Favorit dari rail.
          if (effectiveSelection === 'fav') {
            if (favoriteLinks.length === 0) {
              return <div className="sidebar-loading">Belum ada menu favorit.</div>;
            }
            return (
              <>
                <div className="sidebar-panel-title">Favorit</div>
                {favoriteLinks.map((fav) => renderPanelItem(fav))}
              </>
            );
          }

          if (!selectedMenu) {
            return <div className="sidebar-loading">Belum ada menu tersedia.</div>;
          }

          // Grup terpilih: judul + daftar submenu teks (tanpa ikon, seperti Opsi C).
          if (selectedMenu.url.startsWith('#')) {
            const kids = selectedMenu.children || [];
            if (kids.length === 0) {
              return <div className="sidebar-loading">Belum ada submenu.</div>;
            }
            return (
              <>
                <div className="sidebar-panel-title">{selectedMenu.name}</div>
                {kids.map((child) => renderPanelItem(child))}
              </>
            );
          }

          // Daun terpilih: tampilkan dirinya + anaknya bila ada.
          const subKids = selectedMenu.children || [];
          return (
            <>
              <div className="sidebar-panel-title">{selectedMenu.name}</div>
              {renderPanelItem(selectedMenu)}
              {subKids.map((child) => renderPanelItem(child))}
            </>
          );
        })()}
          </div>

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
