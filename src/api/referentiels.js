import api from "./axios";

export const getEspeces = () => api.get("/especes");
export const getCooperatives = () => api.get("/cooperatives");
