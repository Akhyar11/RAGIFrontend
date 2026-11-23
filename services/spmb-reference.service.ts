import axios from 'axios';
import type { SelectOption } from '@/components/ui/Select';

const WILAYAH_API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/v2';
const SEKOLAH_API_BASE = 'https://api-sekolah-indonesia.vercel.app';
const referenceApi = axios.create({ timeout: 15000 });

interface WilayahRecord {
  id: string;
  name: string;
  postal_code?: string;
}

interface WilayahResponse {
  data: WilayahRecord[];
}

interface SekolahRecord {
  sekolah: string;
  alamat_jalan?: string;
  bentuk?: string;
  propinsi?: string;
  kabupaten_kota?: string;
}

interface SekolahResponse {
  status: string;
  dataSekolah?: SekolahRecord[];
}

interface CountryRecord {
  cca2: string;
  name: { common: string };
}

let countriesPromise: Promise<Array<SelectOption & { code: string }>> | undefined;

async function getWilayah(path: string): Promise<WilayahRecord[]> {
  const response = await referenceApi.get<WilayahResponse>(`${WILAYAH_API_BASE}/${path}`);
  const payload = response.data;
  return Array.isArray(payload.data) ? payload.data : [];
}

export const spmbReferenceService = {
  getProvinces: async (): Promise<SelectOption[]> => (await getWilayah('provinces.json'))
    .map(({ id, name }) => ({ value: id, label: name })),

  getRegencies: async (provinceId: string): Promise<SelectOption[]> => {
    if (!provinceId) return [];
    return (await getWilayah(`regencies/${encodeURIComponent(provinceId)}.json`))
      .map(({ id, name }) => ({ value: id, label: name }));
  },

  getDistricts: async (regencyId: string): Promise<SelectOption[]> => {
    if (!regencyId) return [];
    return (await getWilayah(`districts/${encodeURIComponent(regencyId)}.json`))
      .map(({ id, name }) => ({ value: id, label: name }));
  },

  getVillages: async (districtId: string): Promise<Array<SelectOption & { postalCode: string }>> => {
    if (!districtId) return [];
    return (await getWilayah(`villages/${encodeURIComponent(districtId)}.json`))
      .map(({ id, name, postal_code }) => ({ value: id, label: name, postalCode: postal_code || '' }));
  },

  getCountries: (): Promise<Array<SelectOption & { code: string }>> => {
    countriesPromise ||= referenceApi.get<CountryRecord[]>(
      'https://restcountries.com/v3.1/all?fields=cca2,name',
    ).then(({ data }) => data
      .map((country) => ({ value: country.cca2, label: country.name.common, code: country.cca2 }))
      .sort((first, second) => first.label.localeCompare(second.label, 'id')));
    return countriesPromise;
  },

  searchSchools: async (search: string): Promise<SelectOption[]> => {
    const query = new URLSearchParams({ sekolah: search.trim(), page: '1', perPage: '20' });
    const response = await referenceApi.get<SekolahResponse>(`${SEKOLAH_API_BASE}/sekolah/s?${query}`);
    const payload = response.data;
    return (payload.dataSekolah || []).map((school) => ({
      value: school.sekolah,
      label: school.sekolah,
      address: school.alamat_jalan,
      type: school.bentuk,
      location: [school.kabupaten_kota, school.propinsi].filter(Boolean).join(', '),
    }));
  },
};