'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { lmsService } from '@/services/lms.service';
import type { LmsQuizItem } from '@/types/lms.types';
import { Save, Info } from 'lucide-react';

const nilaiMkSchema = z.object({
  komponen_penilaian_id: z.string().optional().default(''),
  passing_score: z
    .string()
    .optional()
    .default('')
    .refine(
      (v) => v === '' || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100),
      'Ambang kelulusan harus berupa angka 0–100.'
    ),
});

type NilaiMkFormValues = z.infer<typeof nilaiMkSchema>;

interface KomponenObe {
  id: number;
  nama_komponen: string;
  bobot: number;
}

interface TryoutNilaiTabProps {
  quiz: LmsQuizItem;
  komponenObe: KomponenObe[];
  onChanged: () => void;
}

export default function TryoutNilaiTab({ quiz, komponenObe, onChanged }: TryoutNilaiTabProps) {
  const form = useForm<NilaiMkFormValues>({
    resolver: zodResolver(nilaiMkSchema) as any,
    defaultValues: { komponen_penilaian_id: '', passing_score: '' },
  });

  useEffect(() => {
    form.reset({
      komponen_penilaian_id: quiz.komponen_penilaian_id ? String(quiz.komponen_penilaian_id) : '',
      passing_score:
        quiz.passing_score !== null && quiz.passing_score !== undefined ? String(Number(quiz.passing_score)) : '',
    });
  }, [quiz, form]);

  const onSubmit = async (values: NilaiMkFormValues) => {
    try {
      await lmsService.updateQuiz(quiz.id, {
        komponen_penilaian_id: values.komponen_penilaian_id ? Number(values.komponen_penilaian_id) : null,
        passing_score: values.passing_score && values.passing_score.trim() !== '' ? Number(values.passing_score) : null,
      } as any);
      toast.success('Komponen penilaian tersimpan');
      onChanged();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan komponen penilaian');
    }
  };

  const aktif = komponenObe.find((k) => k.id === quiz.komponen_penilaian_id);

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Jadikan Nilai ke Mata Kuliah</h5>
        <div className="flex items-center gap-2 flex-wrap">
          {quiz.passing_score !== null && quiz.passing_score !== undefined ? (
            <Badge variant="blue">Ambang lulus: {Number(quiz.passing_score).toFixed(2)}</Badge>
          ) : (
            <Badge variant="gray">Tanpa ambang kelulusan</Badge>
          )}
          {aktif ? (
            <Badge variant="green">{aktif.nama_komponen} • {aktif.bobot}%</Badge>
          ) : (
            <Badge variant="gray">Belum ditautkan</Badge>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-2xs text-slate-600">
        <Info size={16} className="shrink-0 mt-0.5 text-slate-400" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-700">Fleksibilitas Penilaian OBE vs Latihan Mandiri:</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600">
            <li>
              <strong>Untuk Nilai Resmi (Mini Quiz / Tugas / UTS / UAS):</strong> Pilih komponen penilaian OBE di bawah ini. Nilai pengerjaan mahasiswa akan otomatis disinkronkan ke rekap penilaian akademik & ketercapaian CPL prodi.
            </li>
            <li>
              <strong>Untuk Tryout / Latihan Mandiri (Tanpa Masuk Nilai):</strong> Kosongkan komponen OBE (pilih &quot;Hanya Latihan Mandiri (Tanpa Sinkron OBE)&quot;). Mahasiswa tetap bisa mengerjakan dan melihat hasil evaluasi tanpa mempengaruhi nilai akhir mata kuliah.
            </li>
          </ul>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <Controller
          name="komponen_penilaian_id"
          control={form.control}
          render={({ field }) => (
            <Select
              label="Komponen Penilaian OBE (Sinkronisasi Nilai)"
              placeholder="Pilih komponen... (kosongkan = hanya latihan)"
              value={field.value}
              onChange={field.onChange}
              options={komponenObe.map((k) => ({ value: String(k.id), label: `${k.nama_komponen} • ${k.bobot}% (Sinkron OBE)` }))}
              isClearable
              isDisabled={komponenObe.length === 0}
              hint={komponenObe.length === 0 ? 'Belum ada komponen OBE pada kelas ini.' : 'Kosongkan jika hanya untuk tryout / simulasi latihan mandiri.'}
              error={form.formState.errors.komponen_penilaian_id?.message}
            />
          )}
        />
        <Controller
          name="passing_score"
          control={form.control}
          render={({ field }) => (
            <Input
              label="Ambang Kelulusan (0–100)"
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="cth: 60 (kosongkan = tanpa ambang)"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              hint="Dipakai untuk badge Lulus/Tidak Lulus pada tab Hasil."
              error={form.formState.errors.passing_score?.message}
            />
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={form.formState.isSubmitting}
            disabled={form.formState.isSubmitting}
            icon={<Save size={16} />}
          >
            Simpan
          </Button>
        </div>
      </form>
    </div>
  );
}
