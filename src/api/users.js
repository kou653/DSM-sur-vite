import api from "./axios";

export const getUsers = (params = {}) => api.get("/users", { params });
export const createUser = (payload) => api.post("/users", payload);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);
