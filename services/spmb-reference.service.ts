import axios from 'axios';
import api from '@/lib/axios';
import type { SelectOption } from '@/components/ui/Select';
import { buildCountryOptions } from '@/lib/spmb/countries';

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

let countryOptions: Array<SelectOption & { code: string }> | undefined;

async function getWilayah(path: string): Promise<WilayahRecord[]> {
  const response = await referenceApi.get<WilayahResponse>(`${WILAYAH_API_BASE}/${path}`);
  const payload = response.data;
  return Array.isArray(payload.data) ? payload.data : [];
}

type SchoolOption = SelectOption & { address?: string; type?: string; location?: string };

async function searchExternalSchools(search: string): Promise<SchoolOption[]> {
  const query = new URLSearchParams({ sekolah: search, page: '1', perPage: '20' });
  // API sekolah membalas 404 jika tidak ada hasil; itu bukan error, cukup kembalikan daftar kosong.
  const response = await referenceApi.get<SekolahResponse>(`${SEKOLAH_API_BASE}/sekolah/s?${query}`, {
    validateStatus: (status) => (status >= 200 && status < 300) || status === 404,
  });
  return (response.data.dataSekolah || []).map((school) => ({
    value: school.sekolah,
    label: school.sekolah,
    address: school.alamat_jalan,
    type: school.bentuk,
    location: [school.kabupaten_kota, school.propinsi].filter(Boolean).join(', '),
  }));
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

  getCountries: async (): Promise<Array<SelectOption & { code: string }>> => {
    countryOptions ||= buildCountryOptions();
    return countryOptions;
  },

  searchSchools: async (search: string): Promise<SchoolOption[]> => {
    const term = search.trim();
    const [local, external] = await Promise.all([
      api.get('/spmb/master-sekolah', { params: { search: term } })
        .then((res) => (res.data?.data || []) as Array<{ nama: string; alamat?: string | null; jenis?: string | null }>)
        .catch(() => []),
      searchExternalSchools(term).catch(() => [] as SchoolOption[]),
    ]);
    const localOptions: SchoolOption[] = local.map((school) => ({
      value: school.nama,
      label: school.nama,
      address: school.alamat || undefined,
      type: school.jenis || undefined,
      location: 'Ditambahkan manual',
    }));
    const seen = new Set(localOptions.map((option) => String(option.value).trim().toLowerCase()));
    return [...localOptions, ...external.filter((option) => !seen.has(String(option.value).trim().toLowerCase()))];
  },

  /** Simpan sekolah baru (hasil opsi Create) ke master sekolah. Idempoten di backend. */
  createSchool: async (nama: string, alamat?: string): Promise<{ created: boolean }> => {
    const response = await api.post('/spmb/master-sekolah', { nama, alamat: alamat || undefined });
    return { created: Boolean(response.data?.data?.created) };
  },
};
