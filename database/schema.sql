-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               12.1.2-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.11.0.7065
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for classinsight_db
DROP DATABASE IF EXISTS `classinsight_db`;
CREATE DATABASE IF NOT EXISTS `classinsight_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci */;
USE `classinsight_db`;

-- Dumping structure for table classinsight_db.tb_log_atensi
DROP TABLE IF EXISTS `tb_log_atensi`;
CREATE TABLE IF NOT EXISTS `tb_log_atensi` (
  `id_log` int(11) NOT NULL AUTO_INCREMENT,
  `id_sesi` varchar(20) NOT NULL,
  `nis` varchar(20) NOT NULL,
  `waktu_kejadian` datetime NOT NULL,
  `durasi_detik` int(11) NOT NULL,
  `kategori` varchar(50) NOT NULL,
  `keterangan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_log`),
  KEY `id_sesi` (`id_sesi`),
  KEY `nis` (`nis`),
  CONSTRAINT `1` FOREIGN KEY (`id_sesi`) REFERENCES `tb_sesi_kelas` (`id_sesi`) ON DELETE CASCADE,
  CONSTRAINT `2` FOREIGN KEY (`nis`) REFERENCES `tb_siswa` (`nis`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table classinsight_db.tb_log_atensi: ~7 rows (approximately)
DELETE FROM `tb_log_atensi`;
INSERT INTO `tb_log_atensi` (`id_log`, `id_sesi`, `nis`, `waktu_kejadian`, `durasi_detik`, `kategori`, `keterangan`) VALUES
	(34, 'KIMIA-1', '11111', '2026-03-27 11:05:56', 7, 'Mengantuk', 'Sistem AI Deteksi Baru'),
	(35, 'KIMIA-1', '11111', '2026-03-27 11:07:08', 4, 'Mengantuk', 'Sistem AI Deteksi Baru'),
	(36, 'KIMIA-1', '11111', '2026-03-27 11:07:25', 4, 'Mengantuk', 'Sistem AI Deteksi Baru'),
	(37, 'KIMIA-1', '11111', '2026-03-27 11:08:05', 5, 'Mengantuk', 'Sistem AI Deteksi Baru'),
	(38, 'BIO-1', '1987', '2026-03-27 14:44:24', 9, 'Berbicara', 'Sistem AI Deteksi Baru'),
	(39, 'BIO-1', '1987', '2026-03-27 14:45:56', 10, 'Berbicara', 'Sistem AI Deteksi Baru'),
	(40, 'BIO-1', '1987', '2026-03-27 14:46:38', 7, 'BOSAN (SAYU)', 'Sistem AI Deteksi Baru');

-- Dumping structure for table classinsight_db.tb_sesi_kelas
DROP TABLE IF EXISTS `tb_sesi_kelas`;
CREATE TABLE IF NOT EXISTS `tb_sesi_kelas` (
  `id_sesi` varchar(20) NOT NULL,
  `mata_pelajaran` varchar(50) NOT NULL,
  `nama_guru` varchar(100) NOT NULL,
  `waktu_mulai` datetime NOT NULL,
  `waktu_selesai` datetime DEFAULT NULL,
  `status` enum('Berjalan','Selesai') DEFAULT 'Berjalan',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id_sesi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table classinsight_db.tb_sesi_kelas: ~4 rows (approximately)
DELETE FROM `tb_sesi_kelas`;
INSERT INTO `tb_sesi_kelas` (`id_sesi`, `mata_pelajaran`, `nama_guru`, `waktu_mulai`, `waktu_selesai`, `status`, `created_at`) VALUES
	('57196', 'MATEMATIKA', 'Cinta', '2026-03-27 14:19:20', NULL, 'Berjalan', '2026-03-27 07:19:20'),
	('BIO-1', 'Pelajaran Berjalan', 'CINTA', '2026-03-27 10:52:04', '2026-03-27 14:48:27', 'Selesai', '2026-03-27 03:52:04'),
	('FISIKA-1', 'Pelajaran Berjalan', 'Guru Pengawas', '2026-03-27 10:42:56', NULL, 'Berjalan', '2026-03-27 03:42:56'),
	('KIMIA-1', 'Pelajaran Berjalan', 'Guru Pengawas', '2026-03-27 11:05:00', NULL, 'Berjalan', '2026-03-27 04:05:00');

-- Dumping structure for table classinsight_db.tb_siswa
DROP TABLE IF EXISTS `tb_siswa`;
CREATE TABLE IF NOT EXISTS `tb_siswa` (
  `nis` varchar(20) NOT NULL,
  `nama_lengkap` varchar(100) NOT NULL,
  `kelas` varchar(10) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`nis`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Dumping data for table classinsight_db.tb_siswa: ~2 rows (approximately)
DELETE FROM `tb_siswa`;
INSERT INTO `tb_siswa` (`nis`, `nama_lengkap`, `kelas`, `created_at`) VALUES
	('11111', 'Siswa AI', 'UMUM', '2026-03-27 04:05:00'),
	('1987', 'Vemas Satria', 'UMUM', '2026-03-27 07:20:01');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
