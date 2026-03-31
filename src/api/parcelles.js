import api from "./axios";

export const getParcelles = (params = {}) => api.get("/parcelles", { params });
export const getParcelle = (id) => api.get(`/parcelles/${id}`);
export const getProjetParcelles = (projetId) => api.get(`/projets/${projetId}/parcelles`);
export const createProjetParcelle = (projetId, payload) => api.post(`/projets/${projetId}/parcelles`, payload);
export const updateParcelle = (id, payload) => api.put(`/parcelles/${id}`, payload);
export const deleteParcelle = (id) => api.delete(`/parcelles/${id}`);
