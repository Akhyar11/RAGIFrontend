'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, CheckCircle2, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Button } from '@/components/ui/Button';
import { getApiErrorMessage } from '@/lib/utils';
import { spmbAdminMappingSchema } from '@/lib/validations/spmb-admin-mapping';
import { systemSettingService } from '@/services/system-setting.service';
import type { SpmbAdminMappingPayload, SpmbAdminUser } from '@/types/system-setting.types';

interface UserChoice {
  value: number;
  label: string;
  isDisabled?: boolean;
}

function userChoice(user: SpmbAdminUser): UserChoice {
  return {
    value: user.id,
    label: `${user.name || user.username} (${user.email || user.username})${user.is_active ? '' : ' — nonaktif'}`,
    isDisabled: !user.is_active,
  };
}

export function SpmbAdminNotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [options, setOptions] = useState<UserChoice[]>([]);
  const [initialIds, setInitialIds] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);
  const { control, reset, handleSubmit, setError, formState: { errors, isDirty, isSubmitting } } = useForm<SpmbAdminMappingPayload>({
    resolver: zodResolver(spmbAdminMappingSchema), defaultValues: { user_ids: [] },
  });

  useEffect(() => {
    let current = true;
    Promise.all([systemSettingService.getSpmbAdminMapping(), systemSettingService.getSpmbAdminOptions()])
      .then(([mapping, response]) => {
        if (!current) return;
        const users = new Map([...(response.data ?? []), ...mapping.users].map((user) => [user.id, user]));
        const choices = Array.from(users.values()).map(userChoice);
        for (const id of mapping.user_ids) {
          if (!users.has(id)) choices.push({ value: id, label: `Akun tidak tersedia (${id})`, isDisabled: true });
        }
        setOptions(choices);
        setInitialIds(mapping.user_ids);
        reset({ user_ids: mapping.user_ids });
      })
      .catch((error: unknown) => {
        if (current) setLoadError(getApiErrorMessage(error, 'Gagal memuat mapping admin SPMB.'));
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [reset]);

  const loadOptions = async (search: string): Promise<UserChoice[]> => {
    try {
      const response = await systemSettingService.getSpmbAdminOptions({ search, per_page: 25 });
      return (response.data ?? []).map(userChoice);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Gagal mencari akun penerima.'));
      throw error;
    }
  };

  const save = handleSubmit(async (values) => {
    try {
      const mapping = await systemSettingService.saveSpmbAdminMapping(values);
      setInitialIds(mapping.user_ids);
      reset({ user_ids: mapping.user_ids });
      setSaved(true);
      toast.success('Mapping admin SPMB berhasil disimpan.');
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Gagal menyimpan mapping admin SPMB.');
      setError('user_ids', { message });
      toast.error(message);
    }
  });

  return (
    <section className="settings-section-card card" aria-labelledby="spmb-admin-mapping-title">
      <div className="settings-section-header">
        <div className="settings-section-icon" style={{ backgroundColor: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}><Bell size={18} /></div>
        <div className="settings-section-title-group">
          <h2 id="spmb-admin-mapping-title" className="settings-section-title">Admin SPMB</h2>
          <p className="settings-section-desc">Pilih akun penerima notifikasi sistem dan email untuk proses pendaftaran SPMB.</p>
        </div>
      </div>
      <div className="settings-section-divider" />
      <form noValidate onSubmit={save}>
        <div className="settings-section-body">
          {loading ? <div className="settings-loading"><Loader2 size={20} className="animate-spin" /><span>Memuat mapping admin SPMB...</span></div>
            : loadError ? <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{loadError}</p>
              : <Controller name="user_ids" control={control} render={({ field }) => (
                <AsyncSelect id="spmb-admin-recipients" label="Penerima notifikasi admin SPMB" isMulti isClearable
                  loadOptions={loadOptions} defaultOptions={options} value={field.value}
                  onChange={(choices: UserChoice[] | null) => field.onChange((choices ?? []).map((choice) => choice.value))}
                  isDisabled={isSubmitting} error={errors.user_ids?.message}
                  placeholder="Cari nama, username, atau email akun..."
                  hint="Kosongkan untuk menonaktifkan notifikasi admin. Mapping ini tidak mengubah hak akses akun. Akun nonaktif dilewati saat pengiriman." />
              )} />}
        </div>
        <div className="settings-section-footer">
          <div className="settings-footer-left">
            {isDirty ? <span className="settings-unsaved-hint">Ada perubahan belum disimpan</span>
              : saved && <span className="settings-save-success"><CheckCircle2 size={14} />Perubahan berhasil disimpan</span>}
          </div>
          <div className="settings-footer-actions">
            {isDirty && <Button type="button" variant="ghost" size="sm" disabled={isSubmitting} onClick={() => reset({ user_ids: initialIds })}>Batalkan</Button>}
            <Button type="submit" size="sm" icon={<Save size={14} />} loading={isSubmitting}
              disabled={loading || !!loadError || !isDirty || isSubmitting}>Simpan Mapping Admin SPMB</Button>
          </div>
        </div>
      </form>
    </section>
  );
}
