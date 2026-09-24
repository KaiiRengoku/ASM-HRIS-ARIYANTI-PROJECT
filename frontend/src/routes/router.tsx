import { createBrowserRouter, Navigate } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import LoginPage from "@/features/auth/pages/LoginPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import MainLayout from "@/layouts/MainLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ForbiddenPage from "@/components/auth/ForbiddenPage";
import HRDDashboard from "@/features/dashboard/pages/HRDDashboard";
import DirekturDashboard from "@/features/dashboard/pages/DirekturDashboard";
import PD1Dashboard from "@/features/dashboard/pages/PD1Dashboard";
import PD2Dashboard from "@/features/dashboard/pages/PD2Dashboard";
import PD3Dashboard from "@/features/dashboard/pages/PD3Dashboard";
import KabagDashboard from "@/features/dashboard/pages/KabagDashboard";
import PegawaiDashboard from "@/features/dashboard/pages/PegawaiDashboard";
import EmployeeListPage from "@/features/employees/pages/EmployeeListPage";
import EmployeeFormPage from "@/features/employees/pages/EmployeeFormPage";
import EmployeeDetailPage from "@/features/employees/pages/EmployeeDetailPage";
import DocumentListPage from "@/features/documents/pages/DocumentListPage";
import LeaveListPage from "@/features/leave/pages/LeaveListPage";
import LeaveFormPage from "@/features/leave/pages/LeaveFormPage";
import LeaveDetailPage from "@/features/leave/pages/LeaveDetailPage";
import LeaveEditPage from "@/features/leave/pages/LeaveEditPage";
import CalendarPage from "@/features/calendar/pages/CalendarPage";
import ReportPage from "@/features/reports/pages/ReportPage";
import ApprovalPage from "@/features/approval/pages/ApprovalPage";
import LeaveBalanceAdjustPage from "@/features/leave/pages/LeaveBalanceAdjustPage";
import WorkSchedulePage from "@/features/work-schedule/pages/WorkSchedulePage";
import AuditLogPage from "@/features/audit/pages/AuditLogPage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import ChangePasswordPage from "@/features/profile/pages/ChangePasswordPage";
import HakAksesPage from "@/features/access/pages/HakAksesPage";

const HRD = ["HRD"];
const HRD_DIREKTUR_PD = ["HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III"];
const HRD_KABAG = ["HRD", "KABAG"];
const ALL_ROLES = ["HRD", "DIREKTUR", "PD_I", "PD_II", "PD_III", "KABAG", "PEG"];

const protectedRoutes = [
  { path: "/dashboard/hrd", element: <HRDDashboard />, roles: HRD },
  { path: "/dashboard/direktur", element: <DirekturDashboard />, roles: ["DIREKTUR"] },
  { path: "/dashboard/pd-1", element: <PD1Dashboard />, roles: ["PD_I"] },
  { path: "/dashboard/pd-2", element: <PD2Dashboard />, roles: ["PD_II"] },
  { path: "/dashboard/pd-3", element: <PD3Dashboard />, roles: ["PD_III"] },
  { path: "/dashboard/kabag", element: <KabagDashboard />, roles: ["KABAG"] },
  { path: "/dashboard/pegawai", element: <PegawaiDashboard />, roles: ["PEG"] },
  { path: "/pegawai", element: <EmployeeListPage />, roles: HRD_DIREKTUR_PD },
  { path: "/pegawai/create", element: <EmployeeFormPage />, roles: HRD },
  { path: "/pegawai/:id", element: <EmployeeDetailPage />, roles: HRD_DIREKTUR_PD },
  { path: "/pegawai/:id/edit", element: <EmployeeFormPage />, roles: HRD },
  { path: "/dokumen", element: <DocumentListPage />, roles: ALL_ROLES },
  { path: "/cuti", element: <LeaveListPage />, roles: ALL_ROLES },
  { path: "/cuti/create", element: <LeaveFormPage />, roles: ALL_ROLES },
  { path: "/cuti/:id", element: <LeaveDetailPage />, roles: ALL_ROLES },
  { path: "/cuti/:id/edit", element: <LeaveEditPage />, roles: HRD },
  { path: "/kalender", element: <CalendarPage />, roles: ALL_ROLES },
  { path: "/laporan", element: <ReportPage />, roles: HRD_DIREKTUR_PD },
  { path: "/approval", element: <ApprovalPage />, roles: HRD_KABAG },
  { path: "/pengguna", element: <Navigate to="/pegawai" replace /> },
  { path: "/cuti/saldo/adjust", element: <LeaveBalanceAdjustPage />, roles: HRD },
  { path: "/work-schedules", element: <WorkSchedulePage />, roles: ALL_ROLES },
  { path: "/audit-logs", element: <AuditLogPage />, roles: HRD },
  { path: "/hak-akses", element: <HakAksesPage />, roles: HRD },
  { path: "/profile", element: <ProfilePage />, roles: ALL_ROLES },
  { path: "/profile/password", element: <ChangePasswordPage />, roles: ALL_ROLES },
];

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <AuthLayout />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: "/forgot-password",
    element: <AuthLayout />,
    children: [{ index: true, element: <ForgotPasswordPage /> }],
  },
  {
    path: "/reset-password",
    element: <AuthLayout />,
    children: [{ index: true, element: <ResetPasswordPage /> }],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/403", element: <ForbiddenPage /> },
      {
        element: <MainLayout />,
        children: protectedRoutes.map((r) => ({
          path: r.path,
          element: <ProtectedRoute roles={r.roles}>{r.element}</ProtectedRoute>,
        })),
      },
    ],
  },
  { path: "/", element: <Navigate to="/dashboard/hrd" replace /> },
]);