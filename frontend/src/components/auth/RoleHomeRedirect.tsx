import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Mengarahkan halaman akar ke dashboard sesuai role pengguna.
 * Sebelumnya selalu ke /dashboard/hrd, sehingga role lain yang membuka alamat
 * polos (mis. localhost:5173) selalu ditolak 403.
 */
const HOME_BY_ROLE: Array<[string, string]> = [
    ["HRD", "/dashboard/hrd"],
    ["DIREKTUR", "/dashboard/direktur"],
    ["PD_I", "/dashboard/pd-1"],
    ["PD_II", "/dashboard/pd-2"],
    ["PD_III", "/dashboard/pd-3"],
    ["KABAG", "/dashboard/kabag"],
    ["DOSEN", "/dashboard/dosen"],
    ["PEGAWAI", "/dashboard/pegawai"],
];

export default function RoleHomeRedirect() {
    const { hasRole } = useAuthStore();
    const match = HOME_BY_ROLE.find(([role]) => hasRole(role));
    return <Navigate to={match ? match[1] : "/dashboard/pegawai"} replace />;
}
