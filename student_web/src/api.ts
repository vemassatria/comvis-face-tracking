import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://comvis-face-tracking.onrender.com/api';

export const api = {
  checkSession: async (id_sesi: string) => {
    const response = await axios.get(`${API_BASE_URL}/cek-sesi/${id_sesi}`);
    return response.data;
  },

  registerStudent: async (nis: string, nama: string) => {
    const response = await axios.post(`${API_BASE_URL}/register-student`, {
      nis,
      nama
    });
    return response.data;
  },

  sendLogAtensi: async (id_sesi: string, nis: string, durasi_detik: number, kategori: string, keterangan: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/log-atensi`, {
        id_sesi,
        nis,
        durasi_detik,
        kategori,
        keterangan
      });
      return response.data;
    } catch (e) {
      console.error("Gagal mengirim log atensi:", e);
      throw e;
    }
  }
};
