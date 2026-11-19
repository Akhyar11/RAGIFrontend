'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Send, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { sippmService } from '@/services/sippm.service';
import type { CreatePengumumanPayload } from '@/types/sippm.types';
import { useAuth } from '@/hooks/useAuth';

const DEFAULT_JADWAL = [
  { waktu: '20 Maret – 22 Maret', kegiatan: 'Pengumuman Penerimaan proposal PPM' },
  { waktu: '23 Maret - 23 April', kegiatan: 'Unggah proposal melalui system http://sippm.poltekindonusa.ac.id\nUsername : nidn\nPassword : nidn' },
  { waktu: '24 April – 28 April', kegiatan: 'Penilaian oleh tim reviewer' },
  { waktu: '29 April', kegiatan: 'Penetapan pemenang' },
  { waktu: '30 April', kegiatan: 'Pengumuman proposal yang didanai' },
  { waktu: '4 Mei', kegiatan: 'Kontrak dan Pencairan dana 70%' },
  { waktu: '4 Mei – 4 Juli', kegiatan: 'Pelaksanaan PPM' },
  { waktu: '6 – 7 Juli', kegiatan: 'Monev kemajuan pelaksanaan PPM melalui sistem' },
  { waktu: '14 – 15 Agustus', kegiatan: 'Unggah Laporan akhir dan Luaran yang sesuai dalam proposal melalui sistem' },
  { waktu: 'Akhir Agustus', kegiatan: 'Seminar Hasil dan pencairan dana 30%' },
];

const pengumumanSchema = z.object({
  nomor_surat: z.string().min(1, 'Nomor surat wajib diisi'),
  tgl_surat: z.string().min(1, 'Tanggal surat wajib diisi'),
  tahun_anggaran: z.string().min(1, 'Tahun anggaran wajib diisi'),
  kategori_pendanaan: z.string().optional(),
  hal_surat: z.string().min(1, 'Perihal surat wajib diisi'),
  nama_ketua_uppm: z.string().min(1, 'Nama Ketua UPPM wajib diisi'),
  nama_direktur: z.string().min(1, 'Nama Direktur wajib diisi'),
  tgl_buka_proposal: z.string().min(1, 'Tanggal buka pengusulan wajib diisi'),
  tgl_tutup_proposal: z.string().min(1, 'Tanggal tutup pengusulan wajib diisi'),
  kualifikasi_dosen: z.string().optional().nullable(),
});

type PengumumanFormValues = z.infer<typeof pengumumanSchema>;

export default function CreatePengumumanPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('sippm.pengumuman.create') || hasPermission('sippm.pengumuman.manage');

  const [submitting, setSubmitting] = useState(false);
  const [jadwalRows, setJadwalRows] = useState<{ waktu: string; kegiatan: string }[]>(DEFAULT_JADWAL);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PengumumanFormValues>({
    resolver: zodResolver(pengumumanSchema),
    defaultValues: {
      nomor_surat: '001/UPPM-INDONUSA/III/2026',
      tgl_surat: '2026-03-20',
      tahun_anggaran: '2026',
      kategori_pendanaan: 'Hibah Institusi',
      hal_surat: 'Penerimaan Proposal Penelitian dan Pengabdian Kepada Masyarakat (PPM) Hibah Institusi Tahun Anggaran 2026',
      nama_ketua_uppm: 'Narsih, S.T., M.Kom',
      nama_direktur: 'Ir. Suwahyo, S.T., M.T',
      tgl_buka_proposal: '2026-03-23',
      tgl_tutup_proposal: '2026-04-23',
      kualifikasi_dosen: '',
    },
  });

  const handleJadwalChange = (index: number, field: 'waktu' | 'kegiatan', value: string) => {
    const updated = [...jadwalRows];
    updated[index] = { ...updated[index], [field]: value };
    setJadwalRows(updated);
  };

  const handleAddJadwalRow = () => {
    setJadwalRows((prev) => [...prev, { waktu: '', kegiatan: '' }]);
  };

  const handleRemoveJadwalRow = (index: number) => {
    setJadwalRows((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: PengumumanFormValues) => {
    if (!canCreate) {
      toast.error('Akses Ditolak: Anda tidak memiliki permission menerbitkan pengumuman.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreatePengumumanPayload = {
        ...values,
        kualifikasi_dosen: values.kualifikasi_dosen || undefined,
        lampiran_alokasi_waktu: jadwalRows,
        lampiran_jadwal: jadwalRows,
      };

      await sippmService.createPengumuman(payload);
      toast.success('Pengumuman hibah berhasil diterbitkan & Draf PDF siap dicetak!');
      router.push('/sippm/pengumuman');
    } catch (error: any) {
      console.error('Submit Pengumuman Error:', error);
      toast.error(error.response?.data?.message || 'Gagal menerbitkan pengumuman');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Terbitkan Pengumuman Hibah Institusi Baru"
          description="Formulir Penerbitan Dokumen Surat Resmi Pengumuman Proposal Hibah"
          action={
            <Button
              variant="outline"
              onClick={() => router.back()}
              icon={<ArrowLeft size={16} />}
            >
              Kembali
            </Button>
          }
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Anda tidak memiliki permission untuk menerbitkan pengumuman hibah.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Terbitkan Pengumuman Hibah Institusi Baru"
        description="Formulir Penerbitan Dokumen Surat Resmi Pengumuman Proposal Hibah"
        action={
          <Button
            variant="outline"
            onClick={() => router.back()}
            icon={<ArrowLeft size={16} />}
          >
            Kembali
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Grid 2 Kolom untuk Seksi 1 & 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Informasi Dokumen Surat */}
          <div className="card p-6 space-y-4">
            <div className="border-b pb-3 flex items-center gap-2">
              <span className="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="font-bold text-sm">Informasi Dokumen Surat</h3>
            </div>

            <Input
              label="Nomor Surat Resmi"
              required
              placeholder="Contoh: 001/UPPM-INDONUSA/III/2026"
              error={errors.nomor_surat?.message}
              {...register('nomor_surat')}
            />

            <Input
              label="Tanggal Surat"
              type="date"
              required
              error={errors.tgl_surat?.message}
              {...register('tgl_surat')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tahun Anggaran Pendanaan"
                required
                placeholder="Contoh: 2026"
                error={errors.tahun_anggaran?.message}
                {...register('tahun_anggaran')}
              />

              <Input
                label="Kategori Pendanaan"
                placeholder="Contoh: Hibah Institusi"
                error={errors.kategori_pendanaan?.message}
                {...register('kategori_pendanaan')}
              />
            </div>

            <Input
              label="Perihal Surat"
              required
              placeholder="Penerimaan Proposal Penelitian..."
              error={errors.hal_surat?.message}
              {...register('hal_surat')}
            />
          </div>

          {/* Column 2: Waktu Pengusulan & Pejabat TTD */}
          <div className="card p-6 space-y-4">
            <div className="border-b pb-3 flex items-center gap-2">
              <span className="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center">2</span>
              <h3 className="font-bold text-sm">Waktu Pengusulan & Pejabat TTD</h3>
            </div>

            <div className="p-4 rounded-xl border space-y-3 bg-slate-50/50">
              <h4 className="font-bold text-xs uppercase opacity-80">Periode Pengusulan Proposal Dosen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tanggal Buka Pengusulan"
                  type="date"
                  required
                  error={errors.tgl_buka_proposal?.message}
                  {...register('tgl_buka_proposal')}
                />

                <Input
                  label="Tanggal Tutup Pengusulan"
                  type="date"
                  required
                  error={errors.tgl_tutup_proposal?.message}
                  {...register('tgl_tutup_proposal')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama & Gelar Ketua UPPM"
                required
                placeholder="Narsih, S.T., M.Kom"
                error={errors.nama_ketua_uppm?.message}
                {...register('nama_ketua_uppm')}
              />

              <Input
                label="Nama & Gelar Direktur Kampus"
                required
                placeholder="Ir. Suwahyo, S.T., M.T"
                error={errors.nama_direktur?.message}
                {...register('nama_direktur')}
              />
            </div>

            <Textarea
              label="Kualifikasi Dosen Sasaran"
              rows={2}
              placeholder="Rincian kualifikasi dosen pemohon..."
              error={errors.kualifikasi_dosen?.message}
              {...register('kualifikasi_dosen')}
            />
          </div>
        </div>

        {/* Section 3: LAMPIRAN 1 Editor (Alokasi Waktu & Agenda) */}
        <div className="card p-6 space-y-4">
          <div className="border-b pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-slate-100 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center shrink-0">3</span>
              <div>
                <h3 className="font-bold text-sm">LAMPIRAN 1: Alokasi Waktu & Agenda Kegiatan</h3>
                <p className="text-xs opacity-70 mt-0.5">
                  Daftar agenda alokasi waktu kegiatan yang akan tampil pada Lampiran 1 surat resmi pengumuman.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddJadwalRow}
              icon={<Plus size={14} />}
            >
              Tambah Baris Agenda
            </Button>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-2xs">
                <tr>
                  <th className="p-3 w-12 text-center border-b">No</th>
                  <th className="p-3 w-72 border-b">Waktu Agenda</th>
                  <th className="p-3 border-b">Rincian Kegiatan</th>
                  <th className="p-3 w-20 text-center border-b">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {jadwalRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 text-center font-bold opacity-60">
                      {idx + 1}.
                    </td>
                    <td className="p-3">
                      <Input
                        placeholder="Contoh: 20 Maret – 22 Maret"
                        value={row.waktu || ''}
                        onChange={(e) => handleJadwalChange(idx, 'waktu', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                      <Textarea
                        rows={2}
                        placeholder="Rincian kegiatan..."
                        value={row.kegiatan || ''}
                        onChange={(e) => handleJadwalChange(idx, 'kegiatan', e.target.value)}
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => handleRemoveJadwalRow(idx)}
                        icon={<Trash2 size={14} />}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Footer */}
        <div className="card p-4 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Batal
          </Button>

          <Button
            type="submit"
            loading={submitting}
            disabled={submitting}
            icon={<Send size={16} />}
          >
            Terbitkan & Generate Draf Surat PDF
          </Button>
        </div>
      </form>
    </div>
  );
}
