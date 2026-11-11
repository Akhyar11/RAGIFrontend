import Link from 'next/link';
import type { NotificationSource } from '@/types/notification.types';

export function InboxTabs({ active }: { active: NotificationSource }) {
  const activeStyle = { color: 'var(--module-primary, var(--primary-600))', borderColor: 'var(--module-primary, var(--primary-600))', backgroundColor: 'var(--module-primary-subtle)' };
  return (
    <nav aria-label="Sumber notifikasi" className="flex gap-4 border-b border-slate-200">
      <Link href="/notifikasi" aria-current={active === 'system' ? 'page' : undefined}
        className="px-4 py-2 text-xs font-bold rounded-t-lg border-b-2" style={active === 'system' ? activeStyle : undefined}>Sistem</Link>
      <Link href="/lms/notifikasi" aria-current={active === 'lms' ? 'page' : undefined}
        className="px-4 py-2 text-xs font-bold rounded-t-lg border-b-2" style={active === 'lms' ? activeStyle : undefined}>LMS</Link>
    </nav>
  );
}
