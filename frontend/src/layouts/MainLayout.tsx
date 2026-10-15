import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { LogOut, User, Bell, Menu } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar, { MobileSidebar } from "@/components/layout/Sidebar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";
import { logout as logoutService } from "@/features/auth/services/authService";
import { api } from "@/services/api";

const fetchLatest = async () => {
  const res = await api.get("/notifications", { params: { limit: 5 } });
  return { items: res.data.data, unread: res.data.unread_count };
};

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, logout: logoutStore } = useAuthStore();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  // PENGAMAN CADANGAN: bila websocket/realtime (Reverb) mati atau tersendat,
  // notifikasi tetap tersegarkan lewat pengecekan berkala tiap 20 detik.
  // Saat realtime normal, lonceng tetap ter-update seketika (invalidateQueries dari useNotifications).
  // refetchIntervalInBackground: true -> tetap berjalan saat tab tidak aktif, agar notifikasi
  // tidak sampai hilang/terlewat (prioritas pemilik). enabled membatasi agar tidak ada
  // permintaan saat pengguna belum login. Polling ini hanya menyegarkan DAFTAR & JUMLAH,
  // tanpa memunculkan toast (toast tetap hanya dari listener Echo), jadi tidak berisik.
  const { data } = useQuery({
    queryKey: ["notifications-latest"],
    queryFn: fetchLatest,
    enabled: !!user,
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const readOne = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-latest"] }),
  });
  const readAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-latest"] }),
  });

  const handleLogout = async () => {
    try {
      await logoutService();
    } finally {
      // Bersihkan state lokal apa pun hasil panggilan server, agar sesi tidak
      // tertinggal saat jaringan/server error.
      logoutStore();
      // Buang seluruh cache data user lama agar tidak terbawa saat ganti akun.
      queryClient.clear();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <MobileSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/60 bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70 sticky top-0 z-10 shadow-[0_1px_12px_-6px_rgb(28_25_23/0.12)]">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="Buka menu"
                className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-foreground">ASM HRIS</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative p-2.5 rounded-xl border border-border/60 bg-background shadow-xs hover:bg-accent hover:border-primary/30 hover:text-foreground transition-all duration-200 text-muted-foreground"
                    aria-label="Notifikasi"
                  >
                    <Bell className="h-5 w-5" />
                    {(data?.unread ?? 0) > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center">
                        {(data?.unread ?? 0) > 9 ? "9+" : data?.unread}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-1.5rem)] p-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="text-sm font-semibold">Notifikasi</span>
                    <div className="flex items-center gap-3">
                    {(data?.unread ?? 0) > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => readAll.mutate()}
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {!data?.items?.length ? (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
                    ) : (
                      data.items.map((n: any) => (
                        <button
                          key={n.id}
                          onClick={() => !n.read_at && readOne.mutate(n.id)}
                          className={`w-full text-left px-3 py-2.5 border-b last:border-0 hover:bg-accent transition-colors ${!n.read_at ? "bg-accent/40" : ""}`}
                        >
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{n.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                        </button>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[#8F0000] flex items-center justify-center text-primary-foreground text-sm font-bold shadow-[0_2px_10px_-2px_rgb(211_0_0/0.5)] hover:shadow-[0_4px_16px_-2px_rgb(211_0_0/0.55)] hover:scale-105 transition-all duration-200 ring-2 ring-primary/15">
                    {user?.name?.charAt(0) || "U"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto animate-page-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}