'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { feederService } from '@/services/feeder.service';
import toast from 'react-hot-toast';
import {
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Settings,
  History,
  GraduationCap,
  Users,
  User,
  BookOpen,
  CalendarCheck,
  Server,
  Filter,
} from 'lucide-react';

export default function FeederSyncPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dosen' | 'mahasiswa' | 'akademik' | 'perkuliahan' | 'mappings' | 'logs'>('dosen');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<string | null>(null);

  // Tab → entitas feeder yang tercakup (untuk filter mapping/log per tab)
  const TAB_ENTITIES: Record<string, string[]> = {
    dosen: ['dosen', 'pull_dosen', 'penugasan_dosen', 'ajar_dosen'],
    mahasiswa: ['mahasiswa', 'biodata_mahasiswa', 'riwayat_pendidikan_mahasiswa'],
    akademik: ['prodi', 'mata_kuliah'],
    perkuliahan: ['kelas', 'ajar_dosen'],
  };

  // Mappings & Logs state
  const [mappings, setMappings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [syncingEntity, setSyncingEntity] = useState<string | null>(null);

  // Filter Drawer State (Mappings Tab)
  const [showFilter, setShowFilter] = useState(false);
  const [filterEntityType, setFilterEntityType] = useState('');
  const [filterSyncStatus, setFilterSyncStatus] = useState('');
  const [appliedMappingFilters, setAppliedMappingFilters] = useState({
    entity_type: '',
    sync_status: '',
  });

  const checkToken = async () => {
    setIsLoading(true);
    try {
      const res = await feederService.getToken();
      if (res?.data?.token) {
        setTokenInfo(res.data.token);
        toast.success(res?.message || 'Berhasil terhubung ke Web Service Neo Feeder (Live)');
      } else {
        setTokenInfo(null);
        toast.error(res?.message || 'Token tidak ditemukan');
      }
    } catch (error: any) {
      setTokenInfo(null);
      toast.error(error?.response?.data?.message || error.message || 'Gagal terhubung ke Web Service Neo Feeder (Offline / Port Tertutup)');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogsAndMappings = async () => {
    try {
      if (activeTab === 'logs' || activeTab in TAB_ENTITIES) {
        const res = await feederService.getLogs();
        if (res.data) setLogs(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
      if (activeTab === 'mappings' || activeTab in TAB_ENTITIES) {
        const entities = TAB_ENTITIES[activeTab];
        if (entities) {
          const results = await Promise.all(
            entities.map((e) => feederService.getMappings({ entity_type: e }).catch(() => null))
          );
          setMappings(results.flatMap((r: any) => r?.data || []));
        } else {
          const res = await feederService.getMappings(appliedMappingFilters);
          if (res.data) setMappings(res.data);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    checkToken();
  }, []);

  useEffect(() => {
    fetchLogsAndMappings();
  }, [activeTab, appliedMappingFilters]);

  const handleTriggerSync = async (entity: 'mahasiswa' | 'biodata_mahasiswa' | 'riwayat_pendidikan_mahasiswa' | 'dosen' | 'pull_dosen' | 'penugasan_dosen' | 'ajar_dosen' | 'mata_kuliah' | 'kelas' | 'prodi') => {
    try {
      setSyncingEntity(entity);
      const res = await feederService.triggerSync(entity);
      toast.success(res.message || `Sinkronisasi ${entity} berhasil diproses`);
      fetchLogsAndMappings();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || `Gagal sinkronisasi ${entity}`);
    } finally {
      setSyncingEntity(null);
    }
  };

  const mappingColumns: ColumnDef<any>[] = [
    {
      key: 'entity_type',
      label: 'ENTITAS',
      render: (row) => (
        <span className="font-bold text-slate-900 uppercase text-xs">
          {row.entity_type}
        </span>
      ),
    },
    {
      key: 'local_id',
      label: 'LOCAL ID',
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 text-xs">
          #{row.local_id}
        </span>
      ),
    },
    {
      key: 'feeder_id',
      label: 'ID FEEDER / DIKTI',
      render: (row) => (
        <span className="font-mono font-bold text-primary-700 text-xs">
          {row.feeder_id || '-'}
        </span>
      ),
    },
    {
      key: 'sync_status',
      label: 'STATUS SYNC',
      align: 'center',
      render: (row) => (
        <Badge
          variant={
            row.sync_status === 'synced'
              ? 'green'
              : row.sync_status === 'failed'
              ? 'rose'
              : 'amber'
          }
          className="uppercase"
        >
          {row.sync_status}
        </Badge>
      ),
    },
    {
      key: 'last_synced_at',
      label: 'TERAKHIR SYNC',
      render: (row) => (
        <span className="text-slate-500 font-mono text-2xs">
          {row.last_synced_at || '-'}
        </span>
      ),
    },
  ];

  const logColumns: ColumnDef<any>[] = [
    {
      key: 'created_at',
      label: 'WAKTU SYNC',
      render: (row) => (
        <span className="font-mono text-slate-600 text-2xs">
          {row.created_at?.slice(0, 19).replace('T', ' ')}
        </span>
      ),
    },
    {
      key: 'entity_type',
      label: 'MODUL / ENTITAS',
      render: (row) => (
        <span className="font-bold text-slate-900 uppercase text-xs">
          {row.entity_type}
        </span>
      ),
    },
    {
      key: 'sync_type',
      label: 'TIPE',
      render: (row) => (
        <span className="uppercase font-bold text-slate-600 text-2xs">
          {row.sync_type}
        </span>
      ),
    },
    {
      key: 'total_records',
      label: 'TOTAL',
      align: 'center',
      render: (row) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {row.total_records}
        </span>
      ),
    },
    {
      key: 'hasil',
      label: 'SUKSES / GAGAL',
      render: (row) => (
        <span className="tabular-nums text-xs">
          <span className="text-emerald-700 font-bold">{row.success_count} Sukses</span> /{' '}
          <span className="text-rose-600 font-bold">{row.failed_count} Gagal</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => (
        <Badge
          variant={
            row.status === 'success'
              ? 'green'
              : row.status === 'partial'
              ? 'amber'
              : 'rose'
          }
          className="uppercase"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'operator',
      label: 'OPERATOR',
      render: (row) => (
        <span className="text-slate-600 text-xs">
          {row.user?.username || 'System'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Sinkronisasi PDDikti Neo Feeder"
        description="Integrasi Web Service (WS) Neo Feeder, sinkronisasi civitas, kurikulum, dan pelaporan semester."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Neo Feeder Sync' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />}
              onClick={checkToken}
              disabled={isLoading}
            >
              Uji Koneksi
            </Button>
            {activeTab === 'mappings' && (
              <Button
                variant="outline"
                icon={<Filter size={16} />}
                onClick={() => setShowFilter(true)}
              >
                Filter
              </Button>
            )}
          </div>
        }
      />

      {/* Navigation Tabs per Data */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        {(
          [
            { key: 'dosen', label: 'Dosen', icon: <Users size={16} /> },
            { key: 'mahasiswa', label: 'Mahasiswa', icon: <GraduationCap size={16} /> },
            { key: 'akademik', label: 'Akademik (Prodi & MK)', icon: <BookOpen size={16} /> },
            { key: 'perkuliahan', label: 'Perkuliahan & Nilai', icon: <CalendarCheck size={16} /> },
            { key: 'mappings', label: 'Data Mapping Feeder', icon: <Server size={16} /> },
            { key: 'logs', label: 'Riwayat Log Sync', icon: <History size={16} /> },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition -mb-px cursor-pointer whitespace-nowrap ${
              activeTab === t.key
                ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Connection Status Banner (ringkas, tampil di semua tab data) */}
      {activeTab in TAB_ENTITIES && (
        <div className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                tokenInfo
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {tokenInfo ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Koneksi Web Service Neo Feeder (STRICT)
              </p>
              <p className="font-mono text-xs font-bold text-slate-900 mt-0.5 break-all">
                {tokenInfo
                  ? `Token Aktif (Live): ${tokenInfo}`
                  : 'Koneksi Offline / Tidak Terhubung'}
              </p>
            </div>
          </div>
          <Badge variant={tokenInfo ? 'green' : 'rose'}>
            {tokenInfo ? 'LIVE FEEDER TERKONEKSI' : 'OFFLINE / GAGAL'}
          </Badge>
        </div>
      )}

      {/* Tab: Dosen */}
      {activeTab === 'dosen' && (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Data Dosen</h3>
                <p className="text-2xs text-slate-500">Pull biodata, cocokkan NIDN, penugasan PT, dan kirim pengajar kelas kuliah</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Card: Dosen Langkah 1 - Biodata NIDN */}
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Biodata Dosen</h4>
                      <Badge variant="blue">Langkah 1</Badge>
                    </div>
                    <p className="text-2xs text-slate-500">PULL & cocokkan NIDN dari PDDikti</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      className="text-xs font-bold"
                      disabled={syncingEntity === 'dosen' || syncingEntity === 'pull_dosen'}
                      onClick={() => handleTriggerSync('dosen')}
                    >
                      {syncingEntity === 'dosen' ? 'Mencocokkan...' : 'Cocokkan NIDN →'}
                    </Button>
                    <Button
                      variant="primary"
                      className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={syncingEntity === 'dosen' || syncingEntity === 'pull_dosen'}
                      onClick={() => handleTriggerSync('pull_dosen')}
                    >
                      {syncingEntity === 'pull_dosen' ? 'Menarik...' : 'Tarik Feeder →'}
                    </Button>
                </div>
              </div>

              {/* Card: Dosen Langkah 2 - Penugasan Dosen PT (+ info: belum ada menu kelola, auto-generate dari homebase) */}
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Penugasan PT</h4>
                      <Badge variant="indigo">Langkah 2</Badge>
                    </div>
                    <p className="text-2xs text-slate-500">id_registrasi_dosen per Prodi & TA aktif • auto dari homebase, kelola di Direktori Dosen</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                    disabled={syncingEntity === 'penugasan_dosen'}
                    onClick={() => handleTriggerSync('penugasan_dosen')}
                  >
                    {syncingEntity === 'penugasan_dosen' ? 'Mencocokkan...' : 'Cocokkan →'}
                  </Button>
                </div>
              </div>
            </div>

          {/* Status mapping & log terakhir tab ini */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Mapping Dosen Terakhir</h4>
              <DataTable columns={mappingColumns} data={mappings.slice(0, 5)} emptyMessage="Belum ada mapping dosen." />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Log Sync Dosen Terakhir</h4>
              <DataTable columns={logColumns} data={logs.filter((l: any) => TAB_ENTITIES.dosen.includes(l.entity_type)).slice(0, 5)} emptyMessage="Belum ada log sync dosen." />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Mahasiswa */}
      {activeTab === 'mahasiswa' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                <GraduationCap size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Data Mahasiswa</h3>
                <p className="text-2xs text-slate-500">Push biodata, riwayat pendidikan, dan registrasi mahasiswa ke PDDikti — kelola di Civitas Mahasiswa</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Biodata Mahasiswa</h4>
                    <p className="text-2xs text-slate-500">NIK, NISN, Ibu Kandung, Alamat</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={syncingEntity === 'biodata_mahasiswa'}
                    onClick={() => handleTriggerSync('biodata_mahasiswa')}
                  >
                    {syncingEntity === 'biodata_mahasiswa' ? 'Menyinkronkan...' : 'Push Biodata →'}
                  </Button>
                </div>
              </div>

              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Riwayat Pendidikan</h4>
                    <p className="text-2xs text-slate-500">NIM, Prodi, Jalur Masuk, SKS Transfer</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={syncingEntity === 'riwayat_pendidikan_mahasiswa'}
                    onClick={() => handleTriggerSync('riwayat_pendidikan_mahasiswa')}
                  >
                    {syncingEntity === 'riwayat_pendidikan_mahasiswa' ? 'Menyinkronkan...' : 'Push Riwayat →'}
                  </Button>
                </div>
              </div>

              <div className="card p-4 flex flex-col border-2 border-dashed border-primary-200 bg-primary-50/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Sinkronisasi Penuh</h4>
                    <p className="text-2xs text-slate-500">Biodata + Riwayat Pendidikan sekaligus</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold"
                    disabled={syncingEntity === 'mahasiswa'}
                    onClick={() => handleTriggerSync('mahasiswa')}
                  >
                    {syncingEntity === 'mahasiswa' ? 'Menyinkronkan...' : 'Push All →'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Mapping Mahasiswa Terakhir</h4>
              <DataTable columns={mappingColumns} data={mappings.slice(0, 5)} emptyMessage="Belum ada mapping mahasiswa." />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Log Sync Mahasiswa Terakhir</h4>
              <DataTable columns={logColumns} data={logs.filter((l: any) => TAB_ENTITIES.mahasiswa.includes(l.entity_type)).slice(0, 5)} emptyMessage="Belum ada log sync mahasiswa." />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Akademik (Prodi & Mata Kuliah) */}
      {activeTab === 'akademik' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <BookOpen size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Akademik — Prodi & Mata Kuliah</h3>
                <p className="text-2xs text-slate-500">Tarik prodi dari feeder, push mata kuliah — kelola di Master Akademik</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card: Program Studi (PULL — sebelumnya tanpa tombol trigger) */}
              <div className="card p-4 flex flex-col border-2 border-dashed border-purple-200 bg-purple-50/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">Program Studi</h4>
                      <Badge variant="purple">PULL</Badge>
                    </div>
                    <p className="text-2xs text-slate-500">Tarik GetProdi (kode, jenjang, status)</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold"
                    disabled={syncingEntity === 'prodi'}
                    onClick={() => handleTriggerSync('prodi')}
                  >
                    {syncingEntity === 'prodi' ? 'Menarik...' : 'Tarik Prodi →'}
                  </Button>
                </div>
              </div>

              {/* Card: Mata Kuliah */}
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Mata Kuliah & Kurikulum</h4>
                    <p className="text-2xs text-slate-500">Kode MK, total SKS tatap muka & praktek</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold"
                    disabled={syncingEntity === 'mata_kuliah'}
                    onClick={() => handleTriggerSync('mata_kuliah')}
                  >
                    {syncingEntity === 'mata_kuliah' ? 'Menyinkronkan...' : 'Push Mata Kuliah →'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Mapping Akademik Terakhir</h4>
              <DataTable columns={mappingColumns} data={mappings.slice(0, 5)} emptyMessage="Belum ada mapping akademik." />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Log Sync Akademik Terakhir</h4>
              <DataTable columns={logColumns} data={logs.filter((l: any) => TAB_ENTITIES.akademik.includes(l.entity_type)).slice(0, 5)} emptyMessage="Belum ada log sync akademik." />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Perkuliahan (Kelas, Ajar, Nilai) */}
      {activeTab === 'perkuliahan' && (
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CalendarCheck size={16} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Perkuliahan — Kelas & Nilai</h3>
                <p className="text-2xs text-slate-500">Kirim pengajar ke kelas, push kelas + KRS + nilai semester</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card: Ajar Dosen (dipindah ke sini agar se alur perkuliahan) */}
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Ajar Dosen</h4>
                    <p className="text-2xs text-slate-500">Kirim pengajar ke kelas (16 pertemuan)</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white border-none"
                    disabled={syncingEntity === 'ajar_dosen'}
                    onClick={() => handleTriggerSync('ajar_dosen')}
                  >
                    {syncingEntity === 'ajar_dosen' ? 'Mengirim...' : 'Kirim Pengajar →'}
                  </Button>
                </div>
              </div>

              {/* Card: Kelas Perkuliahan */}
              <div className="card p-4 flex flex-col">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Kelas Perkuliahan & Nilai</h4>
                    <p className="text-2xs text-slate-500">Kelas aktif, KRS mahasiswa & nilai semester</p>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    variant="primary"
                    className="text-xs font-bold"
                    disabled={syncingEntity === 'kelas'}
                    onClick={() => handleTriggerSync('kelas')}
                  >
                    {syncingEntity === 'kelas' ? 'Menyinkronkan...' : 'Push Kelas & Nilai →'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Mapping Perkuliahan Terakhir</h4>
              <DataTable columns={mappingColumns} data={mappings.slice(0, 5)} emptyMessage="Belum ada mapping perkuliahan." />
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Log Sync Perkuliahan Terakhir</h4>
              <DataTable columns={logColumns} data={logs.filter((l: any) => TAB_ENTITIES.perkuliahan.includes(l.entity_type)).slice(0, 5)} emptyMessage="Belum ada log sync perkuliahan." />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Staging / Penampungan Mappings */}
      {activeTab === 'mappings' && (
        <DataTable
          columns={mappingColumns}
          data={mappings}
          isLoading={isLoading}
          emptyMessage="Belum ada penampungan data mapping. Klik salah satu tombol 'Push' di tab Operasi Sinkronisasi."
        />
      )}

      {/* Tab 3: Riwayat Logs */}
      {activeTab === 'logs' && (
        <DataTable
          columns={logColumns}
          data={logs}
          isLoading={isLoading}
          emptyMessage="Belum ada riwayat log sinkronisasi Neo Feeder."
        />
      )}

      {/* Filter Drawer for Mappings */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter Mapping Feeder"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setFilterEntityType('');
                setFilterSyncStatus('');
                setAppliedMappingFilters({ entity_type: '', sync_status: '' });
                setShowFilter(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAppliedMappingFilters({
                  entity_type: filterEntityType,
                  sync_status: filterSyncStatus,
                });
                setShowFilter(false);
              }}
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <label className="label">Tipe Entitas</label>
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="select w-full"
            >
              <option value="">Semua Entitas</option>
              <option value="mahasiswa">Mahasiswa</option>
              <option value="dosen">Dosen</option>
              <option value="mata_kuliah">Mata Kuliah</option>
              <option value="kelas">Kelas Perkuliahan</option>
            </select>
          </div>

          <div>
            <label className="label">Status Sinkronisasi</label>
            <select
              value={filterSyncStatus}
              onChange={(e) => setFilterSyncStatus(e.target.value)}
              className="select w-full"
            >
              <option value="">Semua Status</option>
              <option value="synced">Synced (Berhasil)</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed (Gagal)</option>
            </select>
          </div>
        </div>
      </Drawer>

    </div>
  );
}
