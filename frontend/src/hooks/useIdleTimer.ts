import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { logout } from "@/features/auth/services/authService";

const IDLE_TIMEOUT = 60 * 60 * 1000; // 60 minutes

export function useIdleTimer() {
  const { isAuthenticated, logout: logoutStore } = useAuthStore();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (isAuthenticated) {
      timeoutRef.current = setTimeout(async () => {
        await logout();
        logoutStore();
      }, IDLE_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAuthenticated]);

  return { resetTimer };
}