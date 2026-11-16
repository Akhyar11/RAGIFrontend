export type EvidenceType = 'arsip' | 'upload';

export const EVIDENCE_TYPE_OPTIONS: { value: EvidenceType; label: string }[] = [
  { value: 'arsip', label: 'Nomor SK dari Arsip' },
  { value: 'upload', label: 'Unggah Dokumen Pendukung' },
];