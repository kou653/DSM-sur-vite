import api from "./axios";

export const getProjets = (params = {}) => {
  return api.get("/projets", { params });
};

export const getProjet = (projetId) => {
  return api.get(`/projets/${projetId}`);
};

export const createProjet = (payload) => {
  return api.post("/projets", payload);
};

export const updateProjet = (projetId, payload) => {
  return api.put(`/projets/${projetId}`, payload);
};

export const deleteProjet = (projetId) => {
  return api.delete(`/projets/${projetId}`);
};
