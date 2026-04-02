import api from "./axios.js";

export const getParcelleEvolution = (parcelleId) =>
  api.get(`/parcelles/${parcelleId}/evolution`);

export const createParcelleEvolution = (parcelleId, payload) =>
  api.post(`/parcelles/${parcelleId}/evolution`, payload, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const deleteEvolutionImage = (imageId) =>
  api.delete(`/evolution/${imageId}`);
