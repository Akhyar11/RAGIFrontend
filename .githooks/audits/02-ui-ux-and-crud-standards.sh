#!/bin/bash
# ==============================================================================
# AUDIT 02 (FE): UI/UX, Admin CRUD, Form Validation & Theming (Unified AI Reviewer)
# ==============================================================================
# Memeriksa dalam 1 kali evaluasi AI komprehensif:
# 1. Admin CRUD & DataTable Standard (Separate detail page, mobile-first, DataTable contrast,
#    font hierarchy 12px/10px, 3-dots DropdownMenu, ConfirmDialog, tombol Filter strictly 'Filter',
#    tanpa refresh/inline search, 1:1 filter drawer parity)
# 2. Form Validation Standard (UI Kit inputs, AsyncSelect, Zod validation skema Bahasa Indonesia)
# 3. Spacing & Margin Padding Standard (skala standar, no arbitrary pixel, compact padding)
# 4. Module Color Theme Standard (dynamic binding --module-primary)
# 5. State Management Standard (Zustand scoping)
# ==============================================================================

echo "🎨 [Audit 2/3: UI/UX, CRUD, Form & Theming] Memeriksa standar UI/UX frontend dengan AI (Big Pickle)..."

export PATH="$HOME/.local/bin:$HOME/.opencode/bin:/usr/local/bin:$PATH"
AI_ENGINE="opencode"
OPENCODE_BIN=$(command -v opencode || echo "$HOME/.opencode/bin/opencode")
MODEL="${OPENCODE_MODEL:-opencode/big-pickle}"

if [ -n "$DIFF_TARGET" ]; then
    STAGED_DIFF=$(git diff "$DIFF_TARGET" -- "app/**" "components/**" "hooks/**" "store/**")
else
    STAGED_DIFF=$(git diff --cached -- "app/**" "components/**" "hooks/**" "store/**")
fi

if [ -z "$STAGED_DIFF" ]; then
    echo "ℹ️ [Audit 2/3] Tidak ada perubahan UI/Frontend yang diuji. Skip."
    exit 0
fi

if [ ${#STAGED_DIFF} -gt 100000 ]; then
    STAGED_DIFF="${STAGED_DIFF:0:100000}"$'\n\n[CATATAN: diff dipotong pada 100.000 karakter. Nilai HANYA yang terlihat di atas; JANGAN mengarang pelanggaran pada file yang tidak tampak.]'
fi

PROMPT_FILE=$(mktemp)

cat << 'EOF' > "$PROMPT_FILE"
Kamu adalah Senior UI/UX & Frontend Architect khusus Next.js App Router & Tailwind CSS (Big Pickle).
Tugasmu adalah memeriksa FULL Git Diff frontend berikut secara SANGAT KETAT terhadap Standar UI/UX, Admin CRUD, Validasi Form, Spacing, dan Tema Modul.
Evaluasi HANYA baris baru (+) yang ditambahkan atau diubah. Abaikan baris konteks tanpa tanda (+).

================================ STANDAR INTI EVALUASI ================================

1. STANDAR ADMIN CRUD & DATATABLE (KEBIJAKAN KETAT):
   - Wajib `<DataTable />` dari `@/components/ui/DataTable` untuk tabel data (dilarang manual `<table>`).
   - Kontras Warna Tabel Model SIMPEG: Header `bg-slate-50/90 border-b border-slate-200`, baris data `bg-white hover:bg-slate-50`.
   - Hirarki Font: Header tabel `text-xs` (12px) bold uppercase; isi sel primer MAKSIMAL `text-xs` (12px, dilarang `text-sm`/`text-base`); subteks/meta/badge `text-2xs` (10px).
   - Menu Aksi Titik 3: Wajib `<DropdownMenu />` dari `@/components/ui/DropdownMenu` untuk aksi tabel (Edit, Hapus, Detail). Dilarang tombol aksi horizontal di baris sel.
   - Konfirmasi Destruktif: Wajib modal konfirmasi bertema UI (`<ConfirmDialog />`). DILARANG KERAS `window.confirm()`, `confirm()`, `alert()`.
   - Tombol Header & Strictly Text 'Filter':
     * Tombol paling kanan di `PageHeader` adalah Tambah Data.
     * Tombol Filter WAJIB di sebelah KIRI tombol Tambah Data (`[Filter] [Tambah Data]`).
     * Teks tombol Filter WAJIB strictly bertuliskan kata `Filter` (tanpa counter/teks tambahan).
     * Membuka filter via `<Drawer />` dari kanan ke kiri.
     * Paritas 1:1: Kolom informasi tabel harus dapat difilter di Drawer.
   - Larangan: Dilarang tombol refresh (`RefreshCw`/`RefreshCcw`) dan dilarang search bar inline di atas tabel (pencarian dipusatkan di Drawer filter).
   - Halaman Detail: Rincian entitas wajib di halaman terpisah (`/[id]` atau `/detail/[id]`) dengan tombol kembali warna primary dinamis.

2. STANDAR FORM VALIDATION & UI KIT:
   - Wajib komponen UI Kit: `<Input>`, `<Select>`, `<AsyncSelect>`, `<Textarea>`, `<Checkbox>`. Dilarang tag HTML mentah (`<input>`, `<select>`).
   - Server-Side `<AsyncSelect />` wajib digunakan jika dropdown mengambil data dari API backend/relasi database.
   - Mandatory Zod Validation: Setiap form wajib memiliki skema validasi Zod (`zodResolver(schema)`) dengan pesan kesalahan Bahasa Indonesia.

3. STANDAR SPACING & THEME COLOR:
   - Skala spacing standar Tailwind: Gunakan `gap-2` s.d `gap-6`, `p-2` s.d `p-6`, `space-y-4` s.d `space-y-6`.
   - DILARANG arbitrary pixel hardbound seperti `p-[19px]`, `gap-[13px]`, `m-[35px]`.
   - Dynamic Module Primary Color: Warna modul aktif, tombol modul, dan aksen wajib membaca variabel CSS `--module-primary` atau theme modul. Dilarang hardcode warna spesifik modul secara statis.

4. STANDAR STATE MANAGEMENT:
   - Global state wajib menggunakan Zustand di `@/store/`.
    - Data tabel/halaman spesifik dilarang dimasukkan ke Zustand global (cukup local `useState`/React Query).

5. STANDAR PENGATURAN API, TOKEN & SYNC OPERASIONAL:
    - Pengaturan integrasi hanya mengubah koneksi untuk entri registry yang sudah ada; jangan menambahkan CRUD bebas definisi integrasi tanpa permintaan eksplisit.
    - Respons hanya memberi boolean `token_configured`. Jangan pernah mengisi ulang atau menampilkan token tersimpan; field edit selalu kosong, memberi tahu “sudah/belum tersimpan”, dan menjelaskan bahwa kosong berarti mempertahankan, bukan menghapus.
    - Payload update tidak boleh menyertakan token kosong/null untuk perubahan URL/auth/status; token hanya ikut dikirim ketika pengguna memasukkan token baru.
    - Tampilkan skema auth dengan header yang benar (`Authorization: Bearer` vs `X-API-KEY`) agar admin dapat mencocokkan kontrak sumber.
    - Bedakan Uji Koneksi (read-only) dari Jalankan Sync (menulis target). Sync harus melalui service API backend yang dikonfigurasi, memberi konfirmasi/loading/anti-double-submit, lalu menampilkan fetched/created/updated/skipped beserta alasan skip dan error aman. Jangan mengklaim sync sukses dari ping HTTP saja.

========================================================================================

Catatan Penilaian:
- HANYA periksa baris baru (+) — baris tanpa `+` WAJIB diabaikan.
- JANGAN menuduh import/komponen tidak terdefinisi jika baris `import` berada di luar potongan diff. Validitas sintaks & import sudah diverifikasi terpisah oleh tsc.

Git Diff:
EOF

echo '```diff' >> "$PROMPT_FILE"
echo "$STAGED_DIFF" >> "$PROMPT_FILE"
echo '```' >> "$PROMPT_FILE"

cat << 'EOF' >> "$PROMPT_FILE"
PENTING: Jawab HANYA secara langsung tanpa memanggil tool atau membaca file.
Format Respon:
- Jika kode bersih dan memenuhi standar UI/UX di atas, jawab TEPAT: PASSED
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
        echo "⚠️ [Audit 2/3] Model $MODEL tidak merespon/error, beralih ke model cadangan..."
        RESULT=$(timeout 90s "$OPENCODE_BIN" run -m "opencode/cat-jam-free" "$(cat "$PROMPT_FILE")" 2>&1)
        AI_EXIT_CODE=$?
    fi
fi

rm -f "$PROMPT_FILE"

if [ $AI_EXIT_CODE -ne 0 ]; then
    echo "❌ [Audit 2/3: UI/UX, CRUD, Form & Theming] REJECTED: AI Reviewer gagal/timeout (Exit: $AI_EXIT_CODE)!"
    echo "Detail output: $RESULT"
    exit 1
fi

CLEAN_RESULT=$(echo "$RESULT" | sed -e '/^> build/d' -e '/^Loaded config/d' | awk '/./{p=1} p')

if echo "$RESULT" | grep -qi "REJECTED"; then
    echo "❌ [Audit 2/3: UI/UX, CRUD, Form & Theming] REJECTED oleh AI!"
    echo "================================ DETAIL TEMUAN AUDIT ================================"
    echo "$CLEAN_RESULT"
    echo "===================================================================================="
    echo "💡 Harap perbaiki seluruh pelanggaran di atas sebelum melakukan commit."
    exit 1
elif ! echo "$RESULT" | grep -qi "PASSED"; then
    echo "⚠️ [Audit 2/3: UI/UX, CRUD, Form & Theming] Output AI tidak dikenali:"
    echo "$CLEAN_RESULT"
    exit 1
fi

echo "✅ [Audit 2/3: UI/UX, CRUD, Form & Theming] PASSED (Divalidasi Big Pickle)."
exit 0
