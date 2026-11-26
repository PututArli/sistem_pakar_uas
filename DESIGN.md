# DESIGN.md: Sistem Pakar Evaluasi Kenyamanan Ruang Kerja (WFC / WFH)

## Design Read
Reading this as: Aplikasi web multi-halaman sistem pakar evaluasi kenyamanan ruang kerja (WFC / WFH) berbasis standar K3 Perkantoran (Permenkes RI No. 48 Tahun 2016) untuk mahasiswa dan pekerja jarak jauh, in a simple, concise warm kafe-academic editorial style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Dials
Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Arsitektur 4 Halaman
Setiap halaman punya satu tugas utama dan berbagi ruang kerja aktif serta daftar komparasi lewat `localStorage` (`src/store.js`):
1. `index.html` (Evaluasi): input suhu, kebisingan, pencahayaan + patokan preset, skor `Z*`, status K3, kurva Centroid. Alasan: keputusan utama pengguna terjadi di sini, jadi halaman ini dibuka pertama.
2. `komparasi.html` (Komparasi): kartu peringkat 2-3 ruang kerja dan grafik batang skor `Z*`. Alasan: memilih tempat kerja terbaik adalah tugas terpisah dari mengukur satu tempat.
3. `perhitungan.html` (Perhitungan): rekomendasi ergonomi K3, 3 kurva input, dan 4 langkah Mamdani dengan pemilih ruang aktif. Alasan: transparansi hitungan dibutuhkan saat verifikasi, bukan saat input.
4. `aturan.html` (Aturan & Tim): 27 aturan dengan filter, persamaan fungsi keanggotaan, ambang klasifikasi, dan tim penyusun. Alasan: materi referensi dikumpulkan di satu halaman rujukan.

## Navigasi
- Halaman aktif memakai `aria-current="page"` dan ditandai dengan bobot huruf, latar permukaan, garis tepi, serta garis bawah aksen, jadi tidak bergantung pada warna saja (R-24, R-25).
- Lencana `X/3` pada tautan Komparasi menampilkan jumlah ruang tersimpan di semua halaman.
- Di bawah breakpoint `md`, navigasi berpindah ke drawer bertombol "Menu" yang tertutup dengan `Escape`.

## Palet, Tipografi & Aksesibilitas (R-06, R-25, R-29, R-31)
- **Mode Terang:** latar `#F7F2E9`, kartu `#FFFDF8`, sekunder `#EFE7DA`, teks `#211813` (15.63:1), teks sekunder `#5C473B` (7.78:1), garis kontrol `#826C5E` (4.85:1), aksen `#A63A1B` (6.37:1 dengan `#FFFDF8`).
- **Mode Gelap:** latar `#17120F`, kartu `#221B17`, sekunder `#2E241E`, teks `#F4EDE2` (15.98:1), teks sekunder `#C4B3A3` (8.34:1), garis kontrol `#8F7B6C` (4.22:1), aksen `#ED7D55` (6.78:1 dengan `#17120F`).
- **Kategori:** hijau (70-100 Sangat Ideal), oker (40-69,99 Cukup Nyaman), merah bata (0-39,99 Tidak Nyaman), selalu disertai simbol `[+]`, `[~]`, `[-]` dan label teks.
- **Tipografi:** `Georgia` untuk judul editorial, sans-serif sistem untuk UI, monospace hanya untuk angka tabular, rumus, dan kode aturan.
- **Radius & bayangan:** `6px` kontrol, `10px` kartu; bayangan hanya pada kartu skor utama, peringkat 1, dan dialog.
