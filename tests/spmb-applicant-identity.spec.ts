import { expect, test } from '@playwright/test';
import { validateApplicantIdentity } from '../lib/spmb/applicant-identity';

const baseInput = {
  nationalityCode: 'WNI',
  nik: '3201234567890001',
  passportNumber: '',
  passportIssuingCountry: '',
  citizenshipCountry: '',
  citizenshipCountryCode: '',
  residenceCountry: 'Indonesia',
  address: 'Jl. Merdeka No. 10',
  province: 'Jawa Tengah',
  city: 'Surakarta',
  district: 'Laweyan',
};

test('requires a 16 digit NIK for Indonesian nationals', () => {
  expect(validateApplicantIdentity({ ...baseInput, nik: '123' })).toHaveProperty('nik');
  expect(validateApplicantIdentity(baseInput)).not.toHaveProperty('nik');
});

test('requires passport and issuer country instead of NIK for foreign nationals', () => {
  const errors = validateApplicantIdentity({
    ...baseInput,
    nationalityCode: 'WNA',
    nik: '',
    passportNumber: '',
    passportIssuingCountry: '',
    citizenshipCountry: '',
    citizenshipCountryCode: '',
  });

  expect(errors).toHaveProperty('nomor_paspor');
  expect(errors).toHaveProperty('negara_penerbit_paspor');
  expect(errors).toHaveProperty('negara_kewarganegaraan');
  expect(errors).toHaveProperty('kode_negara_kewarganegaraan');
  expect(errors).not.toHaveProperty('nik');
});

test('allows an international address without Indonesian administrative regions', () => {
  expect(validateApplicantIdentity({
    ...baseInput,
    nationalityCode: 'WNA',
    nik: '',
    passportNumber: 'AB123456',
    passportIssuingCountry: 'Malaysia',
    citizenshipCountry: 'Malaysia',
    citizenshipCountryCode: 'MY',
    residenceCountry: 'Malaysia',
    province: '',
    city: '',
    district: '',
  })).toEqual({});
});

test('requires Indonesian regions when residence country is Indonesia', () => {
  const errors = validateApplicantIdentity({ ...baseInput, district: '' });
  expect(errors).toHaveProperty('kecamatan');
});