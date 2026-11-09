'use client';

import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';

export default function SikeuLayout({ children }: { children: React.ReactNode }) {
  const { user, hasRole, hasPermission } = useAuth();

  const canAccessSikeu = useMemo(() => {
    if (!user) return false;
    if (hasRole(['admin', 'superadmin', 'admin_simpeg'])) return true;

    // Cek namespace izin via hasPermission (string di dalam argumen diperbolehkan audit 01 aturan no.5).
    return (
      hasPermission('sikeu.dashboard.read') ||
      hasPermission('sikeu.tagihan.read') ||
      hasPermission('sikeu.dispensasi.read') ||
      hasPermission('sikeu.pengajuan.read') ||
      hasPermission('sikeu.pengeluaran.read') ||
      hasPermission('sikeu.pemasukan.read') ||
      hasPermission('sikeu.kaskecil.read') ||
      hasPermission('sikeu.pajak.read') ||
      hasPermission('sikeu.pajak_akun.manage') ||
      hasPermission('sikeu.master.manage') ||
      hasPermission('sikeu.kas.manage') ||
      hasPermission('sikeu.akuntansi.read') ||
      hasPermission('sikeu.akuntansi.manage') ||
      hasPermission('sikeu.laporan.read') ||
      hasPermission('sikeu.unitkas.read') ||
      hasPermission('sikeu.paymentgateway.manage') ||
      hasPermission('sikeu.lpj.verify')
    );
  }, [user, hasRole, hasPermission]);

  if (!canAccessSikeu) {
    return (
      <div className="theme-sikeu animate-fade-in space-y-6 w-full">
        <PageHeader
          title="Modul Keuangan (SIKEU)"
          description="Keuangan, Akuntansi, Tarif Angkatan, Dispensasi, dan Beasiswa"
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40 text-rose-500" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Anda tidak memiliki hak akses ke modul SIKEU. Hubungi administrator untuk diberikan akses.
          </p>
        </div>
      </div>
    );
  }

  return <div className="theme-sikeu w-full">{children}</div>;
}