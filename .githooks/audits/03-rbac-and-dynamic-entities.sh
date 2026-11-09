#!/bin/bash
# ==============================================================================
# AUDIT 03 (FE): RBAC & Dynamic Entity Reference Standard (Unified AI Reviewer)
# ==============================================================================
# Memeriksa:
# 1. Zero Hardcode Policy: Dilarang array literal statis untuk data master/relasi
#    (wajib referensi ID entitas dinamis dari database via API)
# 2. RBAC Policy: Pengecekan izin/role murni, dilarang atribut statis 'user_type'
# ==============================================================================

echo "🛡️ [Audit 3/3: RBAC & Dynamic Entities] Memeriksa kebijakan Zero Hardcode & RBAC frontend dengan AI (Big Pickle)..."

export PATH="$HOME/.local/bin:$HOME/.opencode/bin:/usr/local/bin:$PATH"
AI_ENGINE="opencode"
OPENCODE_BIN=$(command -v opencode || echo "$HOME/.opencode/bin/opencode")
MODEL="${OPENCODE_MODEL:-opencode/big-pickle}"

if [ -n "$DIFF_TARGET" ]; then
    STAGED_DIFF=$(git diff "$DIFF_TARGET" -- "app/**" "components/**" "services/**" "types/**")
else
    STAGED_DIFF=$(git diff --cached -- "app/**" "components/**" "services/**" "types/**")
fi

if [ -z "$STAGED_DIFF" ]; then
    echo "ℹ️ [Audit 3/3] Tidak ada perubahan kode yang diuji. Skip."
    exit 0
fi

if [ ${#STAGED_DIFF} -gt 100000 ]; then
    STAGED_DIFF="${STAGED_DIFF:0:100000}"$'\n\n[CATATAN: diff dipotong pada 100.000 karakter. Nilai HANYA yang terlihat di atas; JANGAN mengarang pelanggaran pada file yang tidak tampak.]'
fi

# ------------------------------------------------------------------------------
# 1. DETERMINISTIC STATIC CHECK (Fast Fail sebelum AI)
# ------------------------------------------------------------------------------
STATIC_FAIL=0
ADDED_LINES=$(echo "$STAGED_DIFF" | grep '^+[^+]')

# A. Deteksi hardcode userRoles.includes atau roles.includes
if echo "$ADDED_LINES" | grep -E '(userRoles|roles)\.includes\(' > /dev/null; then
    echo "❌ [Audit 3/3 STATIC REJECT] Terdeteksi penggunaan hardcode 'userRoles.includes(...)' atau 'roles.includes(...)'."
    echo "   Gunakan helper resmi useAuth(): hasRole('...'), hasPermission('...'), atau isSuperAdmin."
    STATIC_FAIL=1
fi

# B. Deteksi phantom role atau jabatan struktural sebagai role string
if echo "$ADDED_LINES" | grep -E "['\"](admin_obe|kaprodi|wakil_prodi|sekprodi|dekan)['\"]" > /dev/null; then
    echo "❌ [Audit 3/3 STATIC REJECT] Terdeteksi string phantom role atau jabatan struktural sebagai role IAM ('admin_obe', 'kaprodi', 'wakil_prodi', 'sekprodi', 'dekan')."
    echo "   Jabatan struktural dan hak kelola OBE WAJIB diperiksa melalui penugasan akun dinamis (misal: isAdminObe dari user.siakad_admin_prodis, can_approve_rps) atau permission granular, BUKAN string role."
    STATIC_FAIL=1
fi

# C. Deteksi blacklist/whitelist array role statis & prop allowedRoles
if echo "$ADDED_LINES" | grep -E "(\[.*['\"][a-zA-Z0-9_]+['\"].*\]\.(includes|filter|some)|allowedRoles)" > /dev/null; then
    echo "❌ [Audit 3/3 STATIC REJECT] Terdeteksi array literal role statis (whitelist/blacklist) atau penggunaan prop 'allowedRoles'."
    echo "   Dilarang hardcode array role baik untuk inklusi maupun eksklusi. Gunakan permission granular atau penugasan akun dinamis."
    STATIC_FAIL=1
fi

if [ $STATIC_FAIL -ne 0 ]; then
    echo "💡 Harap perbaiki seluruh pelanggaran statis di atas sebelum melakukan commit."
    exit 1
fi

PROMPT_FILE=$(mktemp)

cat << 'EOF' > "$PROMPT_FILE"
Kamu adalah Senior Frontend Security & Data Architecture Reviewer (Big Pickle).
Tugasmu adalah memeriksa FULL Git Diff frontend berikut secara SANGAT KETAT terhadap Kebijakan Zero Hardcode dan Sistem RBAC.
Evaluasi HANYA baris baru (+) yang ditambahkan atau diubah. Abaikan baris konteks tanpa tanda (+).

================================ STANDAR INTI EVALUASI ================================

1. KEBIJAKAN ZERO HARDCODE & DYNAMIC ENTITY REFERENCE:
   - DILARANG KERAS array literal statis untuk options pada komponen dropdown/select yang merujuk pada entitas master (misal: prodi, jalur, gelombang, jenjang, role, unit kerja, dll).
   - Opsi untuk tabel master database WAJIB diambil secara dinamis via API (menggunakan `<AsyncSelect />` atau fetch API).
   - Pengecualian sah: Hanya untuk closed-set domain tetap yang tidak memiliki tabel master (misal: jenis kelamin 'L'/'P', agama) yang dideklarasikan terpusat.
   - Referensi query, filter, dan relasi WAJIB menggunakan ID entitas database (`module_id`, `jalur_id`, dll), bukan label string hardcode.

2. KEBIJAKAN ROLE-BASED ACCESS CONTROL (RBAC) & LARANGAN KERAS ARRAY ROLE STATIS:
   - Seluruh otorisasi frontend WAJIB memeriksa permission granular atau role resmi dari sistem IAM menggunakan helper dari `useAuth()` (misal: `hasPermission('...')` atau `hasRole('...')`).
   - DILARANG KERAS array literal statis berisi nama role/jabatan (misal `['admin_siakad', 'admin', ...]`), baik untuk whitelist, blacklist, filter (misal: `!['...'].includes(...)`), maupun prop `allowedRoles`.
   - DILARANG KERAS menggunakan `userRoles.includes(...)`, `roles.includes(...)`, atau ekstraksi array role manual untuk mengecek hak akses:
     * DILARANG mengecek phantom role yang tidak terdaftar di database IAM (contoh pelanggaran: `userRoles.includes('admin_obe')` atau string `'admin_obe'`).
     * DILARANG KERAS memperlakukan jabatan struktural (seperti `kaprodi`, `wakil_prodi`, `sekprodi`, `dekan`) sebagai role string IAM (contoh pelanggaran: `hasRole(['kaprodi', 'wakil_prodi'])`, `userRoles.includes('kaprodi')`, atau string `'kaprodi'`). Jabatan struktural adalah penugasan entitas dinamis (pada master prodi atau tabel `siakad_admin_prodis`), BUKAN role sistem global.
     * Hak akses pengelolaan kurikulum/OBE dan persetujuan RPS WAJIB memeriksa relasi penugasan akun dinamis (misal: `isAdminObe` dari `user.siakad_admin_prodis` dan kolom wewenang `can_approve_rps`) atau permission granular, BUKAN mengecek role string fiktif `kaprodi` / `admin_obe` dan BUKAN memfilter array role.
     * DILARANG melakukan bypass role kaku (seperti `userRoles.includes('admin_siakad')` atau `userRoles.includes('admin')`) pada fitur yang seharusnya memerlukan penugasan unit/prodi khusus atau permission granular.
     * Untuk role resmi (seperti `superadmin`, `dosen`, `mahasiswa`), WAJIB gunakan `hasRole('role_slug')` atau boolean helper terpusat (`isSuperAdmin`, `isDosen`, `isMahasiswa`) dari `useAuth()`, BUKAN array `userRoles.includes(...)`.
   - DILARANG KERAS mengandalkan atau memeriksa field statis warisan seperti `user_type`, `user.type === 'admin'`, dsb.
   - Proteksi route dan visibilitas tombol aksi wajib selaras dengan RBAC dan hak penugasan dinamis akun.

========================================================================================

Catatan Penilaian:
- HANYA periksa baris baru (+) — baris tanpa `+` WAJIB diabaikan.
- JANGAN menuduh simbol/komponen tidak terdefinisi jika baris import berada di luar potongan diff.

Git Diff:
EOF

echo '```diff' >> "$PROMPT_FILE"
echo "$STAGED_DIFF" >> "$PROMPT_FILE"
echo '```' >> "$PROMPT_FILE"

cat << 'EOF' >> "$PROMPT_FILE"
PENTING: Jawab HANYA secara langsung tanpa memanggil tool atau membaca file.
Format Respon:
- Jika kode bersih dan memenuhi standar Zero Hardcode & RBAC, jawab TEPAT: PASSED
- Jika ditemukan pelanggaran pada baris baru (+), awali respon dengan REJECTED dan berikan rincian:
  * File & Potongan Baris Melanggar: (nama file dan baris/kode yang melanggar)
  * Standar yang Dilanggar: (nama standar yang dilanggar)
  * Alasan Penolakan: (penjelasan detail)
  * Solusi / Rekomendasi Perbaikan: (contoh perbaikan konkrit)
EOF

AI_EXIT_CODE=1
if command -v agy &> /dev/null; then
    AGY_OUT=$(timeout 180s agy --model gemini-3.8-flash-low --disable-slash-commands --print "$(cat "$PROMPT_FILE")" < /dev/null 2>&1)
    AI_EXIT_CODE=$?
    RESULT="$AGY_OUT"
fi

if [ $AI_EXIT_CODE -ne 0 ] && [ -x "$OPENCODE_BIN" ]; then
    RESULT=$(timeout 180s "$OPENCODE_BIN" run -m "$MODEL" "$(cat "$PROMPT_FILE")" 2>&1)
    AI_EXIT_CODE=$?
    if [ $AI_EXIT_CODE -ne 0 ] || echo "$RESULT" | grep -qi "Unexpected server error"; then
        echo "⚠️ [Audit 3/3] Model $MODEL tidak merespon/error, beralih ke model cadangan..."
        RESULT=$(timeout 90s "$OPENCODE_BIN" run -m "opencode/cat-jam-free" "$(cat "$PROMPT_FILE")" 2>&1)
        AI_EXIT_CODE=$?
    fi
fi

rm -f "$PROMPT_FILE"

if [ $AI_EXIT_CODE -ne 0 ]; then
    echo "❌ [Audit 3/3: RBAC & Dynamic Entities] REJECTED: AI Reviewer gagal/timeout (Exit: $AI_EXIT_CODE)!"
    echo "Detail output: $RESULT"
    exit 1
fi

CLEAN_RESULT=$(echo "$RESULT" | sed -e '/^> build/d' -e '/^Loaded config/d' | awk '/./{p=1} p')

if echo "$RESULT" | grep -qi "REJECTED"; then
    echo "❌ [Audit 3/3: RBAC & Dynamic Entities] REJECTED oleh AI!"
    echo "================================ DETAIL TEMUAN AUDIT ================================"
    echo "$CLEAN_RESULT"
    echo "===================================================================================="
    echo "💡 Harap perbaiki seluruh pelanggaran di atas sebelum melakukan commit."
    exit 1
elif ! echo "$RESULT" | grep -qi "PASSED"; then
    echo "⚠️ [Audit 3/3: RBAC & Dynamic Entities] Output AI tidak dikenali:"
    echo "$CLEAN_RESULT"
    exit 1
fi

echo "✅ [Audit 3/3: RBAC & Dynamic Entities] PASSED (Divalidasi Big Pickle)."
exit 0
