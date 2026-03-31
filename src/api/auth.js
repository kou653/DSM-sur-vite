import api from './axios';

function getBackendOrigin() {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  return apiUrl.replace(/\/api\/?$/, '');
}

export const login = async (credentials) => {
  // 1. Initialiser le cookie CSRF (Crucial pour Laravel)
  await api.get(`${getBackendOrigin()}/sanctum/csrf-cookie`);
  
  // 2. Envoyer les identifiants
  return api.post('/login', credentials);
};

export const getMe = () => api.get('/user');

export const logout = () => api.post('/logout');
