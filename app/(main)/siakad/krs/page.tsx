'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  GraduationCap,
  BookOpen,
  Send,
  Trash2,
  CheckCircle2,
  Clock,
  Lock,
  Layers,
  Filter,
  Sparkles,
  PlusCircle,
  Plus,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { siakadService } from '@/services/siakad.service';
import { useAuth } from '@/hooks/useAuth';
import { KrsAdminList } from './_components/KrsAdminList';
import toast from 'react-hot-toast';
import type { PaginationMeta } from '@/types/api.types';
import {
  KrsSubmitSchema,
  type KrsSubmitFormValues,
} from '@/lib/validations/siakad-pipeline.schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import {
  SEMESTER_OPTIONS,
  HARI_KULIAH_OPTIONS,
  KRS_SORT_BY_OPTIONS,
  SORT_DIRECTION_OPTIONS,
} from '@/lib/constants/siakad.constant';

function KrsMandiriPortal() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeKrs, setActiveKrs] = useState<any | null>(null);
  const [availableClasses, setAvailableClasses] = useState<any[]>([]);
  const [plafonData, setPlafonData] = useState({
    plafon_sks: 24,
    total_sks_diambil: 0,
    sisa_sks: 24,
    ips_sebelumnya: 0,
  });

  // Filter Drawer State (Search & Filter terpusat di Drawer)
  const [searchKelas, setSearchKelas] = useState('');
  const [filterHari, setFilterHari] = useState('ALL');
  const [filterSemester, setFilterSemester] = useState('ALL');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterSortBy, setFilterSortBy] = useState('nama');
  const [filterSortOrder, setFilterSortOrder] = useState('asc');
  const [classPage, setClassPage] = useState(1);
  const [classLimit, setClassLimit] = useState(10);

  // Confirmation dialogs
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmAmbilPaketOpen, setConfirmAmbilPaketOpen] = useState(false);

  // React Hook Form for Submit KRS
  const {
    register: regSubmitKrs,
    handleSubmit: handleSubKrs,
    reset: resetSubmitKrs,
    formState: { errors: errorsSubmitKrs },
  } = useForm<KrsSubmitFormValues>({
    resolver: zodResolver(KrsSubmitSchema),
    defaultValues: {
      tahun_akademik_id: undefined,
      catatan_mahasiswa: '',
    },
  });

  const loadKrsData = useCallback(async () => {
    try {
      setLoading(true);
      const [krsRes, availRes] = await Promise.allSettled([
        siakadService.getActiveKrs(),
        siakadService.getAvailableClasses({
          search: searchKelas || undefined,
          hari: filterHari !== 'ALL' ? filterHari : undefined,
          semester: filterSemester !== 'ALL' ? filterSemester : undefined,
          sort_by: filterSortBy,
          sort_order: filterSortOrder,
        }),
      ]);

      if (krsRes.status === 'fulfilled' && krsRes.value?.data) {
        const kData = krsRes.value.data;
        setActiveKrs(kData);
      }

      if (availRes.status === 'fulfilled' && availRes.value?.data) {
        const aData = availRes.value.data;
        let list: any[] = [];
        if (Array.isArray(aData.classes)) {
          list = aData.classes;
        } else if (Array.isArray(aData)) {
          list = aData;
        }
        setAvailableClasses(list);
        setPlafonData({
          plafon_sks: aData.plafon_sks ?? 24,
          total_sks_diambil: aData.total_sks_diambil ?? 0,
          sisa_sks: aData.sisa_sks ?? (aData.plafon_sks ?? 24) - (aData.total_sks_diambil ?? 0),
          ips_sebelumnya: aData.ips_sebelumnya ?? 0,
        });
      }
    } catch {
      toast.error('Gagal memuat rencana studi KRS');
    } finally {
      setLoading(false);
    }
  }, [searchKelas, filterHari, filterSemester, filterSortBy, filterSortOrder]);

  useEffect(() => {
    loadKrsData();
  }, [loadKrsData]);

  // Handle Tambah Kelas ke KRS
  const handleAddClass = async (kelasId: number) => {
    try {
      setSubmitting(true);
      const res = await siakadService.addClassToKrs({ kelas_id: kelasId });
      toast.success(res?.message || 'Mata kuliah berhasil ditambahkan ke KRS');
      await loadKrsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menambahkan mata kuliah');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Drop Kelas dari KRS
  const handleDropClass = async () => {
    if (!dropTargetId) return;
    try {
      setSubmitting(true);
      const res = await siakadService.dropClassFromKrs(dropTargetId);
      toast.success(res?.message || 'Mata kuliah berhasil dibatalkan dari KRS');
      setDropTargetId(null);
      await loadKrsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal membatalkan mata kuliah');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Ambil Paket Semester
  const handleAmbilPaket = async () => {
    try {
      setSubmitting(true);
      const res = await siakadService.ambilPaketKrs();
      toast.success(res?.message || 'Paket semester berhasil diambil');
      setConfirmAmbilPaketOpen(false);
      await loadKrsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengambil paket KRS');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Submit KRS ke DPA / Auto-approve
  const onSubmitKrs = async (values: KrsSubmitFormValues) => {
    try {
      setSubmitting(true);
      const res = await siakadService.submitKrs({
        catatan_mahasiswa: values.catatan_mahasiswa || undefined,
      } as any);
      toast.success(res?.message || 'KRS berhasil diajukan');
      setConfirmSubmitOpen(false);
      resetSubmitKrs();
      await loadKrsData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal mengajukan KRS');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilter = () => {
    setSearchKelas('');
    setFilterHari('ALL');
    setFilterSemester('ALL');
    setFilterSortBy('nama');
    setFilterSortOrder('asc');
    setClassPage(1);
  };

  const statusKrs = activeKrs?.status || 'draft';
  const isLocked = statusKrs === 'disetujui' || statusKrs === 'dikunci';
  const krsDetails: any[] = activeKrs?.details || activeKrs?.krs_details || [];

  // Filter & sort classes
  const filteredClasses = useMemo(() => {
    let result = [...availableClasses];
    if (searchKelas.trim()) {
      const q = searchKelas.toLowerCase();
      result = result.filter(
        (c) =>
          c.nama_kelas?.toLowerCase().includes(q) ||
          c.kode_kelas?.toLowerCase().includes(q) ||
          c.mata_kuliah?.nama?.toLowerCase().includes(q) ||
          c.dosen_pengampu?.toLowerCase().includes(q)
      );
    }
    if (filterHari !== 'ALL') {
      result = result.filter((c) => String(c.hari).toLowerCase() === filterHari.toLowerCase());
    }
    if (filterSemester !== 'ALL') {
      result = result.filter((c) => String(c.semester || c.mata_kuliah?.semester) === filterSemester);
    }

    // Sort default by name
    result.sort((a, b) => {
      const nameA = String(a.nama_kelas || a.mata_kuliah?.nama || '');
      const nameB = String(b.nama_kelas || b.mata_kuliah?.nama || '');
      if (filterSortBy === 'sks') {
        return filterSortOrder === 'asc' ? (a.sks || 0) - (b.sks || 0) : (b.sks || 0) - (a.sks || 0);
      }
      return filterSortOrder === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

    return result;
  }, [availableClasses, searchKelas, filterHari, filterSemester, filterSortBy, filterSortOrder]);

  // Katalog kelas difilter dan diurutkan di klien, jadi halaman juga dipotong di klien.
  const classLastPage = Math.max(1, Math.ceil(filteredClasses.length / classLimit));
  const activeClassPage = Math.min(classPage, classLastPage);
  const pagedClasses = filteredClasses.slice((activeClassPage - 1) * classLimit, activeClassPage * classLimit);
  const classMeta: PaginationMeta = {
    current_page: activeClassPage,
    last_page: classLastPage,
    per_page: classLimit,
    total: filteredClasses.length,
    from: filteredClasses.length === 0 ? 0 : (activeClassPage - 1) * classLimit + 1,
    to: Math.min(activeClassPage * classLimit, filteredClasses.length),
  };

  const krsColumns: ColumnDef<any>[] = [
    {
      key: 'mata_kuliah',
      label: 'MATA KULIAH / KELAS',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">
            {row.kelas?.mata_kuliah?.nama || row.nama_mata_kuliah || row.kelas?.nama_kelas || '-'}
          </span>
          <span className="font-mono text-2xs text-slate-500">
            {row.kelas?.kode_kelas || row.kode_mk || '-'} • {row.kelas?.dosen_pengampu || row.dosen || 'Dosen Pengampu'}
          </span>
        </div>
      ),
    },
    {
      key: 'jadwal',
      label: 'JADWAL & RUANG',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {row.kelas?.hari ? `${String(row.kelas.hari).toUpperCase()}, ${row.kelas.jam_mulai || ''} - ${row.kelas.jam_selesai || ''}` : '-'}
          {row.kelas?.ruangan ? ` (${row.kelas.ruangan})` : ''}
        </span>
      ),
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-bold text-xs">
          {row.sks || row.kelas?.mata_kuliah?.sks || row.kelas?.sks || 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'STATUS',
      align: 'center',
      render: (row) => (
        <Badge
          variant={row.status === 'disetujui' ? 'green' : row.status === 'ditolak' ? 'red' : 'amber'}
          className="text-2xs font-semibold"
        >
          {row.status || 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        if (isLocked) {
          return (
            <span className="text-2xs text-slate-400 italic flex items-center justify-end gap-1">
              <Lock size={12} /> Terkunci
            </span>
          );
        }
        return (
          <DropdownMenu
            items={[
              {
                label: 'Batalkan Kelas',
                icon: <Trash2 size={14} />,
                variant: 'danger',
                onClick: () => setDropTargetId(row.id),
              },
            ]}
          />
        );
      },
    },
  ];

  const availableColumns: ColumnDef<any>[] = [
    {
      key: 'kelas',
      label: 'KELAS & MATA KULIAH',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">
            {row.nama_kelas || row.mata_kuliah?.nama || '-'}
          </span>
          <span className="font-mono text-2xs text-slate-500">
            {row.kode_kelas} • {row.dosen_pengampu || 'Dosen Tim'}
          </span>
        </div>
      ),
    },
    {
      key: 'sks',
      label: 'SKS',
      align: 'center',
      render: (row) => <span className="font-mono font-bold text-xs">{row.sks || 0}</span>,
    },
    {
      key: 'jadwal',
      label: 'HARI & JAM',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium capitalize">{row.hari || '-'}</span>
          <span className="text-2xs text-slate-500 block font-mono">
            {row.jam_mulai} - {row.jam_selesai} • {row.ruangan || 'TBA'}
          </span>
        </div>
      ),
    },
    {
      key: 'kuota',
      label: 'KUOTA',
      align: 'center',
      render: (row) => {
        const terisi = row.terisi ?? 0;
        const kapasitas = row.kapasitas ?? 40;
        const isPenuh = terisi >= kapasitas;
        return (
          <span className={`text-2xs font-mono font-semibold ${isPenuh ? 'text-rose-600' : 'text-slate-700'}`}>
            {terisi}/{kapasitas} {isPenuh ? '(Penuh)' : ''}
          </span>
        );
      },
    },
    {
      key: 'aksi',
      label: 'AKSI',
      align: 'right',
      render: (row) => {
        const isBentrok = row.is_bentrok;
        const isPenuh = (row.terisi ?? 0) >= (row.kapasitas ?? 40);
        const disabled = isLocked || isPenuh || isBentrok || plafonData.sisa_sks < (row.sks || 0);

        return (
          <DropdownMenu
            items={[
              {
                label: 'Ambil Mata Kuliah',
                icon: <PlusCircle size={14} />,
                disabled: disabled || submitting,
                onClick: () => handleAddClass(row.id),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Rencana Studi (KRS) Mandiri"
        description="Portal pengisian dan pemilihan mata kuliah mandiri mahasiswa berbasis plafon SKS dan persetujuan Dosen PA."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'KRS Mandiri' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilterDrawer(true)}
              className="text-xs font-bold border-[var(--module-primary)] text-[var(--module-primary)] hover:bg-[var(--module-primary-subtle)]"
            >
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setConfirmAmbilPaketOpen(true)}
              disabled={isLocked || loading || submitting}
              className="text-xs font-bold"
            >
              Ambil Paket
            </Button>
          </div>
        }
      />

      {/* Ringkasan Plafon & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4" style={{ borderLeftColor: 'var(--module-primary)' }}>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Status KRS</p>
              <div className="mt-1 flex items-center gap-1.5">
                {statusKrs === 'disetujui' ? (
                  <Badge variant="green" className="text-2xs font-bold">Disetujui</Badge>
                ) : statusKrs === 'diajukan' ? (
                  <Badge variant="amber" className="text-2xs font-bold">Menunggu DPA</Badge>
                ) : (
                  <Badge variant="gray" className="text-2xs font-bold">Draft / Belum Diajukan</Badge>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700">
              {statusKrs === 'disetujui' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Plafon SKS Maksimal</p>
              <p className="text-base font-black text-slate-900 mt-1 font-mono">
                {plafonData.plafon_sks} <span className="text-2xs font-normal text-slate-500">SKS</span>
              </p>
              <span className="text-2xs text-slate-400">IPS Lalu: {Number(plafonData.ips_sebelumnya || 0).toFixed(2)}</span>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700">
              <GraduationCap size={18} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">SKS Terpilih</p>
              <p className="text-base font-black text-slate-900 mt-1 font-mono">
                {plafonData.total_sks_diambil} <span className="text-2xs font-normal text-slate-500">SKS</span>
              </p>
              <span className="text-2xs text-slate-400">{krsDetails.length} Mata Kuliah</span>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700">
              <BookOpen size={18} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex items-center justify-between">
            <div>
              <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">Sisa Kuota SKS</p>
              <p className={`text-base font-black mt-1 font-mono ${plafonData.sisa_sks <= 0 ? 'text-rose-600' : 'text-[var(--module-primary)]'}`}>
                {plafonData.sisa_sks} <span className="text-2xs font-normal text-slate-500">SKS</span>
              </p>
              <span className="text-2xs text-slate-400">Dapat diambil</span>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700">
              <Layers size={18} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bagian 1: Daftar Rencana Studi Mahasiswa (KRS Saat Ini) */}
      <Card>
        <CardHeader className="p-4 flex flex-row items-center justify-between border-b border-slate-200">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Mata Kuliah Terpilih Dalam KRS
            </h2>
            <p className="text-2xs text-slate-500">
              Daftar mata kuliah yang saat ini tercatat pada rencana studi semester aktif Anda.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocked ? (
              <Badge variant="blue" className="text-2xs font-bold flex items-center gap-1">
                <Lock size={12} /> KRS Telah Disetujui DPA
              </Badge>
            ) : (
              krsDetails.length > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Send size={13} />}
                  onClick={() => setConfirmSubmitOpen(true)}
                  disabled={loading || submitting}
                  className="text-2xs font-bold"
                >
                  Ajukan ke DPA
                </Button>
              )
            )}
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={krsColumns}
            data={krsDetails}
            isLoading={loading}
            emptyMessage="Belum ada mata kuliah yang dipilih. Silakan ambil paket atau pilih dari daftar kelas di bawah."
          />
        </CardBody>
      </Card>

      {/* Bagian 2: Katalog Kelas Tersedia untuk Dipilih */}
      {!isLocked && (
        <Card>
          <CardHeader className="p-4 border-b border-slate-200">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Pilih Kelas & Mata Kuliah Mandiri
              </h2>
              <p className="text-2xs text-slate-500">
                Pilih kelas pilihan atau MK reguler yang memenuhi prasyarat dan kuota.
              </p>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <DataTable
              columns={availableColumns}
              data={pagedClasses}
              meta={classMeta}
              onPageChange={(p) => setClassPage(p)}
              onLimitChange={(l) => {
                setClassLimit(l);
                setClassPage(1);
              }}
              isLoading={loading}
              emptyMessage="Tidak ada kelas tersedia yang sesuai filter atau kuota telah habis."
            />
          </CardBody>
        </Card>
      )}

      {/* Filter Drawer */}
      <Drawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        title="Filter & Pencarian Kelas KRS"
        footer={
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilter}
              className="text-xs"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowFilterDrawer(false)}
              className="text-xs font-bold"
            >
              Terapkan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Pencarian Kelas / Dosen"
            placeholder="Cari mata kuliah/dosen..."
            value={searchKelas}
            onChange={(e) => setSearchKelas(e.target.value)}
          />

          <Select
            label="Hari Kuliah"
            options={HARI_KULIAH_OPTIONS}
            value={filterHari}
            onChange={(v) => setFilterHari(String(v || 'ALL'))}
          />

          <Select
            label="Semester Paket"
            options={SEMESTER_OPTIONS}
            value={filterSemester}
            onChange={(v) => setFilterSemester(String(v || 'ALL'))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Urutkan"
              options={KRS_SORT_BY_OPTIONS}
              value={filterSortBy}
              onChange={(v) => setFilterSortBy(String(v || 'nama'))}
            />
            <Select
              label="Arah"
              options={SORT_DIRECTION_OPTIONS}
              value={filterSortOrder}
              onChange={(v) => setFilterSortOrder(String(v || 'asc'))}
            />
          </div>
        </div>
      </Drawer>

      {/* Confirm Drop Class */}
      <ConfirmDialog
        isOpen={dropTargetId !== null}
        onClose={() => setDropTargetId(null)}
        onConfirm={handleDropClass}
        title="Batalkan Pengambilan Kelas?"
        message="Mata kuliah ini akan dihapus dari rencana studi Anda. Anda dapat mengambilnya kembali selama kuota masih tersedia."
        confirmText="Ya, Batalkan"
        cancelText="Kembali"
        variant="danger"
        isLoading={submitting}
      />

      {/* Confirm Ambil Paket */}
      <ConfirmDialog
        isOpen={confirmAmbilPaketOpen}
        onClose={() => setConfirmAmbilPaketOpen(false)}
        onConfirm={handleAmbilPaket}
        title="Ambil Paket Semester Otomatis?"
        message="Sistem akan otomatis memasukkan semua mata kuliah wajib sesuai kurikulum rombel semester berjalan Anda."
        confirmText="Ambil Paket"
        cancelText="Batal"
        variant="primary"
        isLoading={submitting}
      />

      {/* Modal Ajukan KRS ke Dosen PA */}
      <Modal
        isOpen={confirmSubmitOpen}
        onClose={() => setConfirmSubmitOpen(false)}
        title="Ajukan KRS ke Dosen Pembimbing Akademik"
        size="md"
      >
        <form onSubmit={handleSubKrs(onSubmitKrs)} className="space-y-4">
          <p className="text-xs text-slate-600">
            Total <strong>{plafonData.total_sks_diambil} SKS</strong> akan diajukan ke Dosen Pembimbing Akademik.
            Pastikan jadwal tidak bentrok dan tidak ada tagihan keuangan yang menunggak.
          </p>
          <Input
            label="Catatan Pengajuan (Opsional)"
            placeholder="Misal: Mohon persetujuan penambahan 1 MK pilihan..."
            {...regSubmitKrs('catatan_mahasiswa')}
            error={errorsSubmitKrs.catatan_mahasiswa?.message}
          />
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmSubmitOpen(false)}
              className="text-xs"
            >
              Periksa Kembali
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={submitting}
              className="text-xs font-bold"
            >
              Ajukan Sekarang
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// Satu alamat, dua tampilan: pengelola (BAAK/admin) melihat daftar KRS seluruh
// mahasiswa; mahasiswa memakai portal pengisian KRS mandiri di atas.
export default function KrsPage() {
  const { is_loading, isSuperAdmin, hasPermission, hasRole } = useAuth();

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[var(--module-primary)]" size={28} />
      </div>
    );
  }

  // Pembeda pengelola adalah hak persetujuan KRS, bukan hak baca: mahasiswa juga
  // memegang `siakad.krs.read` untuk melihat KRS miliknya sendiri.
  const isPengelola = isSuperAdmin || hasPermission('siakad.krs.approve');
  if (isPengelola) return <KrsAdminList />;

  if (hasRole('mahasiswa')) return <KrsMandiriPortal />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kartu Rencana Studi (KRS)"
        breadcrumbs={[{ label: 'SIAKAD', href: '/siakad' }, { label: 'KRS' }]}
      />
      <Card>
        <CardBody className="p-6 text-center text-xs text-slate-500">
          Halaman ini hanya untuk mahasiswa (pengisian KRS) dan pengelola akademik (daftar KRS).
        </CardBody>
      </Card>
    </div>
  );
}
