import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://comvis-face-tracking.onrender.com/api';

export const api = {
  fetchActiveSessions: async () => {
    const response = await axios.get(`${API_BASE_URL}/sesi-aktif`);
    return response.data.data;
  },

  createClassSession: async (id_sesi: string, mata_pelajaran: string, nama_guru: string) => {
    const response = await axios.post(`${API_BASE_URL}/sesi`, {
      id_sesi,
      mata_pelajaran,
      nama_guru,
    });
    return response.data;
  },

  checkSession: async (id_sesi: string) => {
    const response = await axios.get(`${API_BASE_URL}/cek-sesi/${id_sesi}`);
    return response.data;
  },

  updateTeacher: async (id_sesi: string, nama_guru: string) => {
    const response = await axios.post(`${API_BASE_URL}/update-guru`, {
      id_sesi,
      nama_guru,
    });
    return response.data;
  },

  fetchClassLogs: async (id_sesi: string) => {
    const response = await axios.get(`${API_BASE_URL}/status-kelas/${id_sesi}`);
    return response.data.data;
  },

  closeSession: async (id_sesi: string) => {
    const response = await axios.post(`${API_BASE_URL}/tutup-sesi`, {
      id_sesi,
    });
    return response.data;
  }
};
