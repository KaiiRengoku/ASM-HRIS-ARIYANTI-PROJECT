import { NavLink } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LayoutDashboard, Users, FileText, CalendarDays, ClipboardCheck, Calendar, BarChart3, History, ShieldCheck, X } from "lucide-react";
import logo from "@/assets/logo_asm.png";

const ALL = ["PEG", "HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III", "KABAG"];

const menuItems = [
  { label: "Dashboard", href: null, icon: LayoutDashboard, roles: ALL, permission: null },
  { label: "Pegawai", href: "/pegawai", icon: Users, roles: ALL, permission: "employee.view" },
  { label: "Dokumen", href: "/dokumen", icon: FileText, roles: ALL, permission: "document.view" },
  { label: "Cuti & Izin", href: "/cuti", icon: CalendarDays, roles: ALL, permission: "leave.view" },
  { label: "Approval", href: "/approval", icon: ClipboardCheck, roles: ALL, permission: "leave.approve" },
  { label: "Kalender", href: "/kalender", icon: Calendar, roles: ALL, permission: null },
  { label: "Laporan", href: "/laporan", icon: BarChart3, roles: ALL, permission: "report.view" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { hasRole, hasPermission } = useAuthStore();

  const userRoles = hasRole("HRD") ? ["HRD"] : hasRole("DIREKTUR") ? ["DIREKTUR"] : hasRole("PD_I") ? ["PD_I"] : hasRole("PD_II") ? ["PD_II"] : hasRole("PD_III") ? ["PD_III"] : hasRole("KABAG") ? ["KABAG"] : ["PEG"];

  const dashboardHref = (() => {
    if (hasRole("HRD")) return "/dashboard/hrd";
    if (hasRole("DIREKTUR")) return "/dashboard/direktur";
    if (hasRole("PD_I")) return "/dashboard/pd-1";
    if (hasRole("PD_II")) return "/dashboard/pd-2";
    if (hasRole("PD_III")) return "/dashboard/pd-3";
    if (hasRole("KABAG")) return "/dashboard/kabag";
    return "/dashboard/pegawai";
  })();

  const filteredMenu = menuItems.filter((item) => {
    if (!item.roles.some((r) => userRoles.includes(r))) return false;
    if (item.permission && !hasPermission(item.permission)) return false;
    return true;
  });

  return (
    <>
      <div className="p-4 border-b border-border flex items-center gap-3">
        <img src={logo} alt="ASM HRIS Logo" className="h-8 w-auto" />
        <div>
          <h1 className="text-xl font-bold text-primary">ASM HRIS</h1>
          <p className="text-xs text-muted-foreground">Sistem Informasi Kepegawaian</p>
        </div>
      </div>
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto" onClick={onNavigate}>
        {filteredMenu.map((item) => {
          const href = item.label === "Dashboard" ? dashboardHref : (item.href || "/");
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={href}
              className={({ isActive }) =>
                `flex items-center gap-3 w-full px-5 py-2.5 rounded-none text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      {hasPermission("audit.view") && (
        <NavLink
          to="/audit-logs"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-5 py-2.5 rounded-none text-sm font-medium transition-colors border-t border-border ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <History className="h-4 w-4 shrink-0" />
          Audit Trail
        </NavLink>
      )}
      {hasPermission("auth.role.manage") && (
        <NavLink
          to="/hak-akses"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full px-5 py-2.5 rounded-none text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`
          }
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Hak Akses
        </NavLink>
      )}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">v1.0.0</div>
      </div>
    </>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-background h-screen sticky top-0 flex-col">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside className="relative flex flex-col h-full w-64 max-w-[80vw] border-r border-border bg-background">
        <button
          onClick={onClose}
          aria-label="Tutup menu"
          className="absolute right-2 top-2 p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </aside>
    </div>
  );
}
