import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LayoutDashboard, Users, FileText, CalendarDays, ClipboardCheck, Calendar, BarChart3, History, ShieldCheck, X } from "lucide-react";
import logo from "@/assets/logo_asm.png";

const ALL = ["DOSEN", "PEGAWAI", "HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III", "KABAG"];
const REPORT = ["HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III"];

const menuItems = [
  { label: "Dashboard", href: null, icon: LayoutDashboard, roles: ALL, permission: null },
  { label: "Pegawai", href: "/pegawai", icon: Users, roles: ALL, permission: "employee.view" },
  { label: "Dokumen", href: "/dokumen", icon: FileText, roles: ALL, permission: "document.view" },
  { label: "Cuti & Izin", href: "/cuti", icon: CalendarDays, roles: ALL, permission: "leave.view" },
  { label: "Approval", href: "/approval", icon: ClipboardCheck, roles: ALL, permission: "leave.approve" },
  { label: "Kalender", href: "/kalender", icon: Calendar, roles: ALL, permission: null },
  { label: "Laporan", href: "/laporan", icon: BarChart3, roles: REPORT, permission: "report.view" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, hasRole, hasPermission } = useAuthStore();

  const userRoles = user?.roles ?? [];

  const dashboardHref = (() => {
    if (hasRole("HRD")) return "/dashboard/hrd";
    if (hasRole("DIREKTUR")) return "/dashboard/direktur";
    if (hasRole("PD_I")) return "/dashboard/pd-1";
    if (hasRole("PD_II")) return "/dashboard/pd-2";
    if (hasRole("PD_III")) return "/dashboard/pd-3";
    if (hasRole("KABAG")) return "/dashboard/kabag";
    if (hasRole("DOSEN")) return "/dashboard/dosen";
    return "/dashboard/pegawai";
  })();

  const filteredMenu = menuItems.filter((item) => {
    if (!item.roles.some((r) => userRoles.includes(r))) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/60 p-4">
        <img src={logo} alt="ASM HRIS Logo" className="h-10 w-10 rounded-xl bg-accent object-contain p-1 shadow-xs" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-foreground">ASM <span className="text-primary">HRIS</span></h1>
          <p className="truncate text-[11px] font-medium text-muted-foreground">Sistem Informasi Kepegawaian</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" onClick={onNavigate}>
        {filteredMenu.map((item) => {
          const href = item.label === "Dashboard" ? dashboardHref : (item.href || "/");
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={href}
              className={({ isActive }) =>
                `group flex items-center gap-3 w-full rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-[0_4px_14px_-4px_rgb(211_0_0/0.6)]"
                    : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      {hasPermission("audit.view") && (
        <NavLink
          to="/audit-logs"
          onClick={onNavigate}
          className={({ isActive }) =>
            `group mx-3 mb-1 flex items-center gap-3 w-[calc(100%-1.5rem)] rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-[0_4px_14px_-4px_rgb(211_0_0/0.6)]"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <History className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="truncate">Audit Trail</span>
        </NavLink>
      )}
      {hasPermission("auth.role.manage") && (
        <NavLink
          to="/hak-akses"
          onClick={onNavigate}
          className={({ isActive }) =>
            `group mx-3 flex items-center gap-3 w-[calc(100%-1.5rem)] rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-[0_4px_14px_-4px_rgb(211_0_0/0.6)]"
                : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <ShieldCheck className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="truncate">Hak Akses</span>
        </NavLink>
      )}
      <div className="border-t border-border/60 p-4">
        <div className="text-[11px] font-medium text-muted-foreground">v1.0.0</div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-[260px] shrink-0 border-r border-border/60 bg-card/80 backdrop-blur h-screen sticky top-0 flex-col shadow-[var(--shadow-card)]">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [visible, setVisible] = useState(open);
  // `shown` baru di-set setelah browser sempat mengecat keadaan awal
  // (tergeser penuh), supaya transisinya benar-benar terpicu.
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) {
      setVisible(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setShown(false);
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out ${
          shown ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`relative flex flex-col h-full w-64 max-w-[80vw] border-r border-border bg-background shadow-xl transition-transform duration-300 ease-out will-change-transform ${
          shown ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute right-2 top-2 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
