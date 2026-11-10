'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { Plus, Save, CheckCheck, CalendarCheck, Filter } from 'lucide-react';
import { z } from 'zod';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Drawer } from '@/components/ui/Drawer';
import { siakadService } from '@/services/siakad.service';
import { SIAKAD_OPTION_TYPES, useSiakadOptions } from '@/lib/siakad-options';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

interface PageProps {
  params: Promise<{ id: string }>;
}

const pertemuanSchema = z.object({
  pertemuan_ke: z
    .number()
    .min(1, 'Pertemuan minimal 1')
    .max(16, 'Pertemuan maksimal 16'),
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  materi: z.string().min(1, 'Materi pembahasan wajib diisi'),
  jam_mulai: z.string().optional(),
  jam_selesai: z.string().optional(),
});

type PertemuanFormData = z.infer<typeof pertemuanSchema>;

const absensiItemSchema = z.object({
  id: z.number().optional(),
  mahasiswa_id: z.number(),
  status: z.string().min(1, 'Status kehadiran wajib dipilih'),
  catatan: z.string().max(255, 'Catatan maksimal 255 karakter').optional(),
  mahasiswa: z.any().optional(),
});

const absensiListSchema = z.object({
  absensi: z.array(absensiItemSchema),
});

type AbsensiListFormData = z.infer<typeof absensiListSchema>;

export default function InputAbsensiKelasPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const kelasId = Number(resolvedParams.id);
  const { isMahasiswa } = useAuth();

  const statusAbsensiOptions = useSiakadOptions(SIAKAD_OPTION_TYPES.STATUS_ABSENSI);

  const [kelas, setKelas] = useState<any | null>(null);
  const [pertemuans, setPertemuans] = useState<any[]>([]);
  const [activePertemuan, setActivePertemuan] = useState<any | null>(null);
  const [loadingPertemuan, setLoadingPertemuan] = useState(true);
  const [loadingAbsen, setLoadingAbsen] = useState(false);
  const [isNewPertemuanOpen, setIsNewPertemuanOpen] = useState(false);
  const [savingAbsen, setSavingAbsen] = useState(false);
  const [showAttendanceFilter, setShowAttendanceFilter] = useState(false);
  const [attendanceSearchDraft, setAttendanceSearchDraft] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({
    current_page: 1,
    last_page: 1,
    per_page: 25,
    total: 0,
    from: 0,
    to: 0,
  });

  const {
    register: registerPertemuan,
    handleSubmit: handlePertemuanSubmit,
    reset: resetPertemuanForm,
    setValue: setPertemuanValue,
    formState: { errors: pertemuanErrors },
  } = useForm<PertemuanFormData>({
    resolver: zodResolver(pertemuanSchema),
    defaultValues: {
      pertemuan_ke: 1,
      tanggal: new Date().toISOString().slice(0, 10),
      materi: '',
      jam_mulai: '08:00',
      jam_selesai: '10:30',
    },
  });

  const {
    register: registerAbsensi,
    control: absensiControl,
    handleSubmit: handleAbsensiSubmit,
    reset: resetAbsensiForm,
    setValue: setAbsensiValue,
    formState: { errors: absensiErrors, isSubmitting: isSubmittingAbsensi },
  } = useForm<AbsensiListFormData>({
    resolver: zodResolver(absensiListSchema),
    defaultValues: { absensi: [] },
  });

  const { fields: attendanceFields } = useFieldArray({
    control: absensiControl,
    name: 'absensi',
  });

  const fetchKelas = useCallback(async () => {
    try {
      const res = await siakadService.getKelasDetail(kelasId);
      if (res.data) {
        setKelas(res.data);
        if (res.data.jam_mulai) {
          setPertemuanValue('jam_mulai', String(res.data.jam_mulai).slice(0, 5));
        }
        if (res.data.jam_selesai) {
          setPertemuanValue('jam_selesai', String(res.data.jam_selesai).slice(0, 5));
        }
      }
    } catch {
      toast.error('Gagal memuat data kelas');
    }
  }, [kelasId, setPertemuanValue]);

  const fetchPertemuans = useCallback(async () => {
    try {
      setLoadingPertemuan(true);
      const res = await siakadService.getPertemuans(kelasId);
      if (res.data) setPertemuans(res.data);
    } catch {
      toast.error('Gagal memuat daftar pertemuan');
    } finally {
      setLoadingPertemuan(false);
    }
  }, [kelasId]);

  useEffect(() => {
    fetchKelas();
    fetchPertemuans();
  }, [fetchKelas, fetchPertemuans]);

  const fetchAttendanceList = useCallback(
    async (pertemuanId: number, targetPage: number = 1, searchQuery: string = '') => {
      try {
        setLoadingAbsen(true);
        const res = await siakadService.getAbsensiList(pertemuanId, {
          page: targetPage,
          per_page: 25,
          search: searchQuery,
        });
        if (res.data && res.data.absensi) {
          const list = res.data.absensi.map((it: any) => ({
            id: it.id,
            mahasiswa_id: it.mahasiswa_id,
            status: it.status || '',
            catatan: it.catatan || '',
            mahasiswa: it.mahasiswa,
          }));
          resetAbsensiForm({ absensi: list });
          const total = res.meta?.total ?? list.length;
          setMeta(
            res.meta || {
              current_page: targetPage,
              last_page: Math.ceil(total / 25) || 1,
              per_page: 25,
              total: total,
              from: total > 0 ? (targetPage - 1) * 25 + 1 : 0,
              to: Math.min(targetPage * 25, total),
            }
          );
        } else {
          resetAbsensiForm({ absensi: [] });
          setMeta({ current_page: 1, last_page: 1, per_page: 25, total: 0, from: 0, to: 0 });
        }
      } catch {
        toast.error('Gagal memuat data kehadiran mahasiswa');
      } finally {
        setLoadingAbsen(false);
      }
    },
    [resetAbsensiForm]
  );

  const handleViewAttendanceDetails = async (p: any) => {
    setActivePertemuan(p);
    setPage(1);
    setAttendanceSearch('');
    setAttendanceSearchDraft('');
    await fetchAttendanceList(p.id, 1, '');
  };

  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    if (activePertemuan) {
      await fetchAttendanceList(activePertemuan.id, newPage, attendanceSearch);
    }
  };

  const applyAttendanceFilter = () => {
    const search = attendanceSearchDraft.trim();
    setAttendanceSearch(search);
    setPage(1);
    if (activePertemuan) {
      void fetchAttendanceList(activePertemuan.id, 1, search);
    }
    setShowAttendanceFilter(false);
  };

  const resetAttendanceFilter = () => {
    setAttendanceSearch('');
    setAttendanceSearchDraft('');
    setPage(1);
    if (activePertemuan) {
      void fetchAttendanceList(activePertemuan.id, 1, '');
    }
    setShowAttendanceFilter(false);
  };

  const onSavePertemuan = async (data: PertemuanFormData) => {
    try {
      setSavingAbsen(true);
      await siakadService.createPertemuan(kelasId, data);
      toast.success('Pertemuan baru berhasil dibuat.');
      setIsNewPertemuanOpen(false);
      fetchPertemuans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuat pertemuan. Pastikan RPS disetujui.');
    } finally {
      setSavingAbsen(false);
    }
  };

  const handleTandaiSemuaHadir = () => {
    const hadirValue = statusAbsensiOptions.find((o: any) => o.value === 'hadir')?.value || 'hadir';
    attendanceFields.forEach((_, idx) => {
      setAbsensiValue(`absensi.${idx}.status`, hadirValue);
    });
  };

  const onSaveAttendance = async (data: AbsensiListFormData) => {
    if (!activePertemuan) return;
    try {
      setSavingAbsen(true);
      const payload = data.absensi.map((item) => ({
        mahasiswa_id: item.mahasiswa_id,
        status: item.status,
        catatan: item.catatan || '',
      }));
      await siakadService.saveAbsensi(activePertemuan.id, { absensi: payload });
      toast.success('Presensi mahasiswa berhasil disimpan.');
      fetchPertemuans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan absensi');
    } finally {
      setSavingAbsen(false);
    }
  };

  const absensiColumns: ColumnDef<any>[] = [
    {
      key: 'mahasiswa',
      label: 'MAHASISWA',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{row.mahasiswa?.nama_lengkap}</span>
          <span className="font-mono text-2xs text-slate-400">NIM: {row.mahasiswa?.nim}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'STATUS KEHADIRAN',
      align: 'center',
      render: (_, index) => (
        <div className="w-40 mx-auto">
          <Controller
            control={absensiControl}
            name={`absensi.${index}.status`}
            render={({ field }) => (
              <Select
                options={statusAbsensiOptions}
                value={field.value}
                onChange={(val) => field.onChange(String(val))}
                error={absensiErrors.absensi?.[index]?.status?.message}
                className="text-xs"
              />
            )}
          />
        </div>
      ),
    },
    {
      key: 'catatan',
      label: 'CATATAN',
      render: (row, index) => (
        <Input
          aria-label={`Catatan ${row.mahasiswa?.nama_lengkap || ''}`}
          placeholder="..."
          error={absensiErrors.absensi?.[index]?.catatan?.message}
          {...registerAbsensi(`absensi.${index}.catatan`)}
        />
      ),
    },
  ];

  if (isMahasiswa) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Input Absensi"
          description="Halaman ini khusus dosen pengampu dan administrator."
          breadcrumbs={[
            { label: 'Portal SSO', href: '/dashboard' },
            { label: 'SIAKAD', href: '/siakad' },
            { label: 'Jadwal Perkuliahan', href: '/siakad/perkuliahan/kelas' },
            { label: 'Input Absensi' },
          ]}
        />
        <div className="card p-6 text-center text-sm text-slate-500">
          Presensi Anda dapat dilihat di halaman LMS masing-masing kelas.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Input Absensi — ${kelas?.nama_kelas || 'Kelas'}`}
        description={`${kelas?.mata_kuliah?.nama || ''} • ${kelas?.hari || ''} ${kelas?.jam_mulai ? String(kelas.jam_mulai).slice(0, 5) : ''}-${kelas?.jam_selesai ? String(kelas.jam_selesai).slice(0, 5) : ''} • Pilih pertemuan di kiri. Status kosong berarti belum diisi.`}
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIAKAD', href: '/siakad' },
          { label: 'Jadwal Perkuliahan', href: '/siakad/perkuliahan/kelas' },
          { label: 'Input Absensi' },
        ]}
        action={
          <Button
            variant="outline"
            icon={<Filter size={16} />}
            onClick={() => setShowAttendanceFilter(true)}
          >
            Filter
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Kolom Kiri: Daftar Pertemuan 1-16 */}
        <div className="card p-4 md:p-6 space-y-4 h-fit lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs uppercase text-slate-500">Pertemuan 1-16</span>
            <Button
              variant="primary"
              size="sm"
              className="text-2xs font-bold"
              icon={<Plus size={16} />}
              onClick={() => {
                resetPertemuanForm({
                  pertemuan_ke: pertemuans.length + 1,
                  tanggal: new Date().toISOString().slice(0, 10),
                  materi: '',
                  jam_mulai: kelas?.jam_mulai ? String(kelas.jam_mulai).slice(0, 5) : '08:00',
                  jam_selesai: kelas?.jam_selesai ? String(kelas.jam_selesai).slice(0, 5) : '10:30',
                });
                setIsNewPertemuanOpen(true);
              }}
            >
              Tambah
            </Button>
          </div>

          {isNewPertemuanOpen && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Pertemuan Ke"
                  type="number"
                  required
                  min={1}
                  max={16}
                  error={pertemuanErrors.pertemuan_ke?.message}
                  {...registerPertemuan('pertemuan_ke', { valueAsNumber: true })}
                />
                <Input
                  label="Tanggal"
                  type="date"
                  required
                  error={pertemuanErrors.tanggal?.message}
                  {...registerPertemuan('tanggal')}
                />
              </div>
              <Input
                label="Materi Pembahasan"
                required
                placeholder="Contoh: Pengenalan OOP, Analisis Kebutuhan"
                error={pertemuanErrors.materi?.message}
                {...registerPertemuan('materi')}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" className="text-2xs" onClick={() => setIsNewPertemuanOpen(false)}>
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="text-2xs font-bold"
                  icon={<Save size={16} />}
                  onClick={handlePertemuanSubmit(onSavePertemuan)}
                  loading={savingAbsen}
                  disabled={savingAbsen}
                >
                  Simpan
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {loadingPertemuan ? (
              <p className="text-2xs text-slate-400 italic">Memuat pertemuan...</p>
            ) : pertemuans.length === 0 ? (
              <p className="text-2xs text-slate-400 italic">Belum ada pertemuan kelas.</p>
            ) : (
              pertemuans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleViewAttendanceDetails(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition space-y-1 ${
                    activePertemuan?.id === p.id ? 'bg-primary-50 border-primary-300 font-bold' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-900 font-black">Pertemuan {p.pertemuan_ke}</span>
                    <span className="text-2xs font-mono text-slate-400">{p.tanggal}</span>
                  </div>
                  <p className="text-2xs text-slate-600 font-medium truncate">{p.materi || 'Tidak ada materi'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Kolom Kanan: Pengisian Absen Mahasiswa */}
        <div className="lg:col-span-2 space-y-4">
          {!activePertemuan ? (
            <div className="flex flex-col items-center justify-center gap-2 border border-dashed rounded-2xl bg-slate-50 text-slate-400 p-6">
              <CalendarCheck size={36} className="text-slate-300" />
              <p className="text-xs font-bold">Pilih Pertemuan di sebelah kiri</p>
              <p className="text-2xs text-slate-400">Untuk menginput atau merekap presensi mahasiswa.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">
                    Daftar Kehadiran: Pertemuan {activePertemuan.pertemuan_ke}
                  </h4>
                  <p className="text-2xs text-slate-500 font-medium">Materi: {activePertemuan.materi}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button type="button" variant="outline" size="sm" className="text-2xs font-bold" icon={<CheckCheck size={16} />} onClick={handleTandaiSemuaHadir}>
                    Tandai Semua Hadir
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="text-2xs font-bold"
                    icon={<Save size={16} />}
                    onClick={handleAbsensiSubmit(onSaveAttendance)}
                    loading={savingAbsen || isSubmittingAbsensi}
                    disabled={savingAbsen || isSubmittingAbsensi}
                  >
                    Simpan Presensi
                  </Button>
                </div>
              </div>

              <DataTable
                columns={absensiColumns}
                data={attendanceFields}
                meta={meta}
                onPageChange={handlePageChange}
                isLoading={loadingAbsen}
                emptyMessage={attendanceSearch ? 'Tidak ada mahasiswa yang sesuai pencarian.' : 'Tidak ada mahasiswa terdaftar di kelas ini.'}
              />
            </>
          )}
        </div>
      </div>

      <Drawer
        open={showAttendanceFilter}
        onClose={() => setShowAttendanceFilter(false)}
        title="Cari Mahasiswa"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={resetAttendanceFilter}>Reset</Button>
            <Button onClick={applyAttendanceFilter}>Terapkan</Button>
          </div>
        }
      >
        <Input
          label="Nama atau NIM"
          placeholder="Cari nama atau NIM mahasiswa"
          value={attendanceSearchDraft}
          onChange={(event) => setAttendanceSearchDraft(event.target.value)}
        />
      </Drawer>
    </div>
  );
}
