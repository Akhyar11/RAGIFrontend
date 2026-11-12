export interface ApplicantIdentityInput {
  nationalityCode: string;
  nik: string;
  passportNumber: string;
  passportIssuingCountry: string;
  citizenshipCountry: string;
  citizenshipCountryCode: string;
  residenceCountry: string;
  address: string;
  province: string;
  city: string;
  district: string;
}

export function isIndonesiaCountry(country: string): boolean {
  const normalized = country.trim().toLowerCase();
  return normalized === '' || normalized === 'id' || normalized === 'idn' || normalized === 'indonesia';
}

export function validateApplicantIdentity(input: ApplicantIdentityInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const nationality = input.nationalityCode.trim().toUpperCase();

  if (nationality === 'WNI') {
    if (!/^[0-9]{16}$/.test(input.nik.trim())) {
      errors.nik = 'NIK WNI wajib 16 digit angka.';
    }
  } else if (nationality === 'WNA') {
    if (input.nik.trim()) {
      errors.nik = 'WNA tidak menggunakan NIK. Kosongkan NIK dan isi data paspor.';
    }
    if (!input.passportNumber.trim()) {
      errors.nomor_paspor = 'Nomor paspor wajib diisi untuk WNA.';
    }
    if (!input.passportIssuingCountry.trim()) {
      errors.negara_penerbit_paspor = 'Negara penerbit paspor wajib diisi untuk WNA.';
    }
    if (!input.citizenshipCountry.trim()) {
      errors.negara_kewarganegaraan = 'Negara kewarganegaraan wajib diisi untuk WNA.';
    }
    if (!/^[A-Z]{2}$/.test(input.citizenshipCountryCode.trim().toUpperCase())) {
      errors.kode_negara_kewarganegaraan = 'Kode negara wajib 2 huruf ISO 3166-1 alpha-2.';
    }
  } else {
    errors.kewarganegaraan_id = 'Pilih kewarganegaraan.';
  }

  if (input.address.trim().length < 5) {
    errors.alamat = 'Alamat lengkap wajib diisi minimal 5 karakter.';
  }

  if (isIndonesiaCountry(input.residenceCountry)) {
    if (!input.province.trim()) errors.provinsi = 'Provinsi wajib diisi untuk domisili Indonesia.';
    if (!input.city.trim()) errors.kota_kabupaten = 'Kota/Kabupaten wajib diisi untuk domisili Indonesia.';
    if (!input.district.trim()) errors.kecamatan = 'Kecamatan wajib diisi untuk domisili Indonesia.';
  } else if (!input.residenceCountry.trim()) {
    errors.negara_domisili = 'Negara domisili wajib diisi.';
  }

  return errors;
}