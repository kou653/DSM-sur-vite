import api from "./axios";

export const getEspeces = () => api.get("/especes");
export const createEspece = (payload) => api.post("/especes", payload);
export const updateEspece = (id, payload) => api.put(`/especes/${id}`, payload);
export const deleteEspece = (id) => api.delete(`/especes/${id}`);

export const getCooperatives = (params = {}) => api.get("/cooperatives", { params });
export const getProjetCooperatives = (projetId) => api.get(`/projets/${projetId}/cooperatives`);
export const createCooperative = (payload) => api.post("/cooperatives", payload);
export const createProjetCooperative = (projetId, payload) =>
  api.post(`/projets/${projetId}/cooperatives`, payload);
export const updateCooperative = (id, payload) => api.put(`/cooperatives/${id}`, payload);
export const deleteCooperative = (id) => api.delete(`/cooperatives/${id}`);
