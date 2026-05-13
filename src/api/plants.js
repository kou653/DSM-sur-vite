import api from "./axios";

export const getParcellePlants = (parcelleId) => api.get(`/parcelles/${parcelleId}/plants`);
export const createPlant = (payload) => api.post("/plants", payload);
export const updatePlantStatus = (id, status) => api.patch(`/plants/${id}/status`, { status });
export const updatePlantDocumentation = (id, documentation) =>
  api.patch(`/plants/${id}/documentation`, { documentation });
export const deletePlant = (id) => api.delete(`/plants/${id}`);
export const updatePlant = (id, payload) => api.put(`/plants/${id}`, payload);
