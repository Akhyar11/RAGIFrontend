'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, UploadCloud, ShieldAlert, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { simpegService } from '@/services/simpeg.service';
import { useAuth } from '@/hooks/useAuth';
import type { JabatanFungsionalAkademik, Pegawai } from '@/types/simpeg.types';

const jadCreateSchema = z
  .object({
    pegawai_id: z.string().min(1, 'Dosen wajib dipilih'),
    jafung_tujuan_id: z.string().min(1, 'Jabatan Akademik wajib dipilih'),
    nomor_sk: z.string().min(1, 'Nomor SK wajib diisi'),
    tanggal_mulai_berlaku: z.string().min(1, 'Tanggal mulai berlaku (TMT) wajib diisi'),
    tanggal_selesai_berlaku: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.tanggal_mulai_berlaku && data.tanggal_selesai_berlaku) {
        return new Date(data.tanggal_selesai_berlaku) >= new Date(data.tanggal_mulai_berlaku);
      }
      return true;
    },
    {
      message: 'Tanggal selesai berlaku harus sama dengan atau setelah tanggal mulai berlaku',
      path: ['tanggal_selesai_berlaku'],
    }
  );

type JadCreateFormValues = z.infer<typeof jadCreateSchema>;

export default function CreateUsulanJafungPage() {
  const router = useRouter();
  const { isAdmin, hasPermission } = useAuth();

  const canAccess = isAdmin || hasPermission('simpeg.usulan_jafung.verify') || hasPermission('simpeg.usulan_jafung.manage');
  const canCreate = hasPermission('simpeg.usulan_jafung.create') || hasPermission('simpeg.usulan_jafung.request');

  const [jafungList, setJafungList] = useState<JabatanFungsionalAkademik[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [selectedPegawai, setSelectedPegawai] = useState<Pegawai | null>(null);
  const [selectedPegawaiOption, setSelectedPegawaiOption] = useState<{ value: string; label: string } | null>(null);
  const [isCheckingPegawai, setIsCheckingPegawai] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedJafungIds, setRecordedJafungIds] = useState<number[]>([]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<JadCreateFormValues>({
    resolver: zodResolver(jadCreateSchema),
    defaultValues: {
      pegawai_id: '',
      jafung_tujuan_id: '',
      nomor_sk: '',
      tanggal_mulai_berlaku: '',
      tanggal_selesai_berlaku: '',
    },
  });

  // Fetch daftar master JAD
  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await simpegService.getJabatanFungsionalList();
        setJafungList(res.data || []);
      } catch (err) {
        console.error('Gagal memuat daftar jabatan fungsional', err);
        toast.error('Gagal memuat data master Jabatan Akademik.');
      } finally {
        setLoadingMaster(false);
      }
    };
    fetchMaster();
  }, []);

  const fetchRecordedJafungIds = async (pegId: number) => {
    try {
      const res = await simpegService.getUsulanJafungList({ pegawai_id: pegId, limit: 100 });
      const ids: number[] = (res.data || []).map((u: any) => u.jafung_tujuan_id).filter(Boolean);
      setRecordedJafungIds(ids);
    } catch {
      setRecordedJafungIds([]);
    }
  };

  // Inisialisasi pegawai (jika dosen mandiri / non-verifier)
  useEffect(() => {
    if (!canAccess && canCreate) {
      setIsCheckingPegawai(true);
      simpegService
        .getPegawaiMe()
        .then((resMe) => {
          if (resMe.data) {
            const me = resMe.data;
            setSelectedPegawai(me);
            setValue('pegawai_id', String(me.id), { shouldValidate: true });
            fetchRecordedJafungIds(me.id);
          }
        })
        .catch((err) => {
          console.error('Gagal mengambil data profil pegawai', err);
          toast.error('Akun Anda belum terhubung dengan data Pegawai.');
        })
        .finally(() => {
          setIsCheckingPegawai(false);
        });
    }
  }, [canAccess, canCreate, setValue]);

  // Server-side async loader untuk memilih dosen
  const loadDosenOptions = useCallback(async (inputValue: string) => {
    try {
      const res = await simpegService.getPegawaiList({
        search: inputValue || undefined,
        jenis_pegawai: 'dosen',
        per_page: 50,
      });
      const list: Pegawai[] = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return list.map((p) => ({
        value: String(p.id),
        label: `${p.nama_lengkap}${p.nip ? ` (NIP: ${p.nip})` : ''} - ${p.unit_kerja?.nama || 'Dosen'}`,
        pegawai: p,
      }));
    } catch (err) {
      console.error('Gagal memuat daftar dosen', err);
      return [];
    }
  }, []);

  const handleSelectDosen = (opt: any) => {
    setSelectedPegawaiOption(opt);
    if (!opt) {
      setSelectedPegawai(null);
      setRecordedJafungIds([]);
      setValue('pegawai_id', '', { shouldValidate: true });
      setValue('jafung_tujuan_id', '');
      return;
    }

    const peg: Pegawai = opt.pegawai;
    setSelectedPegawai(peg);
    setValue('pegawai_id', String(peg.id), { shouldValidate: true });
    setValue('jafung_tujuan_id', '');
    fetchRecordedJafungIds(peg.id);
  };

  const onSubmit = async (values: JadCreateFormValues) => {
    if (!canCreate) {
      toast.error('Akses Ditolak: Anda tidak memiliki hak akses mencatat data JAD.');
      return;
    }

    if (recordedJafungIds.includes(Number(values.jafung_tujuan_id))) {
      toast.error('Jabatan Akademik ini sudah pernah tercatat untuk dosen yang bersangkutan.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('pegawai_id', values.pegawai_id);
      formData.append('jafung_tujuan_id', values.jafung_tujuan_id);
      formData.append('nomor_sk', values.nomor_sk);
      formData.append('tanggal_mulai_berlaku', values.tanggal_mulai_berlaku);
      if (values.tanggal_selesai_berlaku) {
        formData.append('tanggal_selesai_berlaku', values.tanggal_selesai_berlaku);
      }
      if (selectedFile) {
        formData.append('file_sk_hasil', selectedFile);
      }

      await simpegService.createUsulanJafung(formData);
      toast.success('Data penetapan JAD dan SK berhasil disimpan!');
      router.push('/simpeg/usulan-jafung');
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.errors?.jafung_tujuan_id?.[0] ||
        err?.response?.data?.errors?.tanggal_selesai_berlaku?.[0] ||
        err?.response?.data?.message ||
        'Gagal menyimpan data JAD';
      toast.error(errMsg);
    }
  };

  if (!canCreate) {
    return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
          title="Unggah SK Penetapan Jabatan Akademik (JAD)"
          description="Pencatatan data dan berkas SK penetapan Jabatan Fungsional Akademik Dosen"
          action={
            <Link href="/simpeg/usulan-jafung">
              <Button variant="outline" icon={<ArrowLeft size={16} />}>
                Kembali
              </Button>
            </Link>
          }
        />
        <Card>
          <EmptyState
            icon={<ShieldAlert size={48} className="text-[var(--danger)]" />}
            title="Akses Ditolak"
            description="Peran Anda tidak memiliki izin untuk mengunggah atau mencatat SK Jabatan Akademik Dosen."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Unggah SK Penetapan Jabatan Akademik (JAD)"
        description="Form pencatatan data dan berkas SK penetapan Jabatan Akademik Dosen"
        action={
          <Link href="/simpeg/usulan-jafung">
            <Button variant="outline" icon={<ArrowLeft size={16} />}>
              Kembali
            </Button>
          </Link>
        }
      />

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bagian Kiri: Identitas Dosen, JAD, dan Nomor SK */}
            <div className="space-y-4">
              {canAccess ? (
                <AsyncSelect
                  label="Pilih Dosen"
                  required
                  placeholder="Ketik nama atau NIP dosen..."
                  loadOptions={loadDosenOptions}
                  value={selectedPegawaiOption}
                  onChange={handleSelectDosen}
                  isClearable
                  error={errors.pegawai_id?.message}
                />
              ) : (
                selectedPegawai && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col gap-1">
                    <span className="text-slate-400 font-medium block">Dosen Terkait:</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {selectedPegawai.nama_lengkap}
                    </span>
                    <span className="text-slate-500 block">
                      NIP: {selectedPegawai.nip || '-'} • Unit: {selectedPegawai.unit_kerja?.nama || '-'}
                    </span>
                  </div>
                )
              )}

              {isCheckingPegawai && (
                <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded-xl text-center animate-pulse">
                  Memeriksa data kepegawaian dosen...
                </div>
              )}

              <Controller
                name="jafung_tujuan_id"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Jabatan Akademik (JAD)"
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.jafung_tujuan_id?.message}
                    options={[
                      { value: '', label: '-- Pilih Jabatan Akademik --' },
                      ...jafungList.map((jf) => {
                        const isRecorded = recordedJafungIds.includes(jf.id);
                        return {
                          value: String(jf.id),
                          label: isRecorded ? `${jf.nama} (Sudah Pernah Dicatat)` : jf.nama,
                          isDisabled: isRecorded,
                        };
                      }),
                    ]}
                    required
                    disabled={loadingMaster || !selectedPegawai || isCheckingPegawai}
                  />
                )}
              />

              <Input
                label="Nomor SK Penetapan"
                placeholder="Contoh: SK LLDIKTI No. 123/LL6/AK/2026"
                required
                disabled={!selectedPegawai || isCheckingPegawai}
                error={errors.nomor_sk?.message}
                {...register('nomor_sk')}
              />
            </div>

            {/* Bagian Kanan: TMT Mulai, TMT Selesai, dan Berkas SK */}
            <div className="space-y-4">
              <Input
                type="date"
                label="Tanggal Mulai Berlaku (TMT Mulai)"
                required
                disabled={!selectedPegawai || isCheckingPegawai}
                error={errors.tanggal_mulai_berlaku?.message}
                {...register('tanggal_mulai_berlaku')}
              />

              <Input
                type="date"
                label="Tanggal Selesai Berlaku (TMT Selesai) - Opsional"
                hint="Kosongkan jika SK penetapan berlaku definitif/tanpa batas waktu."
                disabled={!selectedPegawai || isCheckingPegawai}
                error={errors.tanggal_selesai_berlaku?.message}
                {...register('tanggal_selesai_berlaku')}
              />

              <Input
                type="file"
                label="Berkas SK Penetapan"
                accept=".pdf,.jpg,.jpeg,.png"
                hint="Format: PDF, JPG, atau PNG. Ukuran maksimal 10MB."
                prefixIcon={<UploadCloud size={16} />}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setSelectedFile(file);
                }}
                disabled={!selectedPegawai || isCheckingPegawai}
              />

              {selectedFile && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-700">
                  <FileText size={16} className="text-emerald-600 flex-shrink-0" />
                  <span className="truncate font-medium">{selectedFile.name}</span>
                  <span className="text-slate-400 text-2xs ml-auto">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
            <Link href="/simpeg/usulan-jafung" className="w-full sm:w-auto">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              loading={isSubmitting}
              disabled={!selectedPegawai || isCheckingPegawai || isSubmitting}
              style={{ backgroundColor: 'var(--module-primary)' }}
              className="w-full sm:w-auto"
            >
              Simpan Data JAD
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
