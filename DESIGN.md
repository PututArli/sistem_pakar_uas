# DESIGN.md: Sistem Pakar Evaluasi Kenyamanan Ruang Kerja (WFC / WFH)

## Design Read
Reading this as: Aplikasi web instrumen evaluasi kenyamanan ruang kerja (WFC / WFH) berbasis standar K3 Perkantoran (Permenkes RI No. 48 Tahun 2016) untuk mahasiswa dan pekerja jarak jauh, in a simple, concise warm kafe-academic editorial style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Dials
Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

## Identity & Mood
- **Identity:** Instrumen hitung kelayakan ergonomi ruang kerja berbasis Fuzzy Mamdani dan standar K3 Perkantoran yang ringkas, tenang, dan langsung menuju keputusan.
- **Identity Motif:** Penataan angka sejajar (`tabular-nums`) pada skor akhir `Z*` dan derajat keanggotaan `μ`, dipadukan dengan label peringkat bernomor pada papan perbandingan.
- **Focal Point:** Kartu skor kenyamanan ruang kerja `Z*` (0-100) yang berdampingan langsung dengan kontrol input dan kurva arsiran Centroid.

## Palette & Contrast Decisions (R-25, R-29, R-31)
2 warna inti netral hangat + 1 aksen terakota sangrai, terverifikasi WCAG AA:
- **Mode Terang:** Latar `#F7F2E9`, kartu `#FFFDF8`, permukaan sekunder `#EFE7DA`, teks utama `#211813` (15.63:1), teks sekunder `#5C473B` (7.78:1), garis tepi kontrol `#826C5E` (4.85:1 pada kartu), aksen `#A63A1B` (6.37:1 dengan teks `#FFFDF8`).
- **Mode Gelap:** Latar `#17120F`, kartu `#221B17`, permukaan sekunder `#2E241E`, teks utama `#F4EDE2` (15.98:1), teks sekunder `#C4B3A3` (8.34:1), garis tepi kontrol `#8F7B6C` (4.22:1 pada kartu), aksen `#ED7D55` (6.78:1 dengan teks `#17120F`).
- **Indikator Kategori:** Hijau `#1F5C3A` / `#6BD496` (70-100 Sangat Ideal), Oker `#804E00` / `#F2B84B` (40-69,99 Cukup Nyaman), Merah bata `#9E2A2B` / `#F48687` (0-39,99 Tidak Nyaman), selalu berpasangan dengan simbol dan label teks.

## Typography Decisions (R-06, R-31)
- **Heading (`Georgia, "Times New Roman", serif`):** Memberi karakter editorial akademik tanpa hiasan eyebrow label uppercase di atas judul.
- **UI & Label (`"Segoe UI", system-ui, sans-serif`):** Jelas dan ringkas untuk navigasi, kontrol input, preset kondisi, serta rekomendasi ergonomi.
- **Angka & Persamaan (`"Cascadia Mono", Consolas, monospace`):** Khusus untuk skor numerik, rumus Centroid, dan kode aturan `R1`-`R27`.

## Layout, Spacing, Radius, Shadow & Motion Decisions (R-03, R-05, R-11, R-12, R-14, R-19, R-31)
- **Komposisi 3 Zona Ringkas (RHYTHM 2):**
  1. **Zone 01 (`#evaluasi`)**: Header bersih + judul dan satu kalimat rujukan Permenkes RI No. 48 Tahun 2016 + tombol cepat (`Spot WFC A (Z* 75,00)`, `Rumus Fungsi`), diikuti form ringkas (Nama Ruang + 3 slider berpatokan preset + tombol Simpan/Reset) dan kartu skor `Z*` beserta kepatuhan K3 dan kurva Centroid.
  2. **Zone 02 (`#komparasi`)**: Papan perbandingan 2-3 ruang kerja berdampingan yang otomatis mengurutkan peringkat.
  3. **Zone 03 (`#inspeksi`)**: Panel tab terpadu (`Kurva Input (3)`, `4 Langkah & Ergonomi`, `Basis 27 Aturan`), termasuk pemilih titik sampel Centroid (10 vs 101 titik) di dalam Langkah 4 agar form utama tetap bersih.
  4. **Footer (`#tim`)**: Ambang klasifikasi skor (`0-39,99`, `40-69,99`, `70-100`) dan daftar 4 anggota tim penyusun.
- **Reflow Mobile Sejati (R-03):** Kontrol input dan tabel 27 aturan menyesuaikan susunan di layar sempit (daftar kartu mobile `#all-rules-mobile-list`) agar nol geser horizontal di seluruh ukuran viewport.
