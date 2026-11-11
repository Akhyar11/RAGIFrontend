import { ROUTES, TOKEN_KEY } from './constants';
import { getStaticTenantConfig, type TenantConfig } from './tenant-config';

// ============================================================
// DOMAIN / SUBDOMAIN RESOLUTION — Multi-Tenant Frontend (satu codebase)
//
// Konteks tenant ditentukan dari hostname:
//   sso.polinus.cloud      -> portal SSO (default)
//   siakad.polinus.cloud   -> modul SIAKAD
//   clientcompany.com      -> custom domain (dipetakan via Edge Config)
//
// Backend tetap single-tenant (satu API_BASE_URL). FE hanya
// menentukan landing & konteks modul berdasarkan subdomain/custom domain.
// Pemetaan domain dinamis dibaca dari Vercel Edge Config (lib/tenant-config).
// ============================================================

// Backward-compatible exports (diturunkan dari konfigurasi statis).
export const BASE_DOMAINS: string[] = getStaticTenantConfig().baseDomains;

// Subdomain yang BUKAN modul (dianggap portal SSO default)
export const RESERVED_SUBDOMAINS: Set<string> = new Set(
  getStaticTenantConfig().reservedSubdomains,
);

// Label tampilan per modul (untuk branding navbar/header)
export const MODULE_LABELS: Record<string, string> = {
  iam: 'IAM & Auth Center',
  spmb: 'SPMB',
  siakad: 'SIAKAD',
  lms: 'LMS',
  obe: 'OBE',
  simpi: 'SIMPI',
  simanta: 'SIMANTA',
  simpreskul: 'SIMPRESKUL',
  sikeu: 'SIKEU',
  simpeg: 'SIMPEG',
  sippm: 'SIPPM',
  sinapra: 'SINAPRA',
  kerjasama: 'Kerjasama',
  upm: 'UPM',
  arsip: 'ARSIP',
};

export interface DomainContext {
  hostname: string;
  baseDomain: string;
  subdomain: string;
  effectiveSubdomain: string;
  moduleSlug: string | null;
  modulePath: string | null;
  moduleLabel: string | null;
  isModule: boolean;
  isDefault: boolean;
  isDemo: boolean;
  isDev: boolean;
  /** Host bukan bagian base domain & tidak ada di domainMap (apex pihak ketiga tak dikenal). */
  isUnknownDomain: boolean;
  /** Host dipetakan eksplisit lewat Edge Config domainMap (custom domain). */
  isCustomDomain: boolean;
}

export function isDevHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.test')
  );
}

/** Host platform Vercel (preview/production URL) — selalu portal default. */
function isPlatformHost(host: string): boolean {
  return (
    host.endsWith('.vercel.app') ||
    host.endsWith('.vercel.dev') ||
    host.endsWith('.now.sh')
  );
}

function buildContext(
  host: string,
  baseDomain: string,
  subdomain: string,
  isCustomDomain: boolean,
  isUnknownDomain: boolean,
  reserved: Set<string>,
): DomainContext {
  const sub = subdomain.toLowerCase();

  // Environment demo: subdomain "demo" atau "demo-<module>" (mis. demo-sso,
  // demo-spmb, demo-siakad). Prefix "demo-" dilepas agar modul tetap terdeteksi.
  const isDemoEnv = sub === 'demo' || sub.startsWith('demo-');
  const moduleSub = isDemoEnv ? (sub === 'demo' ? '' : sub.slice('demo-'.length)) : sub;

  const isReserved = moduleSub === '' || reserved.has(moduleSub);
  const moduleSlug = isReserved ? null : moduleSub;
  const modulePath = moduleSlug ? `/${moduleSlug}` : null;

  return {
    hostname: host,
    baseDomain,
    subdomain: sub,
    effectiveSubdomain: moduleSub,
    moduleSlug,
    modulePath,
    moduleLabel: moduleSlug
      ? MODULE_LABELS[moduleSlug] ?? moduleSlug.toUpperCase()
      : null,
    isModule: moduleSlug !== null,
    isDefault: moduleSlug === null,
    isDemo: isDemoEnv,
    isDev: isDevHost(host),
    isUnknownDomain,
    isCustomDomain,
  };
}

/**
 * Resolve konteks tenant dengan konfigurasi eksplisit (dari Edge Config
 * atau konfigurasi statis). Pure function — aman dipakai di proxy/server.
 *
 * Urutan prioritas:
 *   1. domainMap[host]  -> custom domain / pemetaan eksplisit (menang).
 *   2. baseDomains      -> cocokkan suffix lalu ambil label subdomain.
 *   3. host dev lokal   -> label subdomain dianggap modul (mis. spmb.localhost).
 *   4. host lain        -> portal default + ditandai isUnknownDomain.
 */
export function resolveDomainContextWithConfig(
  hostname: string,
  config: TenantConfig,
): DomainContext {
  const host = (hostname || '').trim().toLowerCase().split(':')[0];
  const reserved = new Set(config.reservedSubdomains.map((s) => s.toLowerCase()));

  // 1. Pemetaan eksplisit (custom domain).
  const mapped = config.domainMap[host];
  if (mapped) {
    let matchedBaseDomain = '';
    for (const bd of config.baseDomains) {
      const norm = bd.trim().toLowerCase();
      if (norm && (host === norm || host.endsWith(`.${norm}`))) {
        if (norm.length > matchedBaseDomain.length) {
          matchedBaseDomain = norm;
        }
      }
    }

    if (mapped === 'default' || mapped === 'sso' || reserved.has(mapped)) {
      return buildContext(host, matchedBaseDomain, '', true, false, reserved);
    }
    return buildContext(host, matchedBaseDomain, mapped, true, false, reserved);
  }

  // 2. Cocokkan base domain (suffix).
  let baseDomain = '';
  let subdomain = '';
  for (const bd of config.baseDomains) {
    const norm = bd.toLowerCase();
    if (host === norm) {
      baseDomain = norm;
      subdomain = '';
      break;
    }
    if (host.endsWith(`.${norm}`)) {
      baseDomain = norm;
      subdomain = host.slice(0, -(norm.length + 1));
      break;
    }
  }

  if (baseDomain) {
    return buildContext(host, '', '', false, true, reserved);
  }

  // 3. Host platform Vercel (preview/production) -> portal default.
  if (isPlatformHost(host)) {
    return buildContext(host, '', '', false, false, reserved);
  }

  // 4. Dev lokal (subdomain.localhost, dsb) -> pakai label subdomain.
  if (isDevHost(host)) {
    const parts = host.split('.');
    subdomain = parts.length > 1 ? parts[0] : '';
    return buildContext(host, '', subdomain, false, false, reserved);
  }

  // 5. Host tak dikenal tanpa pemetaan -> portal default (jangan pernah
  //    memperlakukan apex domain pihak ketiga sebagai modul).
  return buildContext(host, '', '', false, true, reserved);
}

/**
 * Resolve konteks tenant dari hostname (framework-agnostic & pure,
 * memakai konfigurasi statis). Untuk runtime Edge Config-aware, gunakan
 * `resolveDomainContextAsync` di server/proxy.
 */
export function resolveDomainContext(hostname: string): DomainContext {
  return resolveDomainContextWithConfig(hostname, getStaticTenantConfig());
}

/**
 * Halaman landing default setelah login.
 * - Subdomain modul  -> /<module>
 * - Portal SSO        -> /dashboard
 */
export function getDefaultLandingPath(hostname: string): string {
  const ctx = resolveDomainContext(hostname);
  return ctx.modulePath ?? ROUTES.DASHBOARD;
}

/**
 * Header konteks tenant untuk diteruskan ke backend (single-tenant BE tetap
 * dapat men-scope query per modul). Client-safe.
 */
export function getTenantHeaders(hostname?: string): Record<string, string> {
  const host =
    hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '');
  const ctx = resolveDomainContext(host);
  return {
    'x-tenant-host': ctx.hostname,
    'x-tenant-module': ctx.moduleSlug ?? 'default',
  };
}

/**
 * Ambil konteks tenant saat ini (client-side).
 * Di server (SSR/SSG) mengembalikan konteks default.
 */
export function getCurrentDomainContext(): DomainContext {
  if (typeof window === 'undefined') return resolveDomainContext('');
  return resolveDomainContext(window.location.hostname);
}

/**
 * Dapatkan atribut cookie domain (misal: "domain=.polinus.cloud; " atau "")
 * agar cookie SSO dapat diakses oleh seluruh subdomain (*.polinus.cloud).
 */
export function getCookieDomain(hostname?: string): string {
  if (typeof window === 'undefined' && !hostname) return '';
  const host = (hostname || (typeof window !== 'undefined' ? window.location.hostname : '')).trim().toLowerCase().split(':')[0];
  const ctx = resolveDomainContext(host);
  const parentDomain =
    ctx.baseDomain ||
    BASE_DOMAINS.filter((domain) => host === domain || host.endsWith(`.${domain}`))
      .sort((a, b) => b.length - a.length)[0];

  return parentDomain ? `domain=.${parentDomain}; ` : '';
}

/**
 * Baca nilai cookie dari document.cookie berdasarkan nama.
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Buat URL modul berdasarkan konteks multi-tenant:
 * - Di lingkungan domain (mis. sso.polinus.cloud):
 *     getModuleUrl('siakad') -> "https://siakad.polinus.cloud"
 *     getModuleUrl('sso')    -> "https://sso.polinus.cloud/dashboard"
 *     getModuleUrl('siakad', '/krs') -> "https://siakad.polinus.cloud/krs"
 * - Di lingkungan lokal (localhost / IP tanpa base domain terdaftar):
 *     getModuleUrl('siakad') -> "/siakad"
 *     getModuleUrl('sso')    -> "/dashboard"
 *     getModuleUrl('siakad', '/krs') -> "/siakad/krs"
 */
export function getModuleUrl(moduleCode: string, path: string = '', currentHostname?: string): string {
  const host = (currentHostname || (typeof window !== 'undefined' ? window.location.hostname : '')).trim().toLowerCase().split(':')[0];
  const ctx = resolveDomainContext(host);
  const code = (moduleCode || '').toLowerCase().trim();
  const config = getStaticTenantConfig();

  let cleanPath = path.trim();
  if (cleanPath && !cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  // Jika di localhost / dev host tanpa base domain terdaftar, gunakan relative path internal
  if (ctx.isDev) {
    if (RESERVED_SUBDOMAINS.has(code) || code === 'sso' || code === 'default') {
      return cleanPath || ROUTES.DASHBOARD;
    }
    return `/${code}${cleanPath}`;
  }

  const protocol = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'https:';
  const prefix = ctx.isDemo ? 'demo-' : '';

  // 1. Cek apakah ada pemetaan domain khusus untuk modul ini di domainMap
  const mappedHost = Object.entries(config.domainMap).find(([, mod]) => mod.toLowerCase() === code)?.[0];
  if (mappedHost) {
    if (cleanPath === `/${code}`) {
      cleanPath = '';
    } else if (cleanPath.startsWith(`/${code}/`)) {
      cleanPath = cleanPath.slice(code.length + 1);
    }
    return `${protocol}//${mappedHost}${cleanPath || ''}`;
  }

  // 2. Jika target adalah portal SSO / domain default
  if (RESERVED_SUBDOMAINS.has(code) || code === 'sso' || code === 'default') {
    const mappedSsoHost = Object.entries(config.domainMap).find(
      ([, mod]) => mod.toLowerCase() === 'sso' || mod.toLowerCase() === 'default',
    )?.[0];
    const ssoPath = cleanPath || ROUTES.DASHBOARD;
    if (mappedSsoHost) {
      return `${protocol}//${mappedSsoHost}${ssoPath.startsWith('/') ? ssoPath : `/${ssoPath}`}`;
    }
    if (ctx.baseDomain) {
      return `${protocol}//${prefix}sso.${ctx.baseDomain}${ssoPath.startsWith('/') ? ssoPath : `/${ssoPath}`}`;
    }
    return ssoPath;
  }

  // 3. Jika non-base domain dan tidak ada pemetaan modul, gunakan relative path internal
  if (!ctx.baseDomain) {
    return `/${code}${cleanPath}`;
  }

  // 4. Target subdomain modul standar
  // Potong prefix `/${code}` jika ada di path agar tidak menjadi siakad.polinus.cloud/siakad
  if (cleanPath === `/${code}`) {
    cleanPath = '';
  } else if (cleanPath.startsWith(`/${code}/`)) {
    cleanPath = cleanPath.slice(code.length + 1);
  }

  return `${protocol}//${prefix}${code}.${ctx.baseDomain}${cleanPath || ''}`;
}

/**
 * Dapatkan nama cookie / key token otentikasi berdasarkan lingkungan:
 * - Lingkungan Demo     -> 'demo_sso_access_token'
 * - Lingkungan Produksi -> 'sso_access_token' (TOKEN_KEY)
 */
export function getAuthTokenKey(isDemo?: boolean, hostname?: string): string {
  if (typeof isDemo === 'boolean') {
    return isDemo ? 'demo_sso_access_token' : TOKEN_KEY;
  }
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  const ctx = resolveDomainContext(host);
  return ctx.isDemo ? 'demo_sso_access_token' : TOKEN_KEY;
}


