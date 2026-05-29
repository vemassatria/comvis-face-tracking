import { Router, Request, Response } from 'express';
import pool from './db';
import { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/status-kelas/:id_sesi
router.get('/status-kelas/:id_sesi', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM tb_log_atensi WHERE id_sesi = ? ORDER BY waktu_kejadian DESC LIMIT 50',
      [id_sesi]
    );
    return res.json({ status: 'success', id_sesi, data: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/sesi
router.post('/sesi', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi, mata_pelajaran, nama_guru } = req.body;
    await pool.query(
      'INSERT INTO tb_sesi_kelas (id_sesi, mata_pelajaran, nama_guru, waktu_mulai) VALUES (?, ?, ?, NOW())',
      [id_sesi, mata_pelajaran, nama_guru]
    );
    return res.json({ status: 'success', message: `Sesi ${id_sesi} dimulai.` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/sesi-aktif
router.get('/sesi-aktif', async (req: Request, res: Response): Promise<any> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id_sesi, mata_pelajaran FROM tb_sesi_kelas WHERE status = 'Berjalan'"
    );
    return res.json({ status: 'success', data: rows });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/update-guru
router.post('/update-guru', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi, nama_guru } = req.body;
    if (!id_sesi || !nama_guru) return res.status(400).json({ error: 'No data' });
    await pool.query(
      'UPDATE tb_sesi_kelas SET nama_guru = ? WHERE id_sesi = ?',
      [nama_guru, id_sesi]
    );
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/tutup-sesi
router.post('/tutup-sesi', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi } = req.body;
    await pool.query(
      "UPDATE tb_sesi_kelas SET waktu_selesai = NOW(), status = 'Selesai' WHERE id_sesi = ?",
      [id_sesi]
    );
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/cek-sesi/:id_sesi
router.get('/cek-sesi/:id_sesi', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT status, mata_pelajaran FROM tb_sesi_kelas WHERE id_sesi = ?',
      [id_sesi]
    );
    
    if (rows.length === 0) {
      return res.json({ status: 'not_found', message: 'PIN tidak ditemukan.' });
    }
    
    if (rows[0].status !== 'Berjalan') {
      return res.json({ status: 'closed', message: 'Sesi telah ditutup.' });
    }
    
    return res.json({ status: 'active', message: 'Sesi berjalan.', mata_pelajaran: rows[0].mata_pelajaran });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/register-student
router.post('/register-student', async (req: Request, res: Response): Promise<any> => {
  try {
    const { nis, nama } = req.body;
    await pool.query(
      "INSERT IGNORE INTO tb_siswa (nis, nama_lengkap, kelas) VALUES (?, ?, 'UMUM')",
      [nis, nama]
    );
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/log-atensi
router.post('/log-atensi', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id_sesi, nis, durasi_detik, kategori, keterangan } = req.body;
    await pool.query(
      'INSERT INTO tb_log_atensi (id_sesi, nis, waktu_kejadian, durasi_detik, kategori, keterangan) VALUES (?, ?, NOW(), ?, ?, ?)',
      [id_sesi, nis, durasi_detik, kategori, keterangan || '']
    );
    return res.json({ status: 'success' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
