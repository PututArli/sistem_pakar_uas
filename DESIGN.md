# DESIGN.md: Sistem Pakar Evaluasi Kenyamanan Ruang Kerja (WFC)

## Design Read
Reading this as: Aplikasi web instrumen evaluasi kenyamanan ruang kerja kafe (WFC) untuk mahasiswa dan pekerja jarak jauh, in a concise warm kafe-academic editorial style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Dials
Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Identity & Mood
- **Identity:** Instrumen hitung kelayakan ruang kerja kafe berbasis Fuzzy Mamdani yang tenang, presisi, dan langsung ke inti keputusan tanpa paragraf pengisi.
- **Identity Motif:** Penomoran indeks ringkas (`01`..`04`) dengan tipografi angka sejajar (`tabular-nums`) pada skor `Z*` dan derajat keanggotaan `μ`.
- **Focal Point:** Kartu hasil skor `Z*` (0-100) yang berdampingan langsung dengan kontrol input dan kurva arsiran Centroid di paruh atas layar pertama.

## Palette & Contrast Decisions (R-25, R-29, R-31)
2 warna inti netral hangat + 1 aksen terakota sangrai, terverifikasi WCAG AA:
- **Mode Terang:** Latar `#F7F2E9`, kartu `#FFFDF8`, permukaan sekunder `#EFE7DA`, teks utama `#211813` (15.63:1), teks sekunder `#5C473B` (7.78:1), garis tepi kontrol `#826C5E` (4.85:1 pada kartu), aksen `#A63A1B` (6.37:1 dengan teks `#FFFDF8`).
- **Mode Gelap:** Latar `#17120F`, kartu `#221B17`, permukaan sekunder `#2E241E`, teks utama `#F4EDE2` (15.98:1), teks sekunder `#C4B3A3` (8.34:1), garis tepi kontrol `#8F7B6C` (4.22:1 pada kartu), aksen `#ED7D55` (6.78:1 dengan teks `#17120F`).
- **Indikator Kategori:** Hijau `#1F5C3A` / `#6BD496` (70-100 Sangat Ideal), Oker `#804E00` / `#F2B84B` (40-69,99 Santai), Merah bata `#9E2A2B` / `#F48687` (0-39,99 Tidak Disarankan), selalu berpasangan dengan simbol dan label teks.

## Typography Decisions (R-06, R-31)
- **Heading (`Georgia, "Times New Roman", serif`):** Ukuran proporsional pada judul utama dan skor agar memberi karakter editorial tanpa mendominasi ruang kerja.
- **UI & Label (`"Segoe UI", system-ui, sans-serif`):** Bersih dan ringkas untuk navigasi, kontrol input, serta daftar perbandingan.
- **Angka & Persamaan (`"Cascadia Mono", Consolas, monospace`):** Hanya untuk skor numerik, rumus Centroid, dan kode aturan `R1`-`R27`.

## Layout, Spacing, Radius, Shadow & Motion Decisions (R-03, R-05, R-11, R-12, R-14, R-19, R-31)
- **Komposisi Ramping Tanpa Tumpukan Teks (RHYTHM 2):**
  1. **Zone 01 (`#evaluasi`)**: Header kompak satu baris + judul singkat dengan aksi cepat (`Muat Studi Kasus Kafe A`, `Rumus Fungsi`), langsung diikuti Meja Evaluasi 2 kolom (Input Kafe di kiri, Skor Z* + Kurva Centroid di kanan).
  2. **Zone 02 (`#komparasi`)**: Papan Komparasi 2-3 Kafe berdampingan yang otomatis mengurutkan peringkat.
  3. **Zone 03 (`#inspeksi`)**: Panel Inspeksi Model terpadu dalam 3 tab (`Kurva Input (3)`, `4 Langkah Hitung`, `Basis 27 Aturan`) agar transparansi perhitungan dan seluruh 27 aturan tetap satu klik tanpa memanjangkan guliran halaman.
  4. **Footer (`#tim`)**: Referensi ambang klasifikasi (`0-39,99`, `40-69,99`, `70-100`) dan identitas 4 anggota tim penyusun sesuai laporan.
- **Reflow Mobile Sejati (R-03):** Baris input membungkus kontrol numerik ke baris baru pada layar sempit, dan tabel 27 aturan beralih menjadi daftar kartu ringkas di bawah breakpoint `sm` sehingga nol geser horizontal di seluruh lebar layar.
- **Radius, Bayangan & Motion:** Radius `6px` pada kontrol dan `10px` pada kartu utama (R-11); bayangan lembut khusus pada kartu hasil utama dan modal (R-12); transisi mikro pada kondisi hover/fokus sesuai MOTION 1 dan menghormati `prefers-reduced-motion` (R-19).
