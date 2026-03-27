-- Database: classinsight_db
CREATE DATABASE IF NOT EXISTS classinsight_db;
USE classinsight_db;

-- Tabel Master Siswa
CREATE TABLE IF NOT EXISTS tb_siswa (
    nis VARCHAR(20) PRIMARY KEY,
    nama_lengkap VARCHAR(100) NOT NULL,
    kelas VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Jadwal / Sesi Kelas
CREATE TABLE IF NOT EXISTS tb_sesi_kelas (
    id_sesi VARCHAR(20) PRIMARY KEY,
    mata_pelajaran VARCHAR(50) NOT NULL,
    nama_guru VARCHAR(100) NOT NULL,
    waktu_mulai DATETIME NOT NULL,
    waktu_selesai DATETIME,
    status ENUM('Berjalan', 'Selesai') DEFAULT 'Berjalan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Log Atensi (Kejadian siswa kehilangan fokus)
CREATE TABLE IF NOT EXISTS tb_log_atensi (
    id_log INT AUTO_INCREMENT PRIMARY KEY,
    id_sesi VARCHAR(20) NOT NULL,
    nis VARCHAR(20) NOT NULL,
    waktu_kejadian DATETIME NOT NULL,
    durasi_detik INT NOT NULL,
    kategori ENUM('Mengantuk', 'Teralih/Menoleh', 'Menguap', 'Tidak Ada Di Tempat') NOT NULL,
    keterangan VARCHAR(255),
    FOREIGN KEY (id_sesi) REFERENCES tb_sesi_kelas(id_sesi) ON DELETE CASCADE,
    FOREIGN KEY (nis) REFERENCES tb_siswa(nis) ON DELETE CASCADE
);
