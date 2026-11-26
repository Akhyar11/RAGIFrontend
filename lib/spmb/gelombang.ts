/** Nama jalur yang dipetakan ke gelombang, dipisah koma; "Umum" bila gelombang tidak dipetakan ke jalur mana pun. */
export function formatJalurGelombang(gelombang: {
  daftar_jalur?: Array<{ nama: string }>;
  jalur_masuk?: { nama?: string } | null;
}): string {
  const names = (gelombang.daftar_jalur || []).map((jalur) => jalur.nama);
  if (names.length > 0) return names.join(', ');
  return gelombang.jalur_masuk?.nama || 'Umum';
}
