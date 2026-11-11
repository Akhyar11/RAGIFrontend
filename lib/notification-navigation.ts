import { getModuleUrl, MODULE_LABELS } from '@/lib/domain';

/** Resolve module links through the tenant router and allow only internal destinations. */
export function getNotificationTarget(url: string | null): string | null {
  if (!url?.startsWith('/') || url.startsWith('//') || url.includes('\\')) return null;
  const code = url.split('/')[1]?.toLowerCase();
  return code && Object.hasOwn(MODULE_LABELS, code)
    ? getModuleUrl(code, url.slice(code.length + 1))
    : url;
}
