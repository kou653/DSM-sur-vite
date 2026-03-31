import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true, // Requis pour les cookies de session Sanctum
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  }
});

// Intercepteur pour gérer les erreurs 401 (Session expirée)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
