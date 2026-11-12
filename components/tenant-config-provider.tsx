'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TenantConfig } from '@/lib/tenant-config';

const TenantConfigContext = createContext<TenantConfig | null>(null);

export function TenantConfigProvider({
  config,
  children,
}: {
  config: TenantConfig;
  children: ReactNode;
}) {
  return <TenantConfigContext.Provider value={config}>{children}</TenantConfigContext.Provider>;
}

export function useTenantConfig(): TenantConfig {
  const config = useContext(TenantConfigContext);
  if (!config) throw new Error('TenantConfigProvider belum dipasang.');
  return config;
}