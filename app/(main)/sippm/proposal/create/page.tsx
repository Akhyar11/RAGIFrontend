'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save,
  FileText,
  Upload,
  UserPlus,
  Trash2,
  FlaskConical,
  BookOpen,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { sippmService } from '@/services/sippm.service';
import { simpegService } from '@/services/simpeg.service';
import apiClient from '@/lib/axios';
import type { JenisTim } from '@/types/sippm.types';
import { useAuth } from '@/hooks/useAuth';

// Zod Schema for Create Proposal
const proposalSchema = z.object({
  periode_id: z.number().min(1, 'Pilih periode hibah TA'),
  skema_id: z.number().min(1, 'Pilih skema kegiatan'),
  ketua_pegawai_id: z.number().min(1, 'Pilih Ketua Pengusul Dosen'),
  program_studi: z.string().min(2, 'Program studi wajib terisi'),
  judul: z.string().min(10, 'Judul proposal minimal 10 karakter'),
  anggaran_diajukan: z.number().min(1000000, 'Dana diusulkan minimal Rp 1.000.000'),
  target_tkt: z.number().min(1).max(9).default(1),
  abstrak: z.string().min(50, 'Abstrak proposal minimal 50 karakter'),
  anggota: z
    .array(
      z.object({
        jenis_tim: z.enum(['dosen', 'tendik', 'mahasiswa', 'dosen_eksternal', 'eksternal'] as const),
        pegawai_id: z.number().optional(),
        mahasiswa_id: z.number().optional(),
        nama_eksternal: z.string().optional(),
        instansi_eksternal: z.string().optional(),
        nidn_eksternal: z.string().optional(),
        peran_dalam_tim: z.string().optional(),
        tugas_kegiatan: z.string().optional(),
      })
    )
    .optional(),
  mata_kuliah_konversi: z
    .array(
      z.object({
        mata_kuliah_id: z.number().min(1, 'Pilih mata kuliah'),
        keterangan: z.string().optional(),
      })
    )
    .optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export default function CreateProposalPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();

  // Pure RBAC check (per rbac-refactoring-standard)
  const canCreate = hasPermission('sippm.proposal.create') || hasPermission('sippm.proposal.manage');

  const [currentProdi, setCurrentProdi] = useState('S1 Teknik Informatika');
  const [fileProposal, setFileProposal] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema) as any,
    defaultValues: {
      periode_id: undefined as any,
      skema_id: undefined as any,
      ketua_pegawai_id: undefined as any,
      program_studi: '',
      judul: '',
      anggaran_diajukan: 10000000,
      target_tkt: 1,
      abstrak: '',
      anggota: [],
      mata_kuliah_konversi: [],
    },
  });

  const { fields: anggotaFields, append: appendAnggota, remove: removeAnggota } = useFieldArray({
    control,
    name: 'anggota',
  });

  const { fields: mkFields, append: appendMk, remove: removeMk } = useFieldArray({
    control,
    name: 'mata_kuliah_konversi',
  });

  const anggotaWatch = watch('anggota');

  // Loaders for AsyncSelect server-side fetching (Form Validation Standard Rule 2)
  const loadPeriodeOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await sippmService.indexPeriode();
      const periodes = Array.isArray(res?.data) ? res.data : (res?.data as any)?.items || [];
      const filtered = periodes.filter((p: any) =>
        !inputValue || (p.tahun_anggaran || p.nama_periode || '').toLowerCase().includes(inputValue.toLowerCase())
      );
      return filtered.map((p: any) => ({
        value: p.id,
        label: p.tahun_anggaran || p.nama_periode || `Periode ${p.id}`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadSkemaOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await sippmService.indexSkema();
      const skemas = Array.isArray(res?.data) ? res.data : (res?.data as any)?.items || [];
      const filtered = skemas.filter((s: any) =>
        !inputValue || (s.nama || s.nama_skema || '').toLowerCase().includes(inputValue.toLowerCase())
      );
      return filtered.map((s: any) => ({
        value: s.id,
        label: s.nama || s.nama_skema,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadDosenOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await simpegService.getPegawaiList({ search: inputValue || undefined, jenis_pegawai: 'dosen' });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return list.map((d: any) => ({
        value: d.id,
        label: `${d.nama_lengkap || d.name} (NIP: ${d.nip || '-'})`,
        prodi: d.unit_kerja?.nama || d.prodi || 'Dosen',
      }));
    } catch {
      return [];
    }
  }, []);

  const loadTendikOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await simpegService.getPegawaiList({ search: inputValue || undefined, jenis_pegawai: 'tendik' });
      const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return list.map((t: any) => ({
        value: t.id,
        label: `${t.nama_lengkap || t.name} (NIP: ${t.nip || '-'})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadMahasiswaOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await apiClient.get<any>('/v1/siakad/mahasiswa', {
        params: { search: inputValue || undefined, limit: 20 },
      });
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      return list.map((m: any) => ({
        value: m.id,
        label: `${m.nama_lengkap || m.nama} (NIM: ${m.nim || '-'})`,
      }));
    } catch {
      return [];
    }
  }, []);

  const loadMatkulOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await apiClient.get<any>('/v1/siakad/obe/matrix/cpl-mata-kuliah', {
        params: { search: inputValue || undefined },
      });
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : [];
      return list.map((m: any) => ({
        value: m.id,
        label: `${m.nama_mk || m.nama || m.label} [${m.kode_mk || m.kode || 'MK'}] (${m.sks || 3} SKS)`,
      }));
    } catch {
      return [];
    }
  }, []);

  const onSubmit = async (data: ProposalFormValues) => {
    try {
      setSubmitting(true);
      const primaryMkId = data.mata_kuliah_konversi?.[0]?.mata_kuliah_id;

      const payload: any = {
        periode_hibah_id: data.periode_id,
        skema_kegiatan_id: data.skema_id,
        ketua_pegawai_id: data.ketua_pegawai_id,
        mata_kuliah_id: primaryMkId,
        judul: data.judul,
        abstrak: data.abstrak,
        rumpun_ilmu: currentProdi,
        dana_diusulkan: data.anggaran_diajukan,
        file_proposal: fileProposal || undefined,
        anggota: data.anggota?.map((a) => ({
          jenis_tim: a.jenis_tim,
          pegawai_id: a.pegawai_id,
          mahasiswa_id: a.mahasiswa_id,
          nama_eksternal: a.nama_eksternal,
          instansi_eksternal: a.instansi_eksternal,
          nidn_eksternal: a.nidn_eksternal,
          peran_dalam_tim: a.peran_dalam_tim || 'Anggota',
          tugas_kegiatan: a.tugas_kegiatan,
        })),
      };

      await sippmService.createProposal(payload);
      toast.success('Proposal usulan berhasil disimpan');
      router.push('/sippm/proposal');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan proposal kegiatan');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Form Pengajuan Proposal Usulan SIPPM"
          description="Buat dan ajukan proposal usulan hibah riset & PkM"
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
          }
        />
        <div className="card p-6 text-center">
          <ShieldAlert size={56} className="mx-auto mb-4 opacity-40 text-rose-500" />
          <h2 className="text-xl font-bold mb-2">Akses Ditolak / Dibatasi</h2>
          <p className="max-w-[500px] mx-auto opacity-70">
            Peran Anda saat ini tidak memiliki permission untuk membuat proposal SIPPM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Form Pengajuan Proposal Usulan SIPPM"
        description="Lengkapi data usulan hibah, Jenis Tim (Tendik/Dosen Eksternal), serta Konversi Nilai Multi-Mata Kuliah SIAKAD."
        action={
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Kembali
            </Button>
            <Badge variant="blue">Integrasi SIAKAD & SIMPEG</Badge>
          </div>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* CARD 1: INFORMASI PERIODE TA, SKEMA & KETUA DOSEN */}
        <div className="card">
          <div className="card-header border-b px-6 py-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FlaskConical size={18} className="text-primary-600" /> Skema, Periode TA & Ketua Pengusul
            </h2>
          </div>
          <div className="card-body p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Field 1: Periode Hibah */}
              <AsyncSelect
                label="Periode Hibah (TA Format)"
                required
                error={errors.periode_id?.message}
                loadOptions={loadPeriodeOptions}
                onChange={(val: any) => {
                  if (val) setValue('periode_id', Number(val.value));
                }}
              />

              {/* Field 2: Skema Kegiatan */}
              <AsyncSelect
                label="Skema Kegiatan (Standar PDDIKTI)"
                required
                error={errors.skema_id?.message}
                loadOptions={loadSkemaOptions}
                onChange={(val: any) => {
                  if (val) setValue('skema_id', Number(val.value));
                }}
              />

              {/* Field 3: Ketua Pengusul Dosen */}
              <AsyncSelect
                label="Ketua Pengusul (Dosen SIMPEG)"
                required
                error={errors.ketua_pegawai_id?.message}
                loadOptions={loadDosenOptions}
                onChange={(val: any) => {
                  if (val) {
                    setValue('ketua_pegawai_id', Number(val.value));
                    if (val.prodi) {
                      setCurrentProdi(val.prodi);
                      setValue('program_studi', val.prodi);
                    }
                  }
                }}
              />

              {/* Field 4: Program Studi */}
              <Input
                label="Program Studi"
                required
                readOnly
                value={currentProdi}
                hint="Terisi otomatis dari data Ketua Pengusul Dosen SIMPEG"
                className="bg-slate-100 font-bold cursor-not-allowed"
              />

              {/* Field 5: Judul Proposal */}
              <div className="lg:col-span-2">
                <Input
                  label="Judul Usulan Proposal"
                  required
                  placeholder="Ketik judul proposal usulan lengkap..."
                  error={errors.judul?.message}
                  {...register('judul')}
                />
              </div>

              {/* Field 6: Dana Diusulkan */}
              <Input
                label="Dana Diusulkan (Rp)"
                type="number"
                required
                placeholder="20000000"
                error={errors.anggaran_diajukan?.message}
                {...register('anggaran_diajukan', { valueAsNumber: true })}
              />

              {/* Field 7: Abstrak */}
              <div className="col-span-full">
                <Textarea
                  label="Abstrak Proposal Usulan"
                  required
                  rows={4}
                  placeholder="Tuliskan latar belakang masalah, urgensi riset/pengabdian, metode, serta target luaran..."
                  error={errors.abstrak?.message}
                  {...register('abstrak')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: BOX STRUKTUR JENIS TIM ANGGOTA (INTERNAL & EKSTERNAL) */}
        <div className="card">
          <div className="card-header border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserPlus size={18} className="text-primary-600" /> Struktur Jenis Tim Anggota (Internal & Eksternal)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dukungan Jenis Tim lengkap: Dosen, Tendik (SIMPEG), Mahasiswa (SIAKAD), serta Dosen Eksternal.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() =>
                appendAnggota({
                  jenis_tim: 'dosen',
                  pegawai_id: 1,
                  peran_dalam_tim: 'Anggota Peneliti',
                  tugas_kegiatan: '',
                })
              }
            >
              Tambah Anggota Tim
            </Button>
          </div>
          <div className="card-body p-6 space-y-4">
            {anggotaFields.map((field, index) => {
              const currentJenisTim: JenisTim = anggotaWatch?.[index]?.jenis_tim || 'dosen';

              return (
                <div key={field.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Field Jenis Tim */}
                  <div className="md:col-span-3">
                    <Select
                      label="Jenis Tim"
                      required
                      {...register(`anggota.${index}.jenis_tim` as const)}
                      onChange={(e) => {
                        const val = e.target.value as JenisTim;
                        setValue(`anggota.${index}.jenis_tim`, val);
                      }}
                      options={[
                        { value: 'dosen', label: 'Dosen (SIMPEG)' },
                        { value: 'tendik', label: 'Tendik / Laboran (SIMPEG)' },
                        { value: 'mahasiswa', label: 'Mahasiswa (SIAKAD)' },
                        { value: 'dosen_eksternal', label: 'Dosen Eksternal' },
                        { value: 'eksternal', label: 'Mitra / Instansi' },
                      ]}
                    />
                  </div>

                  {/* Dynamic Selection Input Based on Jenis Tim */}
                  <div className="md:col-span-5">
                    {currentJenisTim === 'dosen' && (
                      <AsyncSelect
                        label="Pilih Dosen (SIMPEG)"
                        required
                        loadOptions={loadDosenOptions}
                        onChange={(val: any) => {
                          if (val) setValue(`anggota.${index}.pegawai_id`, Number(val.value));
                        }}
                      />
                    )}

                    {currentJenisTim === 'tendik' && (
                      <AsyncSelect
                        label="Pilih Tendik (SIMPEG)"
                        required
                        loadOptions={loadTendikOptions}
                        onChange={(val: any) => {
                          if (val) setValue(`anggota.${index}.pegawai_id`, Number(val.value));
                        }}
                      />
                    )}

                    {currentJenisTim === 'mahasiswa' && (
                      <AsyncSelect
                        label="Pilih Mahasiswa (SIAKAD)"
                        required
                        loadOptions={loadMahasiswaOptions}
                        onChange={(opt: any) => {
                          if (opt) setValue(`anggota.${index}.mahasiswa_id` as const, Number(opt.value));
                        }}
                      />
                    )}

                    {currentJenisTim === 'dosen_eksternal' && (
                      <div className="space-y-2">
                        <Input
                          label="Nama Dosen Eksternal"
                          required
                          placeholder="Nama & Gelar Dosen Eksternal"
                          {...register(`anggota.${index}.nama_eksternal` as const)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            placeholder="NIDN Eksternal"
                            {...register(`anggota.${index}.nidn_eksternal` as const)}
                          />
                          <Input
                            placeholder="Instansi Asal"
                            {...register(`anggota.${index}.instansi_eksternal` as const)}
                          />
                        </div>
                      </div>
                    )}

                    {currentJenisTim === 'eksternal' && (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Nama Perwakilan"
                          placeholder="Nama Perwakilan Mitra"
                          {...register(`anggota.${index}.nama_eksternal` as const)}
                        />
                        <Input
                          label="Nama Instansi"
                          placeholder="Perusahaan / Instansi"
                          {...register(`anggota.${index}.instansi_eksternal` as const)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Tugas / Deskripsi Job */}
                  <div className="md:col-span-3">
                    <Input
                      label="Peran & Tugas Tim"
                      placeholder="Contoh: Analisis Data & Pengujian Lab"
                      {...register(`anggota.${index}.tugas_kegiatan` as const)}
                    />
                  </div>

                  {/* Hapus Button */}
                  <div className="md:col-span-1 flex items-center justify-end md:justify-center pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={16} className="text-rose-600" />}
                      onClick={() => removeAnggota(index)}
                      disabled={anggotaFields.length === 1}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD 3: BOX INTEGRASI MATA KULIAH SIAKAD (KONVERSI NILAI MAHASISWA) */}
        <div className="card">
          <div className="card-header border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-primary-600" /> Integrasi Mata Kuliah SIAKAD (Konversi Nilai Mahasiswa)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih mata kuliah aktif SIAKAD yang akan mendapatkan konversi nilai / SKS bagi mahasiswa yang berpartisipasi.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Plus size={16} />}
              onClick={() =>
                appendMk({
                  mata_kuliah_id: 0,
                  keterangan: '',
                })
              }
            >
              Tambah Mata Kuliah Konversi
            </Button>
          </div>
          <div className="card-body p-6 space-y-4">
            {mkFields.map((field, index) => (
              <div key={field.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Select Box Mata Kuliah via AsyncSelect */}
                <div className="md:col-span-6">
                  <AsyncSelect
                    label={`Mata Kuliah Aktif SIAKAD (${index + 1})`}
                    required
                    loadOptions={loadMatkulOptions}
                    onChange={(val: any) => {
                      if (val) setValue(`mata_kuliah_konversi.${index}.mata_kuliah_id`, Number(val.value));
                    }}
                  />
                </div>

                {/* Keterangan / Target Konversi */}
                <div className="md:col-span-5">
                  <Input
                    label="Catatan / Target Konversi (Opsional)"
                    placeholder="Contoh: Konversi nilai otomatis mahasiswa S1 TI"
                    {...register(`mata_kuliah_konversi.${index}.keterangan` as const)}
                  />
                </div>

                {/* Hapus Button */}
                <div className="md:col-span-1 flex items-center justify-end md:justify-center pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} className="text-rose-600" />}
                    onClick={() => removeMk(index)}
                    disabled={mkFields.length === 1}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 4: FILE BERKAS PROPOSAL */}
        <div className="card">
          <div className="card-header border-b px-6 py-4">
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Upload size={18} className="text-primary-600" /> Berkas Dokumen Proposal (PDF)
            </h2>
          </div>
          <div className="card-body p-6">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary-500 transition-colors bg-slate-50">
              <FileText className="mx-auto text-primary-600 mb-2" size={36} />
              <div className="text-sm font-bold text-slate-800 mb-1">
                {fileProposal ? fileProposal.name : 'Pilih atau drop file PDF Proposal'}
              </div>
              <p className="text-xs text-slate-400 mb-4">Format PDF sesuai template panduan hibah (Maksimal 10 MB)</p>
              <Input
                type="file"
                accept=".pdf"
                className="max-w-xs mx-auto"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFileProposal(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={submitting}
            icon={<Save size={18} />}
          >
            Simpan Draf Proposal
          </Button>
        </div>
      </form>
    </div>
  );
}
