import api from "./axios";

export const getEspeces = () => api.get("/especes");
export const createEspece = (payload) => api.post("/especes", payload);
export const updateEspece = (id, payload) => api.put(`/especes/${id}`, payload);
export const deleteEspece = (id) => api.delete(`/especes/${id}`);

export const getCooperatives = () => api.get("/cooperatives");
export const createCooperative = (payload) => api.post("/cooperatives", payload);
export const updateCooperative = (id, payload) => api.put(`/cooperatives/${id}`, payload);
export const deleteCooperative = (id) => api.delete(`/cooperatives/${id}`);
