# PROPOSAL INOVASI TEKNOLOGI

**JUDUL:** 
ClassInsight: Sistem Cerdas Pemantauan Atensi Siswa Berbasis Computer Vision untuk Otomatisasi Evaluasi dan Manajemen Pembelajaran

---

## 1. Latar Belakang
Dalam metode pembelajaran modern, baik secara luring di laboratorium komputer maupun secara daring, tantangan terbesar bagi tenaga pendidik adalah memantau tingkat fokus dan atensi siswa secara individual. Pendekatan manual di mana guru harus mengawasi puluhan siswa sekaligus sangatlah tidak efektif. Siswa yang kehilangan fokus—mulai dari mengantuk, menguap karena bosan, mengalihkan pandangan dari layar materi, hingga meninggalkan tempat duduk—seringkali luput dari pantauan, sehingga evaluasi pembelajaran menjadi bias dan tidak berdasarkan data historis yang akurat.

## 2. Rumusan Masalah
1. Bagaimana cara memonitor tingkat atensi seluruh siswa di kelas secara *real-time* tanpa mengganggu jalannya proses belajar mengajar?
2. Bagaimana cara mengotomatisasi pencatatan data kedisiplinan dan fokus siswa sebagai bahan evaluasi Manajemen Sekolah dan Guru Bimbingan Konseling (BK)?

## 3. Solusi yang Ditawarkan (ClassInsight)
**ClassInsight** hadir sebagai solusi berbasis *Computer Vision* dan *Artificial Intelligence* (AI). Sistem ini bekerja secara *seamless* di latar belakang perangkat siswa dengan memanfaatkan *webcam* standar untuk melacak atensi wajah tanpa menyimpan rekaman video (menjaga privasi), melainkan hanya mengekstrak metrik angka koordinat wajah secara lokal. Seluruh data pelanggaran atensi akan diakumulasikan dan disajikan kepada guru dalam bentuk *Dashboard Analytics* yang *real-time*.

## 4. Fitur Utama & Logika Sistem (Multi-State Logic)
Sistem ClassInsight telah dilengkapi dengan modul deteksi AI canggih yang mampu mengklasifikasikan 5 status atensi siswa:
1. **Fokus:** Siswa menatap layar dan beraktivitas normal.
2. **Mengantuk / Tidur:** Dideteksi menggunakan kalkulasi *Eye Aspect Ratio* (EAR) dengan stabilisasi *Exponential Moving Average* (EMA).
3. **Menguap (Kebosanan / Kelelahan):** Dideteksi menggunakan *Mouth Aspect Ratio* (MAR) ketika mulut terbuka lebar dalam durasi tertentu.
4. **Teralih / Menoleh:** Dideteksi menggunakan rasio pendaran *Euclidean Distance* dari hidung ke mata untuk mengetahui apakah wajah berpaling dari materi pelajaran.
5. **Tidak Ada Di Tempat (Absent):** Dideteksi ketika klasifikasi wajah hilang dari jangkauan kamera secara total.

Setiap kehilangan fokus yang melebihi standar toleransi waktu (misal: > 5 detik) akan langsung dikirimkan ke server secara otomatis sebagai log catatan indisipliner.

## 5. Arsitektur Sistem (Tech Stack)
ClassInsight dibangun menggunakan arsitektur *microservices* yang ringan dan efisien:
- **AI Engine & Endpoint Server:** Python 3.12+ dipadukan dengan Google MediaPipe Tasks API (*Face Landmarker*) dan OpenCV untuk pemrosesan citra instan. Flask digunakan sebagai REST API Jembatan Data.
- **Client Desktop Siswa:** C# .NET Windows Forms. Didesain *borderless* bergaya modern yang dapat berjalan tersembunyi (*System Tray*) agar layar siswa tetap bersih untuk belajar.
- **Database Server:** MariaDB (SQL) untuk menampung *master data* siswa, jadwal sesi kelas, dan ratusan ribu baris log atensi secara terstruktur.
- **Dashboard Monitoring Guru:** Flutter (Dart) untuk menyajikan visualisasi data *real-time* dan analitik laporan (*exportable*) yang bisa diakses via Web, Tablet, maupun *Smartphone*.

## 6. Manfaat dan Dampak
- **Bagi Guru:** Mendapatkan asisten virtual yang secara objektif menyoroti siswa mana yang membutuhkan perhatian ekstra tepat pada detik kejadian.
- **Bagi Manajemen / BK:** Memiliki *database* atau buku saku digital berisi rekaman harian fokus tiap siswa yang bisa dicetak menjadi laporan PDF otentik untuk diserahkan ke wali murid.
- **Bagi Siswa:** Meningkatkan kesadaran disiplin mandiri (*self-awareness*) selama jam pelajaran berlangsung karena menyadari sistem yang objektif sedang berjalan.
