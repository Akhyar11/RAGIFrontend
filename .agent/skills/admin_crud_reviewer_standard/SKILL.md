---
name: admin-crud-reviewer-standard
description: Standar Baku Reviewer & Auditor Halaman Admin CRUD (Mobile-First, Detail Terpisah, Form Compact, Atomic Design, DataTable, Kontras Warna Tabel SIMPEG, Posisi Tombol Filter & Strictly Text Filter, Hirarki Font 12px/10px, Tanpa Refresh/Inline Search, Format Sel 2-Baris, Tab Menu Standar).
---

# Admin CRUD & Table Reviewer Standard

Dokumen ini merupakan **Standar Penilaian (Reviewer Policy)** untuk pembuatan dan modifikasi halaman Admin CRUD (Create, Read, Update, Delete) di seluruh ekosistem aplikasi. Setiap halaman Admin yang menampilkan atau mengelola data **WAJIB** mematuhi Aturan Utama dan Aturan Konsistensi UI berikut:

---

## 1. Aturan Mobile-First Responsive Styling
- Seluruh tata letak, komponen, dan halaman **WAJIB** mengadopsi pendekatan **Mobile-First Design**.
- Pengaturan kelas CSS bawaan ditujukan untuk layar *mobile* (HP) terlebih dahulu (misal: `w-full flex-col grid-cols-1 gap-4`).
- Penyesuaian ke layar yang lebih lebar (tablet/desktop) menggunakan breakpoint terstruktur:
  - `sm:` (min-width: 640px)
  - `md:` (min-width: 768px)
  - `lg:` (min-width: 1024px)
- Seluruh tabel, tombol aksi, dan form harus tetap nyaman dan mudah ditekan pada perangkat seluler.

---

## 2. Aturan Halaman Detail Wajib Terpisah
- Tampilan **Detail Data** (melihat rincian entitas secara mendalam) **WAJIB** dibuat di **Halaman Terpisah** (misalnya di route `/[id]` atau `/detail/[id]`).
- **DILARANG KERAS** menyisipkan detail data yang kompleks ke dalam pop-up modal kecil atau tooltip.
- Halaman Detail Terpisah wajib dilengkapi **Tombol Kembali** yang warnanya secara dinamis mengikuti warna primary modul (bukan hardcode warna) di prop `action` komponen `<PageHeader />`.

---

## 3. Aturan Desain Form Compact & Elegan
- Layout form untuk *Create*, *Update*, maupun input data lainnya harus dirancang **sangat compact, rapi, dan tidak berlebihan** (*no excessive whitespace/margin*).
- Gunakan arsitektur **CSS Grid Responsif**:
  - Layar Mobile: 1 Kolom (`grid-cols-1`)
  - Layar Medium/Desktop: Maksimal 2 atau 3 Kolom (`md:grid-cols-2 lg:grid-cols-3 gap-4`)
- Jarak antar elemen input dijaga agar pas (`gap-4`), tidak terlalu renggang dan tidak terlalu sesak.
- Gunakan selalu prop `label` bawaan komponen UI Kit (`<Input label="...">`, `<Select label="...">`).

---

## 4. Aturan Arsitektur Atomic Design
Semua komponen antarmuka wajib dibangun mengikuti prinsip **Atomic Design**:
- **Atoms & Molecules (`components/ui/`)**: Elemen dasar dan komponen interaktif individual wajib diambil dari UI Kit terpusat:
  - `<Button>` (`components/ui/Button.tsx`)
  - `<Input>` (`components/ui/Input.tsx`)
  - `<Select>` & `<AsyncSelect>` (`components/ui/Select.tsx`, `components/ui/AsyncSelect.tsx`)
  - `<Modal>` (`components/ui/Modal.tsx`)
  - `<Drawer>` (`components/ui/Drawer.tsx`)
  - `<DataTable>` (`components/ui/DataTable.tsx`)
  - `<Badge>` / `<StatusBadge>` (`components/ui/Badge.tsx`)
- **Organisms & Templates (`components/layout/`)**: Komponen struktur halaman seperti `<PageHeader>` dan `<Sidebar>`.
- **Pages (`app/(main)/...`)**: File halaman utama bertugas merangkai (*assemble*) komponen atomik tanpa menulis elemen HTML mentah yang tidak terstandarisasi.

---

## 5. Aturan Wajib DataTable & Standar Kontras Warna Tabel (Model SIMPEG)
Setiap halaman list/tabel data **WAJIB**:
- Menggunakan komponen **`<DataTable />`** (`@/components/ui/DataTable`).
- **DILARANG KERAS** menggunakan tag HTML mentah seperti `<table>`, `<thead>`, `<tbody>`, `<tr>`, atau `<td>` langsung di file halaman.
- **Standar Warna & Kontras Tabel (Model SIMPEG)**:
  - **Container & Baris Data (`<tbody>`, `<tr>`, `<td>`)**: Background container tabel, tag `<table className="table bg-white">`, dan baris data tabel **WAJIB** berwarna putih solid bersih (`bg-white` / `#ffffff`). Garis batas pemisah bawah baris data menggunakan `border-b border-gray-100` / `border-slate-100`.
  - **Efek Interaktif Hover Baris Data**: Setiap baris tabel (`<tr>`) wajib memiliki transisi hover yang lembut (`hover:bg-slate-50 transition-colors`). DILARANG memberi class paksaan `bg-white` langsung pada tag `<td>` individual karena akan mematikan efek hover ini.
  - **Header Kolom (`<thead>` & `<th>`) - Wajib Kontras Pembeda**: Baris header tabel **WAJIB** memiliki kontras visual abu-abu lembut (`bg-slate-50/90 border-b border-slate-200` atau `var(--gray-50)`). **DILARANG KERAS** membuat background header putih polos tanpa pembeda (`bg-white` polos), karena akan membuat tabel terlihat datar ("putih semua") dan menghilangkan batas pemisah yang jelas antara judul kolom dan baris data.
  - **Tipografi Header**: Teks header tabel berwarna `var(--text-secondary)` (slate-600), berbobot tebal (`font-bold` / 700), berhuruf kapital penuh (`uppercase`), berjarak renggang (`letter-spacing: 0.05em` / `tracking-wider`), dan berukuran baku `12px` (`0.75rem` / `text-xs`).
- Data **WAJIB** diambil dari API backend dengan mendukung **Limit** dan **Server-Side Pagination** (`page`, `limit`).
- Meneruskan metadata pagination API ke prop `meta` DataTable:
  ```tsx
  <DataTable
    columns={columns}
    data={items}
    isLoading={isLoading}
    meta={meta}
    onPageChange={(newPage) => setPage(newPage)}
  />
  ```

---

## 6. Aturan Filter Sort By & Sort Direction (Default Name/Label) & Paritas Filter 1:1
Setiap halaman list/tabel **WAJIB** memiliki opsi pengurutan data (*Sorting*) dan panel filter:
- Pilihan **Urut Berdasarkan** (`sort_by` / `orderBy`) **WAJIB MENCAKUP SELURUH KOLOM INFORMASI** yang ditampilkan pada tabel (contoh: jika tabel menampilkan 5 kolom informasi, kelima kolom tersebut wajib memiliki opsi sortir).
- Nilai **Default Sort** adalah berbasis `name` atau `label` (atau `id` / `created_at` yang relevan).
- Pilihan **Arah** (`sort_dir` / `orderDir`) mendukung `asc` (A - Z / Naik) dan `desc` (Z - A / Turun).
- **Paritas Filter 1:1 terhadap Kolom Informasi Tabel:** Seluruh kolom informasi data yang ditampilkan pada tabel (di luar kolom teknis seperti No urut, checkbox select, dan tombol aksi) WAJIB memiliki inputan filter yang bersesuaian di dalam Filter Drawer.
- Layout pilihan sorting di dalam Drawer menggunakan **Grid 2 Kolom** di bawah garis pembatas `<hr />`:
  ```tsx
  <hr className="border-t border-slate-200 my-2" />

  <div className="grid grid-cols-2 gap-4">
    <Select 
      label="Urut Berdasarkan"
      value={filterOrderBy}
      onChange={(val) => setFilterOrderBy(val)}
      options={[
        { value: 'name', label: 'Nama / Label' },
        { value: 'id', label: 'ID' },
        { value: 'created_at', label: 'Tanggal Dibuat' }
      ]}
    />
    <Select 
      label="Arah"
      value={filterOrderDir}
      onChange={(val) => setFilterOrderDir(val)}
      options={[
        { value: 'asc', label: 'A - Z (Naik)' },
        { value: 'desc', label: 'Z - A (Turun)' }
      ]}
    />
  </div>
  ```

---

## 7. Aturan Tombol Header: Posisi Tombol, Strictly Text 'Filter' & Drawer Slide Kanan-ke-Kiri
Semua halaman admin yang mengelola data tabel **WAJIB** mematuhi tata letak tombol aksi di `PageHeader`:
- **Posisi Tombol Aksi di PageHeader**:
  - Tombol **paling kanan** (jika ada tombol aksi) WAJIB merupakan tombol bersifat **Tambah/Buat data baru** (misal: `[Tambah Pegawai]`, `[Ajukan Cuti]`, `[Buat Pengajuan]`, `[Tambah Data]`).
  - Tombol **Filter** WAJIB selalu berada tepat di sebelah **KIRI** tombol Tambah Data (`[Filter] [Tambah Data]`).
  - DILARANG KERAS menukar urutan tombol (misalnya menaruh tombol Tambah sebelum Filter atau menaruh tombol lain di paling kanan).
- **Penulisan Strictly Text 'Filter'**:
  - Label teks pada tombol Filter WAJIB HANYA bertuliskan kata **`Filter`**.
  - **DILARANG KERAS** menambahkan kata/frasa tambahan (seperti `Filter Pencarian`, `Filter Data`, `Saring Data`) atau menyematkan badge angka counter (misal: `Filter (2)`) ke dalam teks tombol filter.
- **Styling Tombol Filter**:
  - Style tombol filter wajib bertipe **Outline Dynamic** (warna outline menyesuaikan `primary_color` modul melalui CSS variable `--module-primary`, bukan hardcode warna biru) dengan ikon `<Filter size={16} />`.
- **Drawer Slide Kanan-ke-Kiri**:
  - Ketika tombol Filter diklik, panel filter **WAJIB** memunculkan komponen **`<Drawer />`** yang meluncur dari kanan ke kiri (*right-to-left*), merujuk pada standar modul SSO/IAM.
  ```tsx
  <PageHeader
    title="Data Pegawai (Dosen & Tendik)"
    action={
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          icon={<Filter size={16} />} 
          onClick={() => setShowFilter(true)}
        >
          Filter
        </Button>
        <Button icon={<Plus size={16} />} onClick={handleOpenCreate}>
          Tambah Pegawai
        </Button>
      </div>
    }
  />

  <Drawer
    open={showFilter}
    onClose={() => setShowFilter(false)}
    title="Filter Data Pegawai"
  >
    {/* Filter Inputs & Sort Grid */}
  </Drawer>
  ```

---

## 8. Aturan Form Create/Update (Modal vs Halaman Terpisah)
- **<= 5 Input (Gunakan Modal)**: Menggunakan `<Modal />` dengan grid maksimal 2 kolom (`grid grid-cols-1 md:grid-cols-2 gap-4`).
- **> 5 Input (Gunakan Halaman Terpisah)**: Membuat halaman terpisah (`/create`, `/[id]/edit`) dengan **Tombol Kembali** yang warnanya secara dinamis mengikuti primary modul di header.

---

## 9. Aturan Aksi Tabel Wajib 3-Dots Action Dropdown Menu (`<DropdownMenu />`)
- **Space-Efficient Action Menu**: Seluruh kolom Aksi pada tabel data (`DataTable`) **WAJIB** menggunakan menu titik 3 (`<DropdownMenu />` dari `@/components/ui/DropdownMenu`).
- **DILARANG HARDBOUND INLINE ACTION BUTTONS**: Dilarang keras menyejajarkan tombol-tombol aksi (Edit, Hapus, Detail, Status, Reset) secara horizontal di dalam sel tabel, karena sangat membuang ruang layar (*inefficient space*) dan tidak estetis.
- **Penggunaan Dropdown Menu yang Benar**:
  ```tsx
  import { DropdownMenu } from '@/components/ui/DropdownMenu';
  import { Edit2, Trash2, Eye } from 'lucide-react';

  { key: 'aksi', label: 'Aksi', align: 'right', render: (row) => (
    <div className="flex justify-end">
      <DropdownMenu
        items={[
          {
            label: 'Detail',
            icon: <Eye size={14} />,
            onClick: () => router.push(`/admin/module/${row.id}`)
          },
          {
            label: 'Edit',
            icon: <Edit2 size={14} />,
            onClick: () => openEditModal(row)
          },
          {
            label: 'Hapus',
            icon: <Trash2 size={14} />,
            variant: 'danger',
            onClick: () => handleOpenDelete(row)
          }
        ]}
      />
    </div>
  )}
  ```

---

## 10. Aturan Modal Konfirmasi Aksi Destruktif & Dilarang Dialog Native Browser
- **DILARANG KERAS Dialog Native Browser**: Dilarang keras memanggil `confirm()`, `window.confirm()`, `alert()`, `window.alert()`, `prompt()`, atau `window.prompt()` untuk konfirmasi penghapusan data atau pesan peringatan. Dialog bawaan browser merusak estetika UI, tidak responsif, dan tidak konsisten.
- **Wajib Komponen Modal Konfirmasi UI**: Seluruh aksi penghapusan (Delete) atau aksi destruktif lainnya **WAJIB** menggunakan modal konfirmasi bertema UI aplikasi, yaitu menggunakan `<ConfirmDialog />` dari `@/components/ui/ConfirmDialog` (atau `<Modal />` dengan tombol Batal dan Aksi Destruktif yang memiliki status `isLoading`).
- **Contoh Penggunaan `<ConfirmDialog />`**:
  ```tsx
  import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

  // State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: TItem | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    item: null,
    isLoading: false,
  });

  const handleOpenDelete = (item: TItem) => {
    setDeleteModal({ isOpen: true, item, isLoading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    try {
      setDeleteModal(prev => ({ ...prev, isLoading: true }));
      await apiService.delete(deleteModal.item.id);
      toast.success('Data berhasil dihapus');
      setDeleteModal({ isOpen: false, item: null, isLoading: false });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus data');
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Di dalam JSX:
  <ConfirmDialog
    isOpen={deleteModal.isOpen}
    onClose={() => setDeleteModal({ isOpen: false, item: null, isLoading: false })}
    onConfirm={handleConfirmDelete}
    isLoading={deleteModal.isLoading}
    title="Hapus Data"
    message={<span>Apakah Anda yakin ingin menghapus <strong>{deleteModal.item?.nama}</strong>? Tindakan ini tidak dapat dibatalkan.</span>}
    confirmText="Hapus"
    cancelText="Batal"
    variant="danger"
  />
  ```

---

## 11. Larangan Tombol Refresh & Larangan Search Bar Inline di Atas Tabel
Untuk menjaga kerapian layar dan efisiensi ruang kerja (*clean & uncluttered workspace*):
- **DILARANG KERAS Tombol Refresh**: Dilarang menyediakan tombol *Refresh* / *Segarkan* (seperti ikon `RefreshCw` atau `RefreshCcw`) di header maupun di atas tabel. Pembaruan data tabel sudah otomatis berjalan secara reaktif melalui siklus pagination, filter drawer, dan mutasi aksi (Create/Update/Delete).
- **DILARANG KERAS Search Bar Inline di Atas Tabel**: Dilarang menempatkan search bar (kolom input teks pencarian seperti `<Input placeholder="Cari..." />`) secara inline di atas tabel atau di dalam kartu terpisah di atas tabel. Seluruh input pencarian (kata kunci, status, rentang tanggal, kategori) **WAJIB** dipusatkan ke dalam panel **Filter Drawer** slide kanan-ke-kiri.

---

## 12. Standar Hirarki Ukuran Font Tabel (Max 12px Rule)
Agar tampilan tabel seimbang, padat, dan proporsional tanpa ada teks sel yang mendominasi secara tidak wajar:
- **Ukuran Font Header Tabel (`<th>`)**: Wajib berukuran baku **`0.75rem` (12px / Tailwind `text-xs`)** dengan `font-bold` (700), uppercase, dan tracking renggang (`0.05em`).
- **Ukuran Font Isi Sel Tabel (`<td>`)**: Maksimal berukuran **`0.75rem` (12px / Tailwind `text-xs`)**. **DILARANG KERAS** menggunakan ukuran `text-sm` (14px), `text-base` (16px), atau lebih besar pada teks di dalam sel tabel.
- **Teks Sekunder / Meta / Label Keterangan / Subtext**: Wajib berukuran **`0.625rem` (10px / Tailwind `text-2xs`)** dengan warna sekunder (`text-slate-400` atau `text-slate-500`).
- **Status Kolom Teks Biasa atas Permintaan Eksplisit**: Jika pengguna meminta status sebagai kolom tabel tersendiri tanpa badge, hormati bentuk tersebut. Tampilkan label status teks biasa di kolom `STATUS` menggunakan `text-2xs`; jangan memaksakan `<Badge>` hanya demi konvensi visual. Tanpa permintaan eksplisit, gunakan badge/status component standar.
- **Global Clamping Protection**: Di `app/globals.css`, selector `.table td` wajib membatasi ukuran font maksimal agar elemen inline tidak menembus batas 12px:
  ```css
  .table td .text-sm,
  .table td .text-base,
  .table td .text-lg,
  .table td .text-xl {
    font-size: 0.75rem !important;
    line-height: 1.125rem !important;
  }
  ```

---

## 13. Standar Pola Sel Tabel 2-Baris (Model Data Pegawai) & Navigasi Tab

### A. Format Sel Data 2-Baris (Pola Data Pegawai)
Setiap entitas tabel disarankan menggunakan format 2-baris yang informatif dan padat:
1. **Kolom Identitas / Nomor Induk**:
   - Baris 1: Kode / NIP / NIDN dengan font monospace tebal beraksen (`font-mono font-bold text-primary-600 text-xs`).
   - Baris 2: Label jenis identitas font kecil (`text-2xs text-slate-400 font-mono block`).
2. **Kolom Nama / Entitas Utama**:
   - Baris 1: Nama lengkap atau nama entitas tebal (`font-bold text-slate-800 dark:text-slate-100 text-xs`).
   - Baris 2: Status atau kategori pelengkap (`text-2xs text-slate-400`).
3. **Kolom Unit / Homebase**:
   - Baris 1: Unit utama (`text-xs font-medium text-slate-800 dark:text-slate-200`).
   - Baris 2: Sub-unit atau induk (`text-2xs text-slate-400`).

### B. Standar Tampilan Menu Tab (Jika Halaman Menggunakan Tab)
Jika suatu halaman memiliki sub-navigasi / menu tab, tampilannya **WAJIB** menggunakan gaya **rounded-top underline** yang selaras dengan warna modul:
- **Tab Aktif**: Memiliki border bawah tebal berwarna primary modul, latar belakang lembut warna modul, dan teks tebal warna primary modul (`border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]`).
- **Tab Nonaktif**: Border bawah transparan (`border-transparent`), teks abu-abu (`text-slate-500 hover:text-slate-700 dark:text-slate-400`), dan latar berubah saat disentuh (`hover:bg-slate-100 dark:hover:bg-slate-800`).
- **Contoh Markup Tab Baku**:
  ```tsx
  <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
        className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap ${
          activeTab === tab.key
            ? 'border-[var(--module-primary)] text-[var(--module-primary)] bg-[var(--module-primary-subtle)]'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
      >
        {tab.icon}
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <Badge variant={activeTab === tab.key ? 'primary' : 'gray'} className="text-2xs">
            {tab.count}
          </Badge>
        )}
      </button>
    ))}
  </div>
  ```


