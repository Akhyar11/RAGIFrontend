import { expect, test } from '@playwright/test';
import { getModuleUrl } from '../lib/domain';
import { getNotificationTarget } from '../lib/notification-navigation';
import type { TenantConfig } from '../lib/tenant-config';

test('module navigation uses the mapped custom hostname', () => {
  const config: TenantConfig = {
    baseDomains: ['poltekindonusa.ac.id'],
    reservedSubdomains: ['sso'],
    domainMap: {
      'spmb-new.poltekindonusa.ac.id': 'spmb',
    },
    enabledModules: ['spmb'],
  };

  expect(
    getModuleUrl('spmb', '', 'sso.poltekindonusa.ac.id', config),
  ).toBe('https://spmb-new.poltekindonusa.ac.id');
});

test('notification module links use the mapped custom hostname', () => {
  const config: TenantConfig = {
    baseDomains: ['poltekindonusa.ac.id'],
    reservedSubdomains: ['sso'],
    domainMap: {
      'spmb-new.poltekindonusa.ac.id': 'spmb',
    },
    enabledModules: ['spmb'],
  };

  expect(getNotificationTarget('/spmb/pendaftaran/12', config)).toBe(
    'https://spmb-new.poltekindonusa.ac.id/pendaftaran/12',
  );
});