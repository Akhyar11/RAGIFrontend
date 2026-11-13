<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<RULE[agent_skills]>
# Agent Directive: Selalu Periksa dan Gunakan Skill yang Relevan

Sebelum mengeksekusi tugas apapun, Anda WAJIB memeriksa daftar skill di bawah ini dan membaca SKILL.md yang relevan menggunakan `view_file` sebelum mulai coding.

## Daftar Skill Frontend yang Tersedia

| Skill | Path | Aktifkan Ketika |
| --- | --- | --- |
| `ui-components-standard` | `.agent/skills/ui_components_standard/SKILL.md` | Diminta membuat atau memodifikasi komponen UI, styling, layouting. |
| `api-integration-standard` | `.agent/skills/api_integration_standard/SKILL.md` | Menghubungkan API, membuat service baru, HTTP request. |
| `api-settings-workflow` | `.agent/skills/api_settings_workflow/SKILL.md` | Membuat/mengubah UI Pengaturan API, kredensial/auth, Uji Koneksi, aksi Sync, dan ringkasan hasil impor. |
| `state-management-standard` | `.agent/skills/state_management_standard/SKILL.md` | Membuat atau mengubah global state menggunakan Zustand. |
| `form-validation-standard` | `.agent/skills/form_validation_standard/SKILL.md` | Membuat form baru atau menambahkan validasi input. |
| `nextjs-routing-standard` | `.agent/skills/nextjs_routing_standard/SKILL.md` | Membuat halaman/route baru, middleware, atau server/client components. |
| `crud-ui-standard` | `.agent/skills/crud_ui_standard/SKILL.md` | Diminta membuat halaman/form CRUD, dengan aturan form terpisah (> 5 input) dan layout grid yang rapi. |
| `admin-crud-reviewer-standard` | `.agent/skills/admin_crud_reviewer_standard/SKILL.md` | Diminta merancang, membuat, atau mereview halaman Admin CRUD (Atomic Design, DataTable, Pagination, Sorting, Filter Drawer). |
| `form-validation-reviewer-standard` | `.agent/skills/form_validation_reviewer_standard/SKILL.md` | Diminta merancang, membuat, atau mereview form & validasi input (UI Kit, AsyncSelect Server-Side, Mandatory Zod Validation). |
| `state-management-reviewer-standard` | `.agent/skills/state_management_reviewer_standard/SKILL.md` | Diminta merancang, membuat, atau mereview state management (Zustand, Type-Safe Stores, Persist Middleware). |
| `icon-standard-reviewer` | `.agent/skills/icon_standard_reviewer/SKILL.md` | Diminta merancang, membuat, atau mereview penggunaan ikon (Mandatory Lucide-React Library, Dilarang SVG Mentah & Icon Unstandardized). |
| `spacing-standard-reviewer` | `.agent/skills/spacing_standard_reviewer/SKILL.md` | Diminta merancang, membuat, atau mereview ukuran margin, padding, gap, dan alignment layout (No Arbitrary Pixels, Compact Padding, Grid Gap Consistency). |
| `module-color-theme-reviewer` | `.agent/skills/module_color_theme_reviewer/SKILL.md` | Diminta merancang, membuat, atau mereview penggunaan warna primary modul dan keselarasan tema menu modul. |
| `rbac-refactoring-standard` | `.agent/skills/rbac_refactoring_standard/SKILL.md` | Melakukan refaktor komponen, perbaikan UI, atau mendesain pengecekan akses (RBAC) tanpa mengandalkan tipe user statis. |
| `module-management-standard`| `../RAGIBackend/.agent/skills/module_management_standard/SKILL.md` | Merancang, menambah, atau memodifikasi modul aplikasi (Master Modul) di ekosistem kampus terintegrasi. |
| `audit-fungsional-crud` | `.agent/skills/audit_fungsional_crud/SKILL.md` | Diminta menguji, mengaudit, atau memverifikasi fungsi operasional halaman/form CRUD, dropdown data, integrasi API, dan alur bisnis modul. |

## Aturan Wajib
1. **BACA** SKILL.md yang relevan sebelum mulai coding. Jangan asumsikan — baca dulu.
2. **PATUHI SEMUA** ketentuan di dalam SKILL.md tanpa pengecualian.
3. **JANGAN** menyimpang dari standar yang sudah ditetapkan di skill tanpa persetujuan eksplisit dari user.
</RULE[agent_skills]>

<RULE[github_push]>
# Git Push Policy
Agent **DILARANG KERAS** melakukan eksekusi perintah `git push` secara otomatis setelah menyelesaikan tugas atau setelah melakukan commit. Perintah `git push` HANYA boleh dieksekusi jika User memintanya secara eksplisit (misalnya: "push ke github").
</RULE[github_push]>

<RULE[deploy_vercel]>
# Vercel Deploy Policy (Frontend)
Deploy ke Vercel **HANYA** dilakukan dengan **push ke branch `vercel`** (Vercel git integration otomatis build & deploy dari branch tersebut).
- Rilis: pastikan `main` sudah final, lalu push ke branch `vercel`, mis. `git push origin main:vercel` (atau majukan branch lokal `vercel` ke `main` lalu `git push origin vercel`).
- **DILARANG** memakai Vercel CLI untuk deploy (`vercel`, `npx vercel`, `vercel --prod`) atau memasang/menginstal CLI Vercel. Cukup push branch.
- Backend (Laravel) **tidak** dideploy ke Vercel.
</RULE[deploy_vercel]>

<RULE[no_hardcode_definition]>
# Zero Hardcode & Dynamic Entity Reference Policy

## Definisi Hardcode
Hardcode adalah suatu metode atau cara pengambilan data, pengiriman data, atau pengaturan data dengan **menyebutkan/mengetik nama atau label string secara langsung** (misalnya menyebutkan `'spmb'`, `'sikeu'`, atau string nama spesifik lainnya) alih-alih merujuk pada identitas entitas database.
Termasuk juga membuat **array literal statis** untuk `options` pada komponen UI seperti `<Select>` atau `<Dropdown>`.

## Aturan Pengkodean
1. **Minimal Hardcode**: Sistem yang baik harus meminimalkan hardcode hingga 0%.
2. **Dilarang Keras Array Literal Statis**: DILARANG KERAS meng-hardcode opsi pilihan (misal: `options={[{ value: 'REGULER', label: 'Reguler' }]}`) di dalam komponen form. Seluruh pilihan/dropdown WAJIB mengambil data dari tabel master referensi via API (contoh: `master_tipe_jalur`, `master_jalur_kelas`).
3. **Referensi ID Wajib**: Seluruh relasi, filter, dan query wajib menggunakan **referensi ID entitas** (seperti `module.id`, `tipe_jalur_id`, `jalur_kelas_id`, dsb.) yang diambil dari database, bukan berupa label string atau hardcode nama.

## Pengecualian Sah — Nilai Tetap Domain (bukan entitas master)
Statis **DIPERBOLEHKAN** bila nilai bersifat tetap/closed-set oleh domain atau regulasi dan **TIDAK memiliki tabel master/ID entitas**, dengan syarat:
1. Nilai tidak dikelola lewat tabel master apa pun (contoh sah: jenis kelamin `L`/`P`, agama, status sipil, jenjang pendidikan, rentang penghasilan, asal lulusan `sekolah`/`pt`, sumber informasi pendaftaran, status workflow internal).
2. Dideklarasikan sebagai **konstanta terpusat bertipe** (mis. `const X_OPTIONS: SelectOption[]`) di satu lokasi, bukan inline di dalam JSX/berulang di banyak komponen.
3. `value` stabil (lowercase/snake_case) dan **selaras dengan kolom/enum backend**; `label` hanya untuk tampilan.
4. DILARANG menduplikasi daftar yang sama di banyak file — impor dari satu sumber konstanta.

Tetap **DILARANG**: opsi untuk entitas yang punya tabel/ID (prodi, jalur, gelombang, modul, role, jenis biaya, unit kerja, dsb.) — itu WAJIB dinamis via API.
</RULE[no_hardcode_definition]>

<RULE[admin_crud_reviewer]>
# Admin CRUD & Table Reviewer Policy

## Aturan Wajib Halaman Admin CRUD:
1. **Mobile-First Responsive Styling**: Seluruh layout dan halaman WAJIB menggunakan pendekatan mobile-first (`w-full flex-col grid-cols-1 gap-4`) dengan penyesuaian breakpoint responsif (`sm:`, `md:`, `lg:`).
2. **Halaman Detail Terpisah (Separate Detail Page)**: Tampilan Detail data/rincian entitas WAJIB dibuat di **Halaman Terpisah** (route `/[id]` atau `/detail/[id]`) dengan Tombol Kembali yang warnanya menyesuaikan primary modul (bukan hardcode warna) di `PageHeader`. Dilarang menjejalkan detail rumit ke dalam modal kecil.
3. **Desain Form Compact & Elegan**: Form harus dirancang sangat compact, rapi, dan proporsional (grid 1 kolom di mobile, max 2-3 kolom di desktop: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`). Dilarang ada whitespace/margin yang berlebihan.
4. **Atomic Design Architecture**: Wajib memisahkan elemen UI ke `@/components/ui/` (`Button`, `Input`, `Select`, `Modal`, `Drawer`, `DataTable`, `Badge`) dan layout ke `@/components/layout/` (`PageHeader`). Dilarang memakai elemen HTML mentah tanpa style standar.
5. **Mandatory DataTable, Standar Kontras Warna (Model SIMPEG) & Server-Side Pagination**:
   - Halaman list/tabel data WAJIB menggunakan `<DataTable />` dari `@/components/ui/DataTable`. Dilarang memakai tag HTML manual `<table>`. Data WAJIB diambil dari API dengan server-side pagination (`page`, `limit`) dan prop `meta={meta}`.
   - **Warna & Kontras Tabel**: Container dan baris data tabel (`<tbody>`, `<tr>`, `<td>`) WAJIB berwarna putih solid bersih (`bg-white` / `#ffffff`) dengan efek hover lembut (`hover:bg-slate-50 transition-colors`).
   - **Header Kolom Wajib Kontras Pembeda**: Baris header tabel (`<thead>`, `<th>`) WAJIB memiliki kontras visual abu-abu lembut (`bg-slate-50/90 border-b border-slate-200` atau `var(--gray-50)`). DILARANG membuat header putih polos tanpa pembeda (`bg-white` polos) yang membuat tabel tampak datar ("putih semua").
6. **Sort By & Sort Direction (Default Name/Label)**: WAJIB menyediakan filter pengurutan `sort_by` / `orderBy` (default berbasis `name` / `label` / `id`) dan `sort_dir` / `orderDir` (`asc` / `desc`) dalam layout grid 2 kolom di Drawer filter.
7. **Posisi Tombol Header & Strictly Text 'Filter'**:
   - Tombol **paling kanan** di `PageHeader` (jika ada) WAJIB berupa tombol bersifat **Tambah/Buat data baru** (`[Tambah Data]`).
   - Tombol **Filter** WAJIB berada tepat di sebelah **KIRI** tombol Tambah Data (`[Filter] [Tambah Data]`).
   - Teks tombol filter WAJIB strictly bertuliskan kata **`Filter`** (tanpa kata tambahan dan tanpa badge counter).
   - Tombol Filter WAJIB bertipe outline dinamis (mengikuti `primary_color` modul) dengan ikon `<Filter size={16} />`, memunculkan `<Drawer />` dari kanan ke kiri (standard SSO/IAM).
8. **UI & Form Consistency**:
   - Form <= 5 inputs: Gunakan `<Modal />` dengan grid maksimal 2 kolom (`grid grid-cols-1 md:grid-cols-2 gap-4`).
   - Form > 5 inputs: Gunakan Halaman Terpisah dengan Tombol Kembali yang menyesuaikan warna primary modul di `PageHeader`.
   - Gunakan prop `label` pada `<Input>` / `<Select>` langsung di Drawer.
9. **Wajib 3-Dots Action Dropdown Menu (<DropdownMenu />)**: Seluruh aksi tabel (Edit, Hapus, Detail, dll.) WAJIB menggunakan menu titik 3 (`<DropdownMenu />` dari `@/components/ui/DropdownMenu`). Dilarang keras menyejajarkan tombol aksi secara horizontal di sel tabel (*inefficient space*).
10. **Dilarang Dialog Native Browser & Wajib Modal Konfirmasi UI (<ConfirmDialog />)**: DILARANG KERAS menggunakan dialog bawaan browser (`confirm()`, `window.confirm()`, `alert()`, `prompt()`). Seluruh konfirmasi aksi hapus atau aksi destruktif WAJIB menggunakan modal konfirmasi bertema UI (`<ConfirmDialog />` dari `@/components/ui/ConfirmDialog` atau `<Modal />`) dengan tombol Batal dan Hapus serta indikator loading.
11. **Larangan Tombol Refresh & Search Bar Inline di Atas Tabel**: DILARANG KERAS menyediakan tombol *Refresh* (`RefreshCw`/`RefreshCcw`) dan DILARANG menaruh search bar inline di atas tabel. Seluruh input pencarian wajib dipusatkan ke dalam Filter Drawer.
12. **Standar Hirarki Font Tabel (Max 12px Rule)**:
    - Header tabel: Baku `12px` (`0.75rem` / `text-xs`) bold uppercase.
    - Isi sel tabel (data primer): Maksimal `12px` (`0.75rem` / `text-xs`). DILARANG `text-sm` (14px) atau `text-base` (16px).
    - Teks sekunder/subteks/meta/badge: Wajib `10px` (`0.625rem` / `text-2xs`).
13. **Standar Format Sel 2-Baris & Styling Menu Tab**:
    - Format sel identitas/nama disarankan 2-baris (Baris atas: kode/nama tebal `text-xs`, Baris bawah: subteks `text-2xs`).
    - Menu tab navigasi (jika ada) WAJIB menggunakan format rounded-top underline (aktif: `border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)] rounded-t-lg border-b-2`).
</RULE[admin_crud_reviewer]>

<RULE[form_validation_reviewer]>
# Form Validation & Input Component Reviewer Policy

## Aturan Wajib Form & Validasi:
1. **Konsistensi UI Kit Input**: Semua elemen input form WAJIB menggunakan komponen UI Kit (`<Input>`, `<Select>`, `<AsyncSelect>`, `<Textarea>`, `<Checkbox>`). Dilarang memakai tag HTML mentah (`<input>`, `<select>`, `<textarea>`).
2. **Server-Side AsyncSelect untuk Data API**: Jika input dropdown mengambil data dari API backend/relasi DB, WAJIB menggunakan `<AsyncSelect />` dari `@/components/ui/AsyncSelect` yang mendukung pencarian & fetching dari server.
3. **Mandatory Strict Zod Validation**: DILARANG KERAS ada form tanpa validasi. Seluruh form WAJIB menggunakan skema validasi Zod (`z.object({...})`) yang di-bind via `react-hook-form` (`zodResolver(schema)`). Error message wajib tampil dalam Bahasa Indonesia di bawah field.
</RULE[form_validation_reviewer]>

<RULE[state_management_reviewer]>
# State Management & Store Reviewer Policy

## Aturan Wajib State Management:
1. **Zustand Global Store**: Seluruh global state WAJIB menggunakan Zustand yang berlokasi di `@/store/` dengan TypeScript interface terpisah untuk State dan Actions.
2. **Local Component State Scoping**: Data transient / tabel spesifik satu halaman DILARANG dimasukkan ke Zustand global store. Wajib dikelola dalam local state (`useState` / React Query).
</RULE[state_management_reviewer]>

<RULE[icon_standard_reviewer]>
# Icon Standard Reviewer Policy

## Aturan Wajib Penggunaan Ikon:
1. **Mandatory Lucide-React**: Seluruh ikon dalam aplikasi WAJIB di-import dan menggunakan pustaka standar `lucide-react` (seperti `<Plus size={16} />`, `<Trash2 size={16} />`, `<Filter size={16} />`).
2. **Dilarang SVG Mentah Inline & Third-Party Unstandardized**: DILARANG KERAS menggunakan tag `<svg>` mentah inline dengan `<path>` panjang jika ikon sudah tersedia di `lucide-react`. DILARANG menggunakan `<i className="fa ...">` atau paket ikon non-standar lainnya.
</RULE[icon_standard_reviewer]>

<RULE[spacing_standard_reviewer]>
# Spacing, Margin & Padding Reviewer Policy

## Aturan Wajib Spacing & Layout Alignment:
1. **Skala Spacing Standar**: Spacing WAJIB menggunakan skala terstandarisasi (`p-2` s.d `p-6`, `m-2` s.d `m-6`, `gap-2` s.d `gap-6`, `space-y-4` s.d `space-y-6`). DILARANG HARDBOUND/ARBITRARY PIXEL SPACING seperti `m-[37px]`, `p-[19px]`, `gap-[13px]`, `mt-[42px]`, `px-[55px]`.
2. **Compact & Proporsional Card Padding**: Card/Container utama wajib efisien (`p-4` atau `p-6` di desktop, `p-3` atau `p-4` di mobile). DILARANG OVERSIZED PADDING seperti `p-16`, `p-20`, `px-24` yang membuang area layar.
3. **Konsistensi Gap & Layout Grid Alignment**: Jarak antarelemen di container flexbox/grid wajib menggunakan `gap-*` (misal `gap-4` / `gap-6`). Dilarang mencampur `gap` dengan inline margin manual (`mt-`, `mb-`, `ml-`, `mr-`) di elemen anak yang menyebabkan alur layout bergeser (*misalignment*).
4. **Consistency Margin Outer Section**: Jarak antar section/card utama halaman wajib rapi dan konsisten dengan `space-y-4` / `space-y-6` atau `mb-4` / `mb-6`. Dilarang menggunakan margin negatif acak (`-mt-20`) tanpa kebutuhan overlay UI khusus.
</RULE[spacing_standard_reviewer]>

<RULE[module_color_theme_reviewer]>
# Module Primary Color & Theme Reviewer Policy

## Aturan Wajib Warna Primary & Tema Modul:
1. **Dynamic Module Color Binding**: Setiap modul dan menu di dalamnya WAJIB memanfaatkan `primary_color` dari entitas modul (misal via CSS variable `--module-primary`, theme context, atau dynamic style), bukan mengandalkan warna statis bawaan (`bg-blue-600` / `#3b82f6` hardcoded di seluruh modul).
2. **Active Menu & Accent Styling**: Indikator menu aktif, header modul, badge modul, dan aksen UI di dalam modul WAJIB secara dinamis mengikuti warna primary modul yang terdaftar di database master modul.
3. **Dilarang Color Hardcoding Per Modul**: DILARANG KERAS meng-hardcode warna aksen modul secara statis pada file halaman/komponen jika modul tersebut telah memiliki `primary_color` terdaftar di database master modul (`/admin/modules`).
</RULE[module_color_theme_reviewer]>



<RULE[no_ujian_spmb]>
# No Ujian/CBT Policy for SPMB
Agent **DILARANG KERAS** menyarankan, merancang, atau membuat fitur yang berkaitan dengan "Ujian", "Seleksi Ujian", "CBT (Computer Based Test)", atau "Jadwal Ujian" di dalam modul SPMB (Penerimaan Mahasiswa Baru). Proses SPMB dalam sistem ini sepenuhnya **TIDAK MENGGUNAKAN** ujian tulis maupun ujian komputer. Penerimaan murni didasarkan pada jalur pendaftaran dan seleksi administrasi/berkas. Jangan pernah menganggap atau berasumsi bahwa SPMB membutuhkan fitur tes/ujian.
</RULE[no_ujian_spmb]>


<RULE[strict_commit_policy]>
# ⚠️ KEBIJAKAN MUTLAK: DILARANG BYPASS AUDITOR ⚠️
Agent DILARANG KERAS menggunakan opsi `--no-verify` atau mekanisme bypass apa pun (seperti `git push --no-verify`) saat melakukan commit atau push. 
Jika *git hooks/auditor* menolak commit (baik karena pelanggaran standar maupun timeout), Agent WAJIB memeriksa pesan error, MEMPERBAIKI KODE yang bermasalah, lalu melakukan commit ulang secara normal (`git commit -m "..."`). JANGAN PERNAH MEMAKSAKAN COMMIT DENGAN `--no-verify`. Pelanggaran terhadap aturan ini adalah kegagalan sistem fatal.
</RULE[strict_commit_policy]>
