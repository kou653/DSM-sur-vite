import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers.Accept = "application/json";
  config.headers["X-Requested-With"] = "XMLHttpRequest";

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    if (error.response?.status === 403) {
      window.location.href = "/access-denied";
    }

    return Promise.reject(error);
  }
);

export default api;
