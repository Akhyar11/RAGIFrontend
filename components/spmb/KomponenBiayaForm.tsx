'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Plus, Trash2, Gift, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { SpmbPaymentGatewaySelect } from '@/components/spmb/SpmbPaymentGatewaySelect';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { spmbService } from '@/services/spmb.service';
import type { MasterKomponenBiaya } from '@/types/spmb.types';

const schema = z
  .object({
    kode: z.string().max(50, 'Kode komponen maksimal 50 karakter').optional().or(z.literal('')),
    nama: z.string().min(1, 'Nama komponen biaya wajib diisi').max(150, 'Nama komponen maksimal 150 karakter'),
    kategori: z.string().min(1, 'Kategori komponen biaya wajib diisi').max(50, 'Kategori maksimal 50 karakter'),
    payment_gateway_config_id: z.number().int('Kanal pembayaran tidak valid.').positive('Kanal pembayaran tidak valid.').nullable().optional(),
    tipe_potongan: z.boolean(),
    is_active: z.boolean(),
    is_referral_reward: z.boolean(),
    is_default_master_biaya: z.boolean(),
    role_rewards: z
      .array(
        z.object({
          role_id: z.number().int().positive('Role wajib dipilih'),
          nominal: z.number().min(0, 'Nominal minimal 0'),
        })
      )
      .optional(),
    keterangan: z.string().max(255, 'Keterangan maksimal 255 karakter').optional().or(z.literal('')),
  })
  .superRefine((val, ctx) => {
    if (val.is_referral_reward && (!val.role_rewards || val.role_rewards.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role_rewards'],
        message: 'Tambahkan minimal satu pemetaan role reward.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface KomponenBiayaFormProps {
  mode: 'create' | 'edit';
  komponenId?: number;
  initial?: MasterKomponenBiaya | null;
}

export function KomponenBiayaForm({ mode, komponenId, initial }: KomponenBiayaFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [existingComponents, setExistingComponents] = useState<MasterKomponenBiaya[]>([]);
  const [positionType, setPositionType] = useState<'keep' | 'start' | 'end' | 'after' | 'before'>(
    mode === 'edit' ? 'keep' : 'end'
  );
  const [referenceId, setReferenceId] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kode: '',
      nama: '',
      kategori: 'Daftar Ulang',
      payment_gateway_config_id: null,
      tipe_potongan: false,
      is_active: true,
      is_referral_reward: false,
      is_default_master_biaya: false,
      role_rewards: [],
      keterangan: '',
    },
  });

  const { fields: rewardFields, append: appendReward, remove: removeReward } = useFieldArray({
    control,
    name: 'role_rewards',
  });
  const isReferralReward = watch('is_referral_reward');

  useEffect(() => {
    if (initial) {
      reset({
        kode: initial.kode || '',
        nama: initial.nama || '',
        kategori: initial.kategori || 'Daftar Ulang',
        payment_gateway_config_id: initial.payment_gateway_config_id ?? null,
        tipe_potongan: Boolean(initial.tipe_potongan),
        is_active: Boolean(initial.is_active),
        is_referral_reward: Boolean(initial.is_referral_reward),
        is_default_master_biaya: Boolean(initial.is_default_master_biaya),
        role_rewards: (initial.role_rewards || []).map((r) => ({
          role_id: Number(r.role_id),
          nominal: Number(r.nominal),
        })),
        keterangan: initial.keterangan || '',
      });
    }
  }, [initial, reset]);

  useEffect(() => {
    spmbService
      .getKomponenBiayaList({ limit: 100, sort_by: 'urutan', sort_order: 'asc' })
      .then((res) => setExistingComponents(res.data || []))
      .catch(() => setExistingComponents([]));
  }, []);

  const loadRoleOptions = async (input: string) => {
    const res = await spmbService.getKomponenBiayaRoleOptions({ search: input || undefined, per_page: 100 });
    const items = res?.data || [];
    return items.map((r) => ({ value: String(r.id), label: r.name }));
  };

  const otherComponents = existingComponents.filter((c) => c.id !== komponenId);

  const onSubmit = async (values: FormValues) => {
    if ((positionType === 'after' || positionType === 'before') && !referenceId) {
      toast.error('Silakan pilih komponen acuan posisi');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        kode: values.kode?.trim() || undefined,
        nama: values.nama.trim(),
        kategori: values.kategori.trim(),
        payment_gateway_config_id: values.payment_gateway_config_id ?? null,
        tipe_potongan: values.tipe_potongan,
        is_active: values.is_active,
        is_referral_reward: values.is_referral_reward,
        is_default_master_biaya: values.is_default_master_biaya,
        role_rewards: values.is_referral_reward
          ? (values.role_rewards || []).map((r) => ({ role_id: Number(r.role_id), nominal: Number(r.nominal) }))
          : [],
        keterangan: values.keterangan?.trim() || undefined,
        position_type: positionType,
        reference_id: referenceId ? Number(referenceId) : undefined,
      };

      if (mode === 'edit' && komponenId) {
        await spmbService.updateKomponenBiaya(komponenId, payload);
        toast.success('Komponen biaya berhasil diperbarui');
      } else {
        await spmbService.createKomponenBiaya(payload);
        toast.success('Komponen biaya berhasil ditambahkan');
      }
      router.push('/spmb/master/komponen-biaya');
    } catch (err: unknown) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error?.response?.data?.message || error.message || 'Gagal menyimpan komponen biaya');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title={mode === 'edit' ? 'Edit Komponen Biaya' : 'Tambah Komponen Biaya'}
        description="Kelola komponen biaya, posisi urutan, dan pemetaan reward referral."
        action={
          <Button
            variant="outline"
            icon={<ArrowLeft size={16} />}
            style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
            onClick={() => router.push('/spmb/master/komponen-biaya')}
          >
            Kembali
          </Button>
        }
      />

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Kode Komponen"
                placeholder="Contoh: PENDAFTARAN, DPI, SERAGAM"
                hint="Kode unik untuk komponen ini."
                error={errors.kode?.message}
                {...register('kode')}
              />

              <Input
                label="Nama Komponen Biaya"
                placeholder="Contoh: Dana Pengembangan Institusi (DPI)"
                required
                hint="Nama lengkap komponen biaya atau tagihan."
                error={errors.nama?.message}
                {...register('nama')}
              />

              <Input
                label="Kategori / Kelompok Biaya"
                placeholder="Contoh: Pendaftaran, Daftar Ulang, UKT, Seragam"
                required
                hint="Tahapan pengelompokan biaya."
                error={errors.kategori?.message}
                {...register('kategori')}
              />

              <Controller name="payment_gateway_config_id" control={control} render={({ field }) => (
                <SpmbPaymentGatewaySelect value={field.value} initial={initial?.payment_gateway} onChange={field.onChange}
                  error={errors.payment_gateway_config_id?.message} disabled={submitting} />
              )} />

              <Select
                label="Posisi Urutan Tampil"
                value={positionType}
                onChange={(val) => {
                  setPositionType(val as 'keep' | 'start' | 'end' | 'after' | 'before');
                  if (val === 'keep' || val === 'end' || val === 'start') {
                    setReferenceId('');
                  }
                }}
                options={[
                  ...(mode === 'edit' ? [{ value: 'keep', label: 'Tetap di Posisi Saat Ini' }] : []),
                  { value: 'start', label: 'Pindah ke Paling Awal (Urutan ke-1)' },
                  { value: 'end', label: 'Pindah ke Paling Akhir' },
                  { value: 'after', label: 'Pindah Setelah Komponen...' },
                  { value: 'before', label: 'Pindah Sebelum Komponen...' },
                ]}
              />

              {(positionType === 'after' || positionType === 'before') && (
                <Select
                  label="Pilih Komponen Acuan"
                  value={referenceId}
                  onChange={(val) => setReferenceId(val)}
                  options={[
                    { value: '', label: '-- Pilih Komponen Acuan --' },
                    ...otherComponents.map((c) => ({
                      value: String(c.id),
                      label: `#${c.urutan} - ${c.nama} (${c.kode || 'Tanpa Kode'})`,
                    })),
                  ]}
                />
              )}

              <div className="md:col-span-2 lg:col-span-3">
                <Textarea
                  label="Keterangan"
                  placeholder="Catatan tambahan, contoh: Khusus untuk mahasiswa baru program sarjana dan diploma"
                  hint="Opsional, informasi tambahan mengenai komponen biaya ini."
                  error={errors.keterangan?.message}
                  rows={3}
                  {...register('keterangan')}
                />
              </div>

              <Checkbox
                label="Tipe Komponen Potongan"
                hint="Aktifkan jika komponen ini mengurangi tagihan (diskon / beasiswa)."
                {...register('tipe_potongan')}
              />

              <Checkbox
                label="Status Aktif (Komponen ini digunakan)"
                hint="Komponen aktif dapat dipilih pada master biaya SPMB."
                {...register('is_active')}
              />

              <Checkbox
                label="Dipakai Default di Master Biaya SPMB"
                hint="Jika aktif, komponen ini otomatis dimuat saat menambah Master Biaya SPMB (per tipe jalur masuk + prodi)."
                {...register('is_default_master_biaya')}
              />

              <Checkbox
                label="Jadikan Komponen Reward Referral"
                hint="Jika aktif, referrer dengan role di bawah menerima nominal ini per referral yang lolos."
                {...register('is_referral_reward')}
              />
            </div>

            {isReferralReward && (
              <div className="space-y-4 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Gift size={16} style={{ color: 'var(--module-primary)' }} /> Nominal Reward per Role
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus size={16} />}
                    style={{ borderColor: 'var(--module-primary)', color: 'var(--module-primary)' }}
                    onClick={() => appendReward({ role_id: 0, nominal: 0 })}
                  >
                    Tambah Role
                  </Button>
                </div>

                {errors.role_rewards?.root?.message && (
                  <p className="form-error">{errors.role_rewards.root.message}</p>
                )}

                {rewardFields.length === 0 && (
                  <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                    <Info size={16} className="shrink-0" style={{ color: 'var(--module-primary)' }} />
                    <span>Belum ada role. Klik &quot;Tambah Role&quot; untuk memetakan nominal reward.</span>
                  </div>
                )}

                {rewardFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Controller
                      control={control}
                      name={`role_rewards.${index}.role_id`}
                      render={({ field: roleField }) => (
                        <AsyncSelect
                          label="Role Referrer"
                          placeholder="Pilih Role"
                          isClearable
                          defaultOptions
                          loadOptions={loadRoleOptions}
                          value={roleField.value ? String(roleField.value) : null}
                          error={errors.role_rewards?.[index]?.role_id?.message}
                          onChange={(sel: { value?: string } | null) =>
                            roleField.onChange(sel?.value ? Number(sel.value) : undefined)
                          }
                        />
                      )}
                    />
                    <Input
                      label="Nominal Reward (Rp)"
                      type="number"
                      min={0}
                      placeholder="Contoh: 50000"
                      error={errors.role_rewards?.[index]?.nominal?.message}
                      {...register(`role_rewards.${index}.nominal`, { valueAsNumber: true })}
                    />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        icon={<Trash2 size={16} className="text-red-500" />}
                        onClick={() => removeReward(index)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push('/spmb/master/komponen-biaya')}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" loading={submitting} disabled={submitting} icon={<Save size={16} />}>
                Simpan
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
