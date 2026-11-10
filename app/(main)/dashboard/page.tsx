'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Smartphone,
  GraduationCap,
  Activity,
  UserCheck,
  LayoutGrid,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/utils';
import { moduleService, AppModule } from '@/services/module.service';
import { getModuleUrl } from '@/lib/domain';
import type { User } from '@/types/auth.types';

interface SummaryItem {
  id: string;
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  icon: React.ReactNode;
  iconVariant: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [appModules, setAppModules] = useState<AppModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    moduleService
      .getAllModules()
      .then(setAppModules)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const displayUser: User = user || {
    id: 0,
    username: 'Pengguna',
    email: 'user@kampus.ac.id',
    is_active: true,
    is_verified: true,
    last_login_at: new Date().toISOString(),
    created_at: '',
    updated_at: '',
    roles: [],
  };
  const welcomeName =
    [displayUser.name, displayUser.nama_lengkap, displayUser.pegawai?.nama_lengkap, displayUser.mahasiswa?.nama_lengkap]
      .find((name) => typeof name === 'string' && name.trim())?.trim() ||
    displayUser.username ||
    'Pengguna';

  // Dynamic RBAC & Module Access Logic
  const allowedModules = new Set<string>();
  let hasSuperAccess = false;

  displayUser.roles?.forEach((r: any) => {
    const roleObj = r.role || r;
    if (roleObj.is_superadmin || roleObj.is_admin) {
      hasSuperAccess = true;
    }
    const perms = roleObj.permissions || [];
    perms.forEach((p: any) => {
      const permObj = p.permission || p;
      const mod = permObj.module || permObj.module_code;
      if (mod) allowedModules.add(mod);
    });
  });

  const filteredModules = hasSuperAccess
    ? appModules
    : appModules.filter((m) => allowedModules.has(m.code));

  const primaryRole =
    displayUser.roles?.[0]?.role?.name ||
    displayUser.roles?.[0]?.name ||
    'Pengguna';

  const roleCount = displayUser.roles?.length ?? 1;

  // Account Summary Config
  const summaryItems: SummaryItem[] = [
    {
      id: 'security',
      label: 'Status Keamanan',
      value: 'Terverifikasi',
      sub: 'Enkripsi SSL/TLS Aktif',
      icon: <ShieldCheck size={18} />,
      iconVariant: 'stat-icon-blue',
    },
    {
      id: 'session',
      label: 'Sesi Aktif',
      value: '1 Perangkat',
      sub: (
        <Link href="/profile/sessions" className="db-sub-link">
          Kelola Sesi →
        </Link>
      ),
      icon: <Smartphone size={18} />,
      iconVariant: 'stat-icon-green',
    },
    {
      id: 'roles',
      label: 'Peran (Roles)',
      value: `${roleCount} Role`,
      sub: primaryRole,
      icon: <UserCheck size={18} />,
      iconVariant: 'stat-icon-amber',
    },
    {
      id: 'modules',
      label: 'Modul Tersedia',
      value: `${filteredModules.length} Modul`,
      sub: 'PDDikti & OBE Compliant',
      icon: <GraduationCap size={18} />,
      iconVariant: 'stat-icon-indigo',
    },
  ];

  return (
    <div className="animate-fade-in flex flex-col gap-6">
      {/* ── Page Header ────────────────────────────────── */}
      <PageHeader
        title="Portal Terintegrasi SSO"
        description="Pusat autentikasi & akses seluruh aplikasi ekosistem universitas"
      />

      {/* ── Welcome / Identity Banner ───────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Identity info */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <StatusBadge active={displayUser.is_active} />
              {displayUser.roles?.map((r: any, idx: number) => (
                <Badge key={idx} variant="blue">
                  {r.role?.name || r.name}
                </Badge>
              ))}
            </div>

            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Selamat Datang, {welcomeName}! 👋
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Akun Anda terhubung dengan modul akademik &amp; administratif.
              Anda dapat berpindah aplikasi dengan Single Sign-On tanpa perlu login ulang.
            </p>
          </div>

          {/* Last login info */}
          <div className="flex flex-col md:items-end justify-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shrink-0">
            <div className="text-[0.75rem] text-slate-300 font-medium">Login Terakhir</div>
            <div className="text-sm font-semibold text-white">
              {formatDateTime(displayUser.last_login_at || new Date().toISOString())}
            </div>
            <div className="flex items-center gap-1.5 text-[0.75rem] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sesi Aktif Aman
            </div>
          </div>
        </div>
      </div>

      {/* ── Account Summary Grid ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryItems.map((item) => (
          <div key={item.id} className="card p-4 md:p-6 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {item.label}
              </span>
              <div className="p-2 rounded-xl text-slate-700 bg-slate-100">
                {item.icon}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xl font-bold text-slate-900">{item.value}</div>
              <div className="text-xs text-slate-500 font-medium">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Application Access Grid ─────────────────────── */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Aplikasi &amp; Sistem Terintegrasi</h3>
          <p className="text-sm text-slate-500">
            Pilih sistem yang ingin Anda akses dengan Single Sign-On
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4 md:p-6 flex flex-col gap-4">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <Skeleton className="w-3/4 h-5 rounded" />
                <Skeleton className="w-full h-12 rounded" />
              </div>
            ))}
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="card p-8 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold text-slate-800">Belum ada aplikasi tersedia</p>
              <p className="text-xs text-slate-500">
                Belum ada sistem yang dapat diakses oleh akun Anda saat ini.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredModules.map((mod) => {
              const primaryColor = mod.primary_color || '#3b82f6';

              return (
                <div
                  key={mod.id}
                  className="card p-4 md:p-6 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border border-slate-200/80 group"
                  style={{
                    borderTop: `3px solid ${primaryColor}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${primaryColor}15`,
                        color: primaryColor,
                      }}
                    >
                      <LayoutGrid size={20} />
                    </div>
                    <span
                      className="px-2.5 py-1 text-[0.75rem] font-bold rounded-md border shrink-0"
                      style={{
                        backgroundColor: `${primaryColor}10`,
                        color: primaryColor,
                        borderColor: `${primaryColor}30`,
                      }}
                    >
                      SSO Ready
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h4 className="text-base font-bold text-slate-900 transition-colors">
                      {mod.name}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {mod.description ||
                        `Akses modul ${mod.name} menggunakan tiket autentikasi terpusat.`}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-between hover:text-white transition-all"
                    style={{
                      borderColor: `${primaryColor}40`,
                      color: primaryColor,
                    }}
                    icon={<ArrowRight size={15} />}
                    onClick={() => {
                      toast.success(`Membuka ${mod.name}…`);
                      const targetUrl = getModuleUrl(mod.code);
                      window.open(targetUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Buka Aplikasi
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
