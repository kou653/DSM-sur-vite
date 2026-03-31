import api from "./axios";

export const getPlants = (params = {}) => api.get("/plants", { params });
export const getParcellePlants = (parcelleId) => api.get(`/parcelles/${parcelleId}/plants`);
export const createPlant = (payload) => api.post("/plants", payload);
export const updatePlantStatus = (id, status) => api.patch(`/plants/${id}/status`, { status });
