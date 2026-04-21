import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export async function analyzePageContext(context, data) {
  const token = localStorage.getItem("token");
  return axios.post(
    `${API_URL}/ai/analyze`,
    { context, data },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
