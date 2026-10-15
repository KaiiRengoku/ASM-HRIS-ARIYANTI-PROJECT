import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

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
    // 401 dari POST /login = kredensial salah, bukan sesi berakhir — jangan
    // bersihkan state / tampilkan notice "sesi berakhir".
    const isLoginRequest = error.config?.url?.endsWith('/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      // Sesi ditolak server: bersihkan dulu, baru ke halaman login.
      // Tanpa ini halaman login memantulkan balik ke dashboard dan
      // terjadi pengalihan berulang tanpa henti.
      try {
        localStorage.removeItem("asm-hris-auth");
      } catch {
        // abaikan: localStorage tidak tersedia
      }
      useAuthStore.getState().logout();
      // Hapus juga header Authorization default, bukan hanya localStorage —
      // tanpa ini request berikutnya masih membawa token yang sudah ditolak.
      setAuthToken(null);
      if (window.location.pathname !== "/login") {
        // Beri tahu pengguna mengapa tiba-tiba diminta login lagi (mis. sesi 60 menit habis),
        // bukan gagal senyap. Halaman login membaca kunci ini lalu menghapusnya.
        try {
          sessionStorage.setItem("asm-hris-auth-notice", "Sesi Anda telah berakhir. Silakan masuk kembali.");
        } catch {
          // abaikan: sessionStorage tidak tersedia
        }
        window.location.href = "/login";
      }
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