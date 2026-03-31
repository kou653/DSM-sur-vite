import api from "./axios";

export const login = (credentials) => api.post("/login", credentials);

export const getMe = () => api.get("/user");

export const logout = () => api.post("/logout");
