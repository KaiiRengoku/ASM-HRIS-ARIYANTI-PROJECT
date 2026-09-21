import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (!(config.headers as Record<string, string> | undefined)?.["Authorization"]) {
    try {
      const raw = localStorage.getItem("asm-hris-auth");
      const token = raw ? (JSON.parse(raw) as { state?: { token?: string | null } }).state?.token : null;
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // abaikan: token tidak valid, biarkan request jalan tanpa header
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = "/login";
    }
    if (error.response?.status === 403 && !window.location.pathname.startsWith("/403")) {
      window.location.href = "/403";
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};