import { headers } from 'next/headers';
import { MainLayoutClient } from './MainLayoutClient';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const tenantModule = requestHeaders.get('x-tenant-module') ?? 'default';

  return <MainLayoutClient tenantModule={tenantModule}>{children}</MainLayoutClient>;
}
