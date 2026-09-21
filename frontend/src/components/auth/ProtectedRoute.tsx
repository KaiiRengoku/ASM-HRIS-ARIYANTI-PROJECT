import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { getUser } from "@/features/auth/services/authService";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ roles, children }: { roles?: string[]; children?: React.ReactNode }) {
  const { isAuthenticated, user, token, setAuth, logout, hasRole } = useAuthStore();
  const location = useLocation();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      if (token && !user) {
        try {
          const response = await getUser();
          if (response.success) {
            setAuth(response.data.user, token);
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setIsVerifying(false);
    };

    verifyAuth();
  }, [token, user, setAuth, logout]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/403" replace />;
  }

  return children ?? <Outlet />;
}