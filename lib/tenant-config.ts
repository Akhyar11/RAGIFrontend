import { SYSTEM_MODULES } from './constants';

// ============================================================
// TENANT CONFIG — Tipe + konfigurasi statis (CLIENT-SAFE)
//
// File ini TIDAK boleh mengimpor paket server-only (mis. @vercel/edge-config)
// karena dipakai juga oleh komponen client (Sidebar, domain helper, dsb).
// Pembacaan Edge Config ada di `lib/tenant-config.server.ts`.
// ============================================================

export interface TenantConfig {
  /** Root domain yang mendukung subdomain modul (mis. myplatform.com). */
  baseDomains: string[];
  /** Subdomain yang bukan modul (portal SSO/default). */
  reservedSubdomains: string[];
  /** Custom domain eksplisit -> slug modul, atau "default" untuk portal. */
  domainMap: Record<string, string>;
  /** Daftar modul yang boleh diakses lewat subdomain/custom domain. */
  enabledModules: string[];
}

const DEFAULT_RESERVED_SUBDOMAINS = [
  'sso',
  'www',
  'api',
  'mail',
  'webmail',
  'ftp',
  'cloudflare',
  'ragife',
  'ragibe',
  'localhost',
  'demo-sso',
  'demo',
];

function parseDomainMap(value?: string | null): Record<string, string> {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([host, module]) => [host.trim().toLowerCase(), module.trim().toLowerCase()])
        .filter(([host, module]) => Boolean(host && module)),
    );
  } catch {
    return {};
  }
}

function parseList(value?: string | null): string[] | null {
  if (!value) return null;
  const items = value
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

function staticConfig(): TenantConfig {
  const baseDomains =
    parseList(process.env.TENANT_BASE_DOMAINS) ??
    parseList(process.env.NEXT_PUBLIC_BASE_DOMAINS) ??
    ['polinus.cloud', 'polinus.ac.id', 'ragi.cloud'];

  const reserved =
    parseList(process.env.TENANT_RESERVED_SUBDOMAINS) ?? DEFAULT_RESERVED_SUBDOMAINS;
  const domainMap = parseDomainMap(process.env.TENANT_DOMAIN_MAP);

  return {
    baseDomains,
    reservedSubdomains: reserved,
    domainMap,
    enabledModules: SYSTEM_MODULES.map((m) => m.value),
  };
}

let staticMemo: TenantConfig | null = null;

/** Konfigurasi statis (tanpa Edge Config) — aman dipakai di client component. */
export function getStaticTenantConfig(): TenantConfig {
  if (!staticMemo) staticMemo = staticConfig();
  return staticMemo;
}

function normalizeConfig(remote: Partial<TenantConfig> | null | undefined): TenantConfig {
  const base = getStaticTenantConfig();
  if (!remote) return base;

  const domainMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(remote.domainMap ?? {})) {
    if (!k || typeof v !== 'string') continue;
    domainMap[k.trim().toLowerCase()] = v.trim().toLowerCase();
  }

  return {
    baseDomains:
      Array.isArray(remote.baseDomains) && remote.baseDomains.length > 0
        ? remote.baseDomains.map((d) => d.trim().toLowerCase()).filter(Boolean)
        : base.baseDomains,
    reservedSubdomains:
      Array.isArray(remote.reservedSubdomains) && remote.reservedSubdomains.length > 0
        ? Array.from(
            new Set([
              ...base.reservedSubdomains,
              ...remote.reservedSubdomains.map((s) => s.trim().toLowerCase()),
            ]),
          )
        : base.reservedSubdomains,
    domainMap: { ...base.domainMap, ...domainMap },
    enabledModules:
      Array.isArray(remote.enabledModules) && remote.enabledModules.length > 0
        ? remote.enabledModules.map((m) => m.trim().toLowerCase()).filter(Boolean)
        : base.enabledModules,
  };
}

/** Normalisasi config dari Edge Config (dipakai server; tetap pure/aman di client). */
export { normalizeConfig };
