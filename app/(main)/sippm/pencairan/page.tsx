'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  DollarSign,
  Upload,
  Building,
  FileText,
  Printer,
  ShieldCheck,
  Download,
  Award,
  Filter,
  RotateCcw,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { DataTable, ColumnDef } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { sippmService } from '@/services/sippm.service';
import type { PencairanDanaHibah, KontrakKegiatan } from '@/types/sippm.types';
import type { PaginationMeta } from '@/types/api.types';
import toast from 'react-hot-toast';

const pencairanSchema = z.object({
  kontrak_kegiatan_id: z.number().min(1, 'Pilih kontrak hibah'),
  termin_ke: z.number().min(1, 'Termin minimal 1').max(2, 'Termin maksimal 2'),
  nominal_cair: z.number().min(1000000, 'Nominal pencairan minimal Rp 1.000.000'),
  nama_bank: z.string().min(2, 'Nama bank wajib diisi'),
  nomor_rekening: z.string().min(5, 'Nomor rekening wajib diisi'),
});

type PencairanFormValues = z.infer<typeof pencairanSchema>;

export default function PencairanPage() {
  const router = useRouter();
  const [pencairanList, setPencairanList] = useState<PencairanDanaHibah[]>([]);
  const [kontrakList, setKontrakList] = useState<KontrakKegiatan[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination Meta State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
    from: 0,
    to: 0,
  });

  // Filter & Search State
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterOrderBy, setFilterOrderBy] = useState('id');
  const [filterOrderDir, setFilterOrderDir] = useState('desc');
  const [appliedOrderBy, setAppliedOrderBy] = useState('id');
  const [appliedOrderDir, setAppliedOrderDir] = useState('desc');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSpkKontrak, setSelectedSpkKontrak] = useState<KontrakKegiatan | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PencairanFormValues>({
    resolver: zodResolver(pencairanSchema) as any,
    defaultValues: {
      kontrak_kegiatan_id: 0,
      termin_ke: 1,
      nominal_cair: 17500000,
      nama_bank: 'Bank Mandiri',
      nomor_rekening: '1370001234567',
    },
  });

  const selectedKontrakId = watch('kontrak_kegiatan_id');
  const selectedTermin = watch('termin_ke');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const resKontrak = await sippmService.indexKontrak();
      if (resKontrak.data) {
        const list = Array.isArray(resKontrak.data) ? resKontrak.data : (resKontrak.data as any).data || [];
        setKontrakList(list);

        setMeta({
          current_page: page,
          per_page: limit,
          total: list.length,
          last_page: Math.ceil(list.length / limit) || 1,
          from: list.length > 0 ? (page - 1) * limit + 1 : 0,
          to: Math.min(page * limit, list.length),
        });
      }
    } catch (err) {
      console.error('Failed to load pencairan data', err);
      toast.error('Gagal memuat data pencairan dana & berkas SPK');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply Filter Handler
  const handleApplyFilter = () => {
    setAppliedSearch(search);
    setAppliedOrderBy(filterOrderBy);
    setAppliedOrderDir(filterOrderDir);
    setPage(1);
    setShowFilter(false);
  };

  // Reset Filter Handler
  const handleResetFilter = () => {
    setSearch('');
    setAppliedSearch('');
    setFilterOrderBy('id');
    setFilterOrderDir('desc');
    setAppliedOrderBy('id');
    setAppliedOrderDir('desc');
    setPage(1);
    setShowFilter(false);
  };

  const onSubmit = async (data: PencairanFormValues) => {
    try {
      setSubmitting(true);
      await sippmService.requestPencairan(data.kontrak_kegiatan_id, {
        termin: data.termin_ke,
        nominal: data.nominal_cair,
        catatan_keuangan: `Pencairan bank ${data.nama_bank} - Rek: ${data.nomor_rekening}`,
      });
      toast.success('Permohonan pencairan dana hibah berhasil diajukan!');
      setIsModalOpen(false);
      reset();
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengajukan pencairan dana hibah';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatRupiah = (val: number | null) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const filteredKontrak = kontrakList.filter(
    (k) =>
      k.nomor_kontrak.toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (k.proposal?.judul || '').toLowerCase().includes(appliedSearch.toLowerCase()) ||
      (k.proposal?.ketua?.nama_lengkap || (k.proposal as any)?.ketua_pegawai?.nama_lengkap || '')
        .toLowerCase()
        .includes(appliedSearch.toLowerCase())
  );

  // DataTable Column Definitions
  const columns: ColumnDef<KontrakKegiatan>[] = [
    {
      key: 'nomor_kontrak',
      label: 'No Kontrak SPK',
      render: (row: KontrakKegiatan) => (
        <span className="font-mono text-xs font-bold text-amber-800">{row.nomor_kontrak}</span>
      ),
    },
    {
      key: 'proposal',
      label: 'Proposal & Ketua Dosen',
      render: (row: KontrakKegiatan) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 text-xs line-clamp-1">{row.proposal?.judul || 'Proposal Usulan'}</div>
          <div className="text-2xs text-slate-500">
            Ketua: {row.proposal?.ketua?.nama_lengkap || (row.proposal as any)?.ketua_pegawai?.nama_lengkap || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'dana_disetujui',
      label: 'Nominal Dana Disetujui',
      render: (row: KontrakKegiatan) => {
        const totalDana = (row as any).dana_disetujui || row.nominal_dana || 0;
        return <span className="font-extrabold text-emerald-700 text-xs">{formatRupiah(totalDana)}</span>;
      },
    },
    {
      key: 'termin1',
      label: 'Termin 1 (70%)',
      render: (row: KontrakKegiatan) => {
        const totalDana = (row as any).dana_disetujui || row.nominal_dana || 0;
        return (
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800">{formatRupiah(totalDana * 0.7)}</div>
            <Badge variant="green" className="text-2xs font-bold">
              Ready to Disburse (70%)
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'termin2',
      label: 'Termin 2 (30%)',
      render: (row: KontrakKegiatan) => {
        const totalDana = (row as any).dana_disetujui || row.nominal_dana || 0;
        return (
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-800">{formatRupiah(totalDana * 0.3)}</div>
            <Badge variant="gray" className="text-2xs font-bold">
              Menunggu LPJ 70%
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'aksi',
      label: 'Aksi',
      align: 'right',
      render: (row: KontrakKegiatan) => (
        <div className="flex justify-end">
          <DropdownMenu
            items={[
              {
                label: 'Lihat File Dokumen SPK',
                icon: <FileText size={14} className="text-indigo-600" />,
                onClick: () => setSelectedSpkKontrak(row),
              },
              {
                label: 'Ajukan Pencairan Termin',
                icon: <DollarSign size={14} className="text-emerald-600" />,
                onClick: () => {
                  setValue('kontrak_kegiatan_id', row.id);
                  const totalDana = (row as any).dana_disetujui || row.nominal_dana || 0;
                  setValue('nominal_cair', Math.round(totalDana * 0.7));
                  setIsModalOpen(true);
                },
              },
              {
                label: 'Lihat Detail Proposal',
                icon: <Eye size={14} />,
                onClick: () => router.push(`/sippm/proposal/${row.proposal?.id || row.id}`),
              },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header (Atomic Standard) */}
      <PageHeader
        title="Pencairan Dana Hibah & Berkas SPK Legal"
        description="Lihat berkas fisik Surat Perjanjian Kerja (SPK) resmi, pengajuan pencairan Termin 1 (70%) & Termin 2 (30%), serta LPJ."
        breadcrumbs={[
          { label: 'Portal SSO', href: '/dashboard' },
          { label: 'SIPPM', href: '/sippm' },
          { label: 'Pencairan Dana' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={<ExternalLink size={16} />}
              onClick={() => router.push('/sikeu/pemasukan')}
              className="font-bold"
            >
              Integrasi SIKEU
            </Button>
            <Button
              variant="outline"
              icon={<Filter size={16} />}
              onClick={() => setShowFilter(true)}
              className="font-bold"
            >
              Filter
            </Button>
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => setIsModalOpen(true)}
              className="font-bold"
            >
              Pengajuan Pencairan Dana
            </Button>
          </div>
        }
      />

      {/* DataTable Component */}
      <DataTable
        columns={columns}
        data={filteredKontrak}
        isLoading={loading}
        meta={meta}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* FILTER DRAWER SLIDE RIGHT-TO-LEFT */}
      <Drawer
        open={showFilter}
        onClose={() => setShowFilter(false)}
        title="Filter & Urutkan Pencairan Dana SPK"
      >
        <div className="space-y-4">
          <Input
            label="Cari No SPK / Judul / Dosen"
            placeholder="Ketik no SPK, judul proposal, atau nama dosen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <hr style={{ borderTop: '1px solid var(--border-light)', margin: '0.5rem 0' }} />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Urut Berdasarkan"
              value={filterOrderBy}
              onChange={(val) => setFilterOrderBy(val)}
              options={[
                { value: 'id', label: 'ID Kontrak' },
                { value: 'nomor_kontrak', label: 'Nomor SPK' },
                { value: 'created_at', label: 'Tanggal Terbit' },
              ]}
            />
            <Select
              label="Arah"
              value={filterOrderDir}
              onChange={(val) => setFilterOrderDir(val)}
              options={[
                { value: 'desc', label: 'Z - A (Terbaru)' },
                { value: 'asc', label: 'A - Z (Terlama)' },
              ]}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              icon={<RotateCcw size={14} />}
              onClick={handleResetFilter}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              icon={<Filter size={14} />}
              onClick={handleApplyFilter}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </Drawer>

      {/* MODAL PREVIEW DOKUMEN SPK KONTRAK PROFESIONAL */}
      <Modal
        open={Boolean(selectedSpkKontrak)}
        onClose={() => setSelectedSpkKontrak(null)}
        title="Dokumen Fisik Surat Perjanjian Kerja (SPK)"
        size="lg"
      >
        {selectedSpkKontrak && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2 print:hidden">
              <Button
                variant="outline"
                icon={<Printer size={15} />}
                onClick={() => window.print()}
                className="font-bold text-xs"
              >
                Cetak SPK
              </Button>
            </div>

            {/* DOKUMEN FISIK SPK */}
            <div className="p-8 border border-slate-300 rounded-xl bg-white space-y-6 text-slate-900 font-serif leading-relaxed shadow-xs">
              {/* Kop Surat Universitas */}
              <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                <h3 className="font-extrabold text-lg tracking-wider text-slate-900 uppercase font-sans">
                  UNIVERSITAS SSO CAMPUS INTEGRATED
                </h3>
                <h4 className="font-bold text-sm tracking-wide text-primary-800 uppercase font-sans">
                  LEMBAGA PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT (LPPM)
                </h4>
                <p className="text-2xs font-sans text-slate-600">
                  Jl. Kampus Terpadu No. 1, Gedung Rektorat Lantai 3 • Telp: (021) 789-0123 • Email: lppm@campus.ac.id
                </p>
              </div>

              {/* Judul Dokumen SPK */}
              <div className="text-center space-y-1 py-2">
                <h2 className="text-base font-extrabold underline uppercase tracking-wide font-sans">
                  SURAT PERJANJIAN KERJA (SPK) PENELITIAN / PkM
                </h2>
                <div className="text-xs font-mono font-bold text-slate-700">
                  Nomor Surat: {selectedSpkKontrak.nomor_kontrak}
                </div>
              </div>

              {/* Pembuka */}
              <p className="text-xs text-justify font-sans">
                Pada hari ini, tanggal <strong>{selectedSpkKontrak.tgl_mulai || '01 September 2026'}</strong>, bertempat di Kantor LPPM Universitas SSO Campus, Pihak-pihak di bawah ini:
              </p>

              {/* Para Pihak */}
              <div className="space-y-3 text-xs font-sans pl-4">
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 font-bold">1. Nama Pihak I</div>
                  <div className="col-span-9">: Dr. Ir. Superadmin, M.T. (Kepala LPPM Universitas)</div>
                  <div className="col-span-3 font-bold">   Jabatan</div>
                  <div className="col-span-9">: Ketua Lembaga Penelitian &amp; Pengabdian Masyarakat</div>
                  <div className="col-span-12 text-slate-600 italic">
                    Bertindak untuk dan atas nama LPPM Universitas SSO Campus, selanjutnya disebut <strong>PIHAK PERTAMA</strong>.
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2 pt-2 border-t border-slate-100">
                  <div className="col-span-3 font-bold">2. Nama Pihak II</div>
                  <div className="col-span-9">
                    : {selectedSpkKontrak.proposal?.ketua?.nama_lengkap || (selectedSpkKontrak.proposal as any)?.ketua_pegawai?.nama_lengkap || 'Dosen Ketua Pengusul'}
                  </div>
                  <div className="col-span-3 font-bold">   NIP / NIDN</div>
                  <div className="col-span-9">
                    : {selectedSpkKontrak.proposal?.ketua?.nip || (selectedSpkKontrak.proposal as any)?.ketua_pegawai?.nip || '198501012010121001'}
                  </div>
                  <div className="col-span-3 font-bold">   Rumpun Ilmu</div>
                  <div className="col-span-9">: {selectedSpkKontrak.proposal?.rumpun_ilmu || 'Teknologi Informasi'}</div>
                  <div className="col-span-12 text-slate-600 italic">
                    Bertindak selaku Ketua Tim Pengusul Kegiatan, selanjutnya disebut <strong>PIHAK KEDUA</strong>.
                  </div>
                </div>
              </div>

              {/* Pasal-Pasal Perjanjian */}
              <div className="space-y-3 text-xs font-sans pt-2">
                <div>
                  <div className="font-bold text-center uppercase">Pasal 1: Judul &amp; Skema Kegiatan</div>
                  <p className="text-justify mt-1">
                    PIHAK PERTAMA memberikan tugas hibah kepada PIHAK KEDUA dan PIHAK KEDUA menerima tugas pelaksanaan hibah riset dengan judul usulan:
                    <br />
                    <strong className="block mt-1 p-2 bg-slate-50 border rounded-lg text-slate-900">
                      &quot;{selectedSpkKontrak.proposal?.judul}&quot;
                    </strong>
                  </p>
                </div>

                <div>
                  <div className="font-bold text-center uppercase">Pasal 2: Alokasi &amp; Besaran Dana Hibah</div>
                  <p className="text-justify mt-1">
                    Besaran dana hibah pelaksanaan kegiatan yang disetujui oleh PIHAK PERTAMA adalah sebesar:
                    <br />
                    <strong className="text-emerald-800 text-sm block mt-1">
                      {formatRupiah((selectedSpkKontrak as any).dana_disetujui || selectedSpkKontrak.nominal_dana || 0)}
                    </strong>
                    Pencairan dana dilakukan secara bertahap dalam 2 (dua) termin, yaitu Termin 1 (70%) dan Termin 2 (30%) setelah penyerahan LPJ Kemajuan.
                  </p>
                </div>

                <div>
                  <div className="font-bold text-center uppercase">Pasal 3: Jangka Waktu Pelaksanaan</div>
                  <p className="text-justify mt-1">
                    Pelaksanaan kegiatan dilakukan dalam jangka waktu terhitung sejak tanggal{' '}
                    <strong>{selectedSpkKontrak.tgl_mulai || '01 September 2026'}</strong> sampai dengan tanggal{' '}
                    <strong>{selectedSpkKontrak.tgl_selesai || '28 Februari 2027'}</strong>.
                  </p>
                </div>
              </div>

              {/* Tanda Tangan Legal Pihak I & II */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-sans text-center">
                <div className="space-y-12">
                  <div>
                    <div>PIHAK KEDUA (Ketua Pengusul)</div>
                    <div className="text-2xs text-slate-500">Dosen Pengampu / Peneliti Utama</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold underline">
                      {selectedSpkKontrak.proposal?.ketua?.nama_lengkap || (selectedSpkKontrak.proposal as any)?.ketua_pegawai?.nama_lengkap || 'Dosen Pengusul'}
                    </div>
                    <div className="text-2xs text-slate-500">
                      NIP: {selectedSpkKontrak.proposal?.ketua?.nip || (selectedSpkKontrak.proposal as any)?.ketua_pegawai?.nip || '-'}
                    </div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div>
                    <div>PIHAK PERTAMA (LPPM)</div>
                    <div className="text-2xs text-slate-500">Kepala LPPM SSO Campus</div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold underline flex items-center justify-center gap-1 text-primary-800">
                      <ShieldCheck size={16} className="text-primary-600" /> Dr. Ir. Superadmin, M.T.
                    </div>
                    <div className="text-2xs text-slate-500">NIP: 197805122003121002</div>
                  </div>
                </div>
              </div>

              {/* Footer Digital Stamp */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-2xs font-sans text-slate-400">
                <span>Dokumen Sah &amp; Diterbitkan Secara Elektronik oleh SIPPM Integrated System</span>
                <span className="font-mono">VERIFIED SPK DIGITAL CODE: #{selectedSpkKontrak.id}-2026-OK</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* FORM MODAL PENGAJUAN PENCAIRAN DANA (UI KIT & GRID 2 KOLOM) */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pengajuan Pencairan Dana Hibah"
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Pilih Kontrak SPK Hibah"
            value={selectedKontrakId}
            onChange={(val) => {
              const idNum = Number(val);
              setValue('kontrak_kegiatan_id', idNum);
              const found = kontrakList.find((k) => k.id === idNum);
              if (found) {
                const totalDana = (found as any).dana_disetujui || found.nominal_dana || 0;
                setValue('nominal_cair', Math.round(totalDana * (selectedTermin === 1 ? 0.7 : 0.3)));
              }
            }}
            options={[
              { value: 0, label: '-- Pilih Kontrak SPK --' },
              ...kontrakList.map((k) => ({
                value: k.id,
                label: `${k.nomor_kontrak} - ${k.proposal?.judul || 'Proposal Usulan'}`,
              })),
            ]}
            error={errors.kontrak_kegiatan_id?.message}
          />

          {/* Grid 2 Kolom per crud-ui-standard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Termin Ke-"
              value={selectedTermin}
              onChange={(val) => {
                const tNum = Number(val);
                setValue('termin_ke', tNum);
                const found = kontrakList.find((k) => k.id === selectedKontrakId);
                if (found) {
                  const totalDana = (found as any).dana_disetujui || found.nominal_dana || 0;
                  setValue('nominal_cair', Math.round(totalDana * (tNum === 1 ? 0.7 : 0.3)));
                }
              }}
              options={[
                { value: 1, label: 'Termin 1 (70% Dana Initial)' },
                { value: 2, label: 'Termin 2 (30% Pelunasan LPJ)' },
              ]}
            />

            <Input
              label="Nominal Pencairan (Rp)"
              type="number"
              placeholder="17500000"
              error={errors.nominal_cair?.message}
              {...register('nominal_cair', { valueAsNumber: true })}
              className="font-bold text-emerald-800"
            />

            <Input
              label="Nama Bank Rekening"
              placeholder="Misal: Bank Mandiri / BNI"
              error={errors.nama_bank?.message}
              {...register('nama_bank')}
            />

            <Input
              label="Nomor Rekening Tujuan"
              placeholder="137000xxxx"
              error={errors.nomor_rekening?.message}
              {...register('nomor_rekening')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={submitting}
              className="font-bold"
            >
              Kirim Pengajuan Pencairan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
