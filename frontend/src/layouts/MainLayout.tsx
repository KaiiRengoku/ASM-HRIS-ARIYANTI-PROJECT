import { Outlet, useNavigate } from "react-router-dom";
import { LogOut, User, Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
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
  const { data } = useQuery({ queryKey: ["notifications-latest"], queryFn: fetchLatest });

  const readOne = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-latest"] }),
  });
  const readAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-latest"] }),
  });

  const handleLogout = async () => {
    await logoutService();
    logoutStore();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-foreground">ASM HRIS</h1>
            </div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
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
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <span className="text-sm font-semibold">Notifikasi</span>
                    {(data?.unread ?? 0) > 0 && (
                      <button
                        className="text-xs text-primary hover:underline"
                        onClick={() => readAll.mutate()}
                      >
                        Tandai semua dibaca
                      </button>
                    )}
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
                  <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
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
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}