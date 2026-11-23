'use client';

import { useEffect, useState } from 'react';
import { Controller, useWatch, type Control, type FieldErrors, type FieldPath, type FieldValues } from 'react-hook-form';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Select, type SelectOption } from '@/components/ui/Select';
import { spmbReferenceService } from '@/services/spmb-reference.service';
import { isIndonesiaCountry } from '@/lib/spmb/applicant-identity';

type ResidenceFieldName = 'negara_domisili' | 'provinsi' | 'kota_kabupaten' | 'kecamatan' | 'kode_pos';

interface SpmbResidenceFieldsProps<T extends FieldValues> {
  control: Control<T>;
  setValue: (name: ResidenceFieldName, value: string) => void;
  errors: FieldErrors<T>;
  isWna: boolean;
}

export function SpmbResidenceFields<T extends FieldValues>({ control, setValue, errors, isWna }: SpmbResidenceFieldsProps<T>) {
  const provinceName = useWatch({ control, name: 'provinsi' as FieldPath<T> }) as string | undefined || '';
  const cityName = useWatch({ control, name: 'kota_kabupaten' as FieldPath<T> }) as string | undefined || '';
  const districtName = useWatch({ control, name: 'kecamatan' as FieldPath<T> }) as string | undefined || '';
  const selectedCountry = useWatch({ control, name: 'negara_domisili' as FieldPath<T> }) as string | undefined || '';
  const [previousWnaState, setPreviousWnaState] = useState(isWna);
  const [provinces, setProvinces] = useState<SelectOption[]>([]);
  const [regencyResult, setRegencyResult] = useState<{ parentId: string; options: SelectOption[] }>({ parentId: '', options: [] });
  const [districtResult, setDistrictResult] = useState<{ parentId: string; options: SelectOption[] }>({ parentId: '', options: [] });
  const [postalResult, setPostalResult] = useState<{ parentId: string; options: SelectOption[] }>({ parentId: '', options: [] });
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const provinceId = selectedProvinceId || String(
    provinces.find((option) => option.label.toLowerCase() === String(provinceName).toLowerCase())?.value || '',
  );
  const regencies = regencyResult.parentId === provinceId ? regencyResult.options : [];
  const districts = districtResult.parentId === selectedRegencyId ? districtResult.options : [];
  const postalCodes = postalResult.parentId === selectedDistrictId ? postalResult.options : [];

  if (previousWnaState !== isWna) {
    setPreviousWnaState(isWna);
    setSelectedProvinceId('');
    setSelectedRegencyId('');
    setSelectedDistrictId('');
  }

  useEffect(() => {
    spmbReferenceService.getProvinces().then(setProvinces).catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!provinceId) return;
    spmbReferenceService.getRegencies(provinceId).then((items) => {
      setRegencyResult({ parentId: provinceId, options: items });
      const matched = items.find((option) => option.label.toLowerCase() === String(cityName).toLowerCase());
      if (matched) setSelectedRegencyId(String(matched.value));
    }).catch(() => setRegencyResult({ parentId: provinceId, options: [] }));
  }, [cityName, provinceId]);

  useEffect(() => {
    if (!selectedRegencyId) return;
    spmbReferenceService.getDistricts(selectedRegencyId).then((items) => {
      setDistrictResult({ parentId: selectedRegencyId, options: items });
      const matched = items.find((option) => option.label.toLowerCase() === String(districtName).toLowerCase());
      if (matched) setSelectedDistrictId(String(matched.value));
    }).catch(() => setDistrictResult({ parentId: selectedRegencyId, options: [] }));
  }, [districtName, selectedRegencyId]);

  useEffect(() => {
    if (!selectedDistrictId) return;
    spmbReferenceService.getVillages(selectedDistrictId).then((villages) => {
      const uniquePostalCodes = new Map<string, string>();
      villages.forEach((village) => {
        if (village.postalCode && !uniquePostalCodes.has(village.postalCode)) {
          uniquePostalCodes.set(village.postalCode, village.postalCode);
        }
      });
      setPostalResult({
        parentId: selectedDistrictId,
        options: Array.from(uniquePostalCodes, ([value, label]) => ({ value, label })),
      });
    }).catch(() => setPostalResult({ parentId: selectedDistrictId, options: [] }));
  }, [selectedDistrictId]);

  return (
    <div className="space-y-4">
      {!isWna && <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller name={'negara_domisili' as FieldPath<T>} control={control} render={({ field }) => (
          <AsyncSelect
            label="Negara Domisili"
            required
            loadOptions={async (search) => (await spmbReferenceService.getCountries())
              .filter((country) => country.label.toLowerCase().includes(search.toLowerCase()))
              .map(({ label }) => ({ value: label, label }))}
            value={field.value}
            onChange={(option: { value: string } | null) => {
              field.onChange(option?.value || '');
              setSelectedProvinceId('');
              setSelectedRegencyId('');
              setSelectedDistrictId('');
              setValue('provinsi', '');
              setValue('kota_kabupaten', '');
              setValue('kecamatan', '');
              setValue('kode_pos', '');
            }}
            error={typeof errors.negara_domisili?.message === 'string' ? errors.negara_domisili.message : undefined}
          />
        )} />
      </div>}
      {!isWna && isIndonesiaCountry(selectedCountry) && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Controller name={'provinsi' as FieldPath<T>} control={control} render={({ field }) => (
            <Select
              label="Provinsi Domisili"
              required
              options={provinces}
              value={selectedProvinceId || provinces.find((item) => item.label === field.value)?.value}
              onChange={(value: string) => {
                const option = provinces.find((item) => String(item.value) === String(value));
                field.onChange(option?.label || '');
                setSelectedProvinceId(String(value || ''));
                setSelectedRegencyId('');
                setSelectedDistrictId('');
                setValue('kota_kabupaten', '');
                setValue('kecamatan', '');
                setValue('kode_pos', '');
              }}
              isDisabled={provinces.length === 0}
              error={typeof errors.provinsi?.message === 'string' ? errors.provinsi.message : undefined}
            />
          )} />
          <Controller name={'kota_kabupaten' as FieldPath<T>} control={control} render={({ field }) => (
            <Select
              label="Kabupaten / Kota"
              required
              options={regencies}
              value={selectedRegencyId || regencies.find((item) => item.label === field.value)?.value}
              onChange={(value: string) => {
                const option = regencies.find((item) => String(item.value) === String(value));
                field.onChange(option?.label || '');
                setSelectedRegencyId(String(value || ''));
                setSelectedDistrictId('');
                setValue('kecamatan', '');
                setValue('kode_pos', '');
              }}
              isDisabled={!selectedProvinceId}
              error={typeof errors.kota_kabupaten?.message === 'string' ? errors.kota_kabupaten.message : undefined}
            />
          )} />
          <Controller name={'kecamatan' as FieldPath<T>} control={control} render={({ field }) => (
            <Select
              label="Kecamatan"
              required
              options={districts}
              value={selectedDistrictId || districts.find((item) => item.label === field.value)?.value}
              onChange={(value: string) => {
                const option = districts.find((item) => String(item.value) === String(value));
                field.onChange(option?.label || '');
                setSelectedDistrictId(String(value || ''));
                setValue('kode_pos', '');
              }}
              isDisabled={!selectedRegencyId}
              error={typeof errors.kecamatan?.message === 'string' ? errors.kecamatan.message : undefined}
            />
          )} />
          <Controller name={'kode_pos' as FieldPath<T>} control={control} render={({ field }) => (
            <Select
              label="Kode Pos"
              options={postalCodes}
              value={field.value}
              onChange={field.onChange}
              isDisabled={!selectedDistrictId || postalCodes.length === 0}
              isClearable
              error={typeof errors.kode_pos?.message === 'string' ? errors.kode_pos.message : undefined}
            />
          )} />
        </div>
      )}
    </div>
  );
}
