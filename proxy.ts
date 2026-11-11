import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  resolveDomainContextWithConfig,
  MODULE_LABELS,
  RESERVED_SUBDOMAINS,
  getAuthTokenKey,
} from '@/lib/domain';
import { getTenantConfig } from '@/lib/tenant-config.server';
import { SYSTEM_MODULES } from '@/lib/constants';

// Rute publik yang dapat diakses tanpa autentikasi
const PUBLIC_PATHS = new Set([
  '/login',
  '/login/sso',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/mfa',
  '/not-found',
  '/unauthorized',
  '/error',
  '/validasi-pembayaran',
  '/validasi-dispensasi',
  '/validasi-kartu-ujian',
  '/validasi-dokumen',
  '/sikeu/validasi-pembayaran',
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  for (const p of PUBLIC_PATHS) {
    if (pathname.startsWith(`${p}/`)) return true;
  }
  return false;
}

// Halaman autentikasi yang WAJIB tampil di portal SSO (bukan di subdomain modul).
const AUTH_ENTRY_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/mfa',
];

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Cegah OPEN REDIRECT (vektor phishing/abuse): hanya izinkan path relatif,
// atau URL absolut yang host-nya masih di domain kita sendiri.
function isSafeRedirect(target: string, host: string, baseDomain: string): boolean {
  if (!target) return false;
  // Path relatif (tolak protocol-relative '//evil.com').
  if (target.startsWith('/') && !target.startsWith('//')) return true;
  try {
    const url = new URL(target);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const targetHost = url.hostname.toLowerCase();
    const currentHost = host.toLowerCase().split(':')[0];
    if (targetHost === currentHost) return true;
    if (baseDomain && (targetHost === baseDomain || targetHost.endsWith(`.${baseDomain}`))) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============================================================
// PROXY — Multi-Tenant Subdomain Routing (Next.js 16)
//
// 1. Auth Guard Server-Side:
//    Mencegah glitch tampilan dashboard dengan langsung mengarahkan (307)
//    request yang belum terotentikasi ke panel login SSO sebelum halaman modul
//    sempat di-render oleh server/client.
//
// 2. Pada domain SSO / portal default (mis. sso.polinus.cloud / ragife.polinus.cloud):
//    Akses ke path modul (/siakad, /sikeu, dll.) dialihkan (307 redirect)
//    ke subdomain modul terkait (siakad.polinus.cloud, sikeu.polinus.cloud).
//
// 3. Pada subdomain modul (mis. siakad.polinus.cloud):
//    - Root '/' di-rewrite secara internal ke '/siakad' (URL browser tetap siakad.polinus.cloud).
//    - Subpath bersih '/krs' di-rewrite secara internal ke '/siakad/krs'.
//    - Akses langsung ke '/siakad' atau '/siakad/krs' langsung diteruskan (next())
//      tanpa redirect loop.
//    - Header marker 'x-proxy-rewritten' dipasang untuk mencegah re-processing loop.
// ============================================================

export async function proxy(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    '';

  const config = await getTenantConfig();
  let ctx = resolveDomainContextWithConfig(host, config);
  const { pathname } = request.nextUrl;
  const hostname = host.trim().toLowerCase().split(':')[0];
  const isLocalDevelopment =
    process.env.NODE_ENV !== 'production' &&
    (hostname === 'localhost' || hostname === '127.0.0.1');

  if (isLocalDevelopment) {
    const firstSegment = pathname.split('/').filter(Boolean)[0]?.toLowerCase();
    const localModule = SYSTEM_MODULES.find((module) =>
      module.value === firstSegment && module.value in MODULE_LABELS
    );

    if (localModule) {
      ctx = resolveDomainContextWithConfig(`${localModule.value}.localhost`, config);
    } else if (pathname === '/' || isPublicRoute(pathname)) {
      ctx = resolveDomainContextWithConfig('localhost', config);
    }
  }

  if (ctx.isUnknownDomain) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (request.headers.get('x-proxy-rewritten') === '1') {
    return NextResponse.next();
  }

  // Header tenant yang diteruskan ke Server Components (headers().get('x-tenant-*')).
  const tenantHeaders = new Headers(request.headers);
  tenantHeaders.set('x-tenant-host', ctx.hostname);
  tenantHeaders.set('x-tenant-module', ctx.moduleSlug ?? 'default');
  tenantHeaders.set('x-tenant-custom', ctx.isCustomDomain ? '1' : '0');

  // 1. Abaikan API routes (dikelola oleh Sanctum / backend API langsung)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const envPrefix = ctx.isDemo ? 'demo-' : '';
  const effectiveBaseDomain =
    ctx.baseDomain ||
    config.baseDomains
      .map((d) => d.trim().toLowerCase())
      .filter((d) => hostname === d || hostname.endsWith(`.${d}`))
      .sort((a, b) => b.length - a.length)[0] ||
    '';

  // Cross-domain module & SSO redirection (berlaku untuk SEMUA domain di luar dev lokal)
  if (!isLocalDevelopment) {
    const firstSegment = pathname.split('/')[1]?.toLowerCase();
    const restPath = firstSegment ? pathname.slice(firstSegment.length + 1) : '';

    if (firstSegment && firstSegment in MODULE_LABELS && firstSegment !== ctx.moduleSlug) {
      const mappedModuleHost = Object.entries(config.domainMap).find(
        ([, module]) => module.toLowerCase() === firstSegment,
      )?.[0];

      if (mappedModuleHost && mappedModuleHost !== host && mappedModuleHost !== hostname) {
        const targetUrl = new URL(restPath || '/', `https://${mappedModuleHost}`);
        targetUrl.search = request.nextUrl.search;
        return NextResponse.redirect(targetUrl, 307);
      }

      if (effectiveBaseDomain) {
        const targetHost = `${envPrefix}${firstSegment}.${effectiveBaseDomain}`;
        if (targetHost !== host && targetHost !== hostname) {
          const targetUrl = new URL(restPath || '/', `https://${targetHost}`);
          targetUrl.search = request.nextUrl.search;
          return NextResponse.redirect(targetUrl, 307);
        }
      }
    } else if (
      firstSegment &&
      (firstSegment === 'sso' || firstSegment === 'default' || RESERVED_SUBDOMAINS.has(firstSegment))
    ) {
      if (!ctx.isDefault) {
        const mappedSsoHost = Object.entries(config.domainMap).find(
          ([, module]) => module.toLowerCase() === 'sso' || module.toLowerCase() === 'default',
        )?.[0];

        if (mappedSsoHost && mappedSsoHost !== host && mappedSsoHost !== hostname) {
          const targetUrl = new URL(restPath || '/', `https://${mappedSsoHost}`);
          targetUrl.search = request.nextUrl.search;
          return NextResponse.redirect(targetUrl, 307);
        }

        if (effectiveBaseDomain) {
          const targetHost = `${envPrefix}sso.${effectiveBaseDomain}`;
          if (targetHost !== host && targetHost !== hostname) {
            const targetUrl = new URL(restPath || '/', `https://${targetHost}`);
            targetUrl.search = request.nextUrl.search;
            return NextResponse.redirect(targetUrl, 307);
          }
        }
      }
    }
  }

  const tokenKey = getAuthTokenKey(ctx.isDemo, host);
  const token = request.cookies.get(tokenKey)?.value;

  // 2. Auth Guard Server-Side:
  //    Jika belum login dan mengakses rute terproteksi, langsung alihkan (307 redirect)
  //    ke panel login SSO tanpa pernah me-render HTML modul/dashboard (menghilangkan glitch 100%).
  if (!token && !isPublicRoute(pathname)) {
    const mappedSsoHost = Object.entries(config.domainMap).find(
      ([, module]) => module.toLowerCase() === 'sso' || module.toLowerCase() === 'default',
    )?.[0];
    const ssoTargetHost =
      mappedSsoHost ||
      (effectiveBaseDomain ? `${envPrefix}sso.${effectiveBaseDomain}` : (ctx.baseDomain ? `${envPrefix}sso.${ctx.baseDomain}` : ''));

    if (ssoTargetHost) {
      const returnUrl = `https://${host}${pathname}${request.nextUrl.search}`;
      const loginUrl = new URL('/login', `https://${ssoTargetHost}`);
      loginUrl.searchParams.set('redirect', returnUrl);
      return NextResponse.redirect(loginUrl);
    } else {
      const returnUrl = `${pathname}${request.nextUrl.search}`;
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', returnUrl);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Jika sudah login dan mengakses /login, alihkan ke dashboard / redirect URL
  if (token && pathname === '/login') {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam && isSafeRedirect(redirectParam, host, ctx.baseDomain || effectiveBaseDomain)) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Kasus 2: Permintaan berada di subdomain modul (misal siakad.polinus.cloud)
  if (ctx.isModule && ctx.moduleSlug) {
    const modSlug = ctx.moduleSlug;
    const modPath = ctx.modulePath as string; // misal '/siakad'

    // 2a. Jika pathname sudah memiliki prefix modul (misal '/siakad' atau '/siakad/krs'),
    // langsung lanjutkan tanpa rewrite/redirect agar tidak terjadi redirect loop
    if (pathname === modPath || pathname.startsWith(`${modPath}/`)) {
      return NextResponse.next({ request: { headers: tenantHeaders } });
    }

    // 2a-2. Halaman autentikasi (login/register/...) pada subdomain modul
    // diarahkan ke portal SSO, agar tidak pernah tampil di subdomain modul
    // (mis. 'spmb.ragispace.com/login' -> 'sso.ragispace.com/login').
    if (isAuthEntryPath(pathname)) {
      const mappedSsoHost = Object.entries(config.domainMap).find(
        ([, module]) => module.toLowerCase() === 'sso' || module.toLowerCase() === 'default',
      )?.[0];
      const ssoTargetHost =
        mappedSsoHost ||
        (effectiveBaseDomain ? `${envPrefix}sso.${effectiveBaseDomain}` : (ctx.baseDomain ? `${envPrefix}sso.${ctx.baseDomain}` : ''));
      if (ssoTargetHost && ssoTargetHost !== host && ssoTargetHost !== hostname) {
        const ssoUrl = new URL(pathname, `https://${ssoTargetHost}`);
        ssoUrl.search = request.nextUrl.search;
        return NextResponse.redirect(ssoUrl);
      }
    }

    // 2b. Abaikan rute auth & system global (login, profile, api, dll.)
    const isExcluded = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/profile',
      '/notifikasi',
      '/lms/notifikasi',
      '/mfa',
      '/not-found',
      '/unauthorized',
      '/error',
    ].some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (isExcluded || pathname.startsWith('/api/')) {
      return NextResponse.next({ request: { headers: tenantHeaders } });
    }

    // Pasang penanda request header pada rewrite internal
    const requestHeaders = new Headers(tenantHeaders);
    requestHeaders.set('x-proxy-rewritten', '1');

    // 2c. Root path '/' -> rewrite internal ke modPath (misal '/siakad')
    if (pathname === '/') {
      const targetUrl = new URL(modPath, request.url);
      targetUrl.search = request.nextUrl.search;
      return NextResponse.rewrite(targetUrl, {
        request: {
          headers: requestHeaders,
        },
      });
    }

    // Guard: jangan pernah me-rewrite jika path ditujukan untuk modul lain atau reserved subdomain
    const firstSegment = pathname.split('/')[1]?.toLowerCase();
    if (
      firstSegment &&
      ((firstSegment in MODULE_LABELS && firstSegment !== modSlug) ||
        RESERVED_SUBDOMAINS.has(firstSegment) ||
        firstSegment === 'sso' ||
        firstSegment === 'default')
    ) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // 2d. Subpath bersih (misal '/krs', '/dashboard', '/nilai')
    // Rewrite internal ke modPath + pathname (misal '/siakad/krs')
    const internalPath = `${modPath}${pathname}`;
    const targetUrl = new URL(internalPath, request.url);
    targetUrl.search = request.nextUrl.search;
    return NextResponse.rewrite(targetUrl, {
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({ request: { headers: tenantHeaders } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.well-known).*)',
  ],
};

