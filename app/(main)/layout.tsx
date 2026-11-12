import { headers } from 'next/headers';
import { MainLayoutClient } from './MainLayoutClient';
import { TenantConfigProvider } from '@/components/tenant-config-provider';
import { getTenantConfig } from '@/lib/tenant-config.server';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [requestHeaders, tenantConfig] = await Promise.all([headers(), getTenantConfig()]);
  const tenantModule = requestHeaders.get('x-tenant-module') ?? 'default';

  return (
    <TenantConfigProvider config={tenantConfig}>
      <MainLayoutClient tenantModule={tenantModule}>{children}</MainLayoutClient>
    </TenantConfigProvider>
  );
}
