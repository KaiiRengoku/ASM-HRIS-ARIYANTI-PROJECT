import { api, setAuthToken } from "@/services/api";

export interface User {
  id: number;
  nik: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface UserResponse {
  success: boolean;
  data: {
    user: User;
  };
}

export const login = async (nik: string, password: string, remember: boolean): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/login", { nik, password, remember });
  if (response.data.success && response.data.data.token) {
    setAuthToken(response.data.data.token);
  }
  return response.data;
};

export const forgotPassword = async (nik: string): Promise<void> => {
  const response = await api.post("/forgot-password", { nik });
  if (!response.data.success) {
    throw new Error(response.data.message || "Gagal mengirim link reset");
  }
};

export const resetPassword = async (data: {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}): Promise<void> => {
  const response = await api.post("/reset-password", data);
  if (!response.data.success) {
    throw new Error(response.data.message || "Gagal reset password");
  }
};

export const logout = async (): Promise<void> => {
  try {
    await api.post("/logout");
  } finally {
    setAuthToken(null);
  }
};

export const getUser = async (): Promise<UserResponse> => {
  const response = await api.get<UserResponse>("/user");
  return response.data;
};