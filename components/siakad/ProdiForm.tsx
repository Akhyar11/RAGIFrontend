'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { SIAKAD_OPTION_TYPES, useSiakadOptions } from '@/lib/siakad-options';
import { siakadService } from '@/services/siakad.service';

const baseProdiSchema = z.object({
  fakultas_id: z.number().nullable(),
  kaprodi_id: z.number().nullable().optional(),
  kode_prodi: z.string().min(1, 'Kode prodi wajib diisi').max(20, 'Kode maksimal 20 karakter'),
  kode_prodi_dikti: z.string().max(20, 'Kode DIKTI maksimal 20 karakter').optional().or(z.literal('')),
  nama: z.string().min(3, 'Nama prodi minimal 3 karakter').max(255, 'Nama maksimal 255 karakter'),
  jenjang: z.string().min(1, 'Jenjang wajib dipilih'),
  akreditasi: z.string().optional().or(z.literal('')),
  is_active: z.boolean().optional(),
});

const createProdiSchema = baseProdiSchema.extend({
  fakultas_id: z.number({ error: 'Fakultas induk wajib dipilih' }).min(1, 'Fakultas induk wajib dipilih'),
});

const editProdiSchema = baseProdiSchema;

const PRODI_ACTIVE_OPTIONS = [
  { value: 'true', label: 'Aktif' },
  { value: 'false', label: 'Nonaktif' },
];

export type ProdiFormValues = z.infer<typeof baseProdiSchema>;

interface ProdiFormProps {
  fakultasOptions: { value: number; label: string }[];
  defaultValues?: Partial<ProdiFormValues> & { kaprodiOption?: { value: number; label: string } | null };
  onSubmit: (values: ProdiFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isEditing?: boolean;
}

const loadKaprodiOptions = async (keyword: string) => {
  const res = await siakadService.getDosens({ per_page: 50, search: keyword || undefined });
  const list: any[] = res.data || [];
  const q = keyword.toLowerCase();
  return list
    .filter((d: any) => (!keyword ? true : d.nama_lengkap?.toLowerCase().includes(q) || d.nidn?.includes(keyword)))
    .map((d: any) => ({
      value: d.id,
      label: `${d.nama_lengkap} — NIDN ${d.nidn || '-'}`,
    }));
};

export function ProdiForm({ fakultasOptions, defaultValues, onSubmit, onCancel, submitLabel = 'Simpan Program Studi', isEditing = false }: ProdiFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProdiFormValues>({
    resolver: zodResolver(isEditing ? editProdiSchema : createProdiSchema),
    defaultValues: {
      fakultas_id: isEditing ? null : 0,
      kaprodi_id: null,
      kode_prodi: '',
      kode_prodi_dikti: '',
      nama: '',
      jenjang: '',
      akreditasi: '',
      is_active: true,
      ...defaultValues,
    },
  });

  const jenjangOptions = useSiakadOptions(SIAKAD_OPTION_TYPES.JENJANG);
  const akreditasiOptions = useSiakadOptions(SIAKAD_OPTION_TYPES.AKREDITASI);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Controller
          name="fakultas_id"
          control={control}
          render={({ field }) => (
            <Select
              label="Fakultas Induk"
              required={!isEditing}
              placeholder="Pilih fakultas..."
              options={fakultasOptions}
              value={field.value ?? ''}
              onChange={(val: any) => field.onChange(val ? Number(val) : null)}
              isClearable={isEditing}
              error={errors.fakultas_id?.message}
              hint={isEditing ? 'Kosongkan jika fakultas belum dipetakan.' : undefined}
            />
          )}
        />
        <Controller
          name="jenjang"
          control={control}
          render={({ field }) => (
            <Select
              label="Jenjang Pendidikan"
              required
              options={jenjangOptions}
              value={field.value || ''}
              onChange={(val: any) => field.onChange(val)}
              error={errors.jenjang?.message}
            />
          )}
        />
        <Input label="Kode Prodi Internal" required placeholder="cth. IF" error={errors.kode_prodi?.message} {...register('kode_prodi')} />
        <Input label="Kode Prodi PDDIKTI" placeholder="cth. 55201" error={errors.kode_prodi_dikti?.message} {...register('kode_prodi_dikti')} />
        <div className="md:col-span-2">
          <Input label="Nama Program Studi" required placeholder="cth. Teknik Informatika" error={errors.nama?.message} {...register('nama')} />
        </div>
        <Controller
          name="kaprodi_id"
          control={control}
          render={({ field }) => (
            <AsyncSelect
              label="Ketua Program Studi (Kaprodi)"
              placeholder="Cari nama / NIDN dosen..."
              loadOptions={loadKaprodiOptions}
              defaultOptions={defaultValues?.kaprodiOption ? [defaultValues.kaprodiOption] : true}
              value={field.value || null}
              onChange={(opt: any) => field.onChange(opt?.value ? Number(opt.value) : null)}
              isClearable
              error={errors.kaprodi_id?.message}
            />
          )}
        />
        <Controller
          name="akreditasi"
          control={control}
          render={({ field }) => (
            <Select
              label="Peringkat Akreditasi"
              placeholder="Pilih peringkat..."
              options={akreditasiOptions}
              value={field.value || ''}
              onChange={(val: any) => field.onChange(val)}
              isClearable
              error={errors.akreditasi?.message}
            />
          )}
        />
        {isEditing && (
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Select
                label="Status Program Studi"
                value={field.value === false ? 'false' : 'true'}
                onChange={(value: any) => field.onChange(value === 'true')}
                options={PRODI_ACTIVE_OPTIONS}
                error={errors.is_active?.message}
              />
            )}
          />
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
