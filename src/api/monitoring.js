import api from "./axios";

export const getProjectMonitoring = (projetId) => api.get(`/projets/${projetId}/monitoring`);
export const getParcelleMonitoring = (parcelleId) => api.get(`/parcelles/${parcelleId}/monitoring`);
