import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/hooks/queryClient";
import "./index.css";
import App from "./App.tsx";
import { useAuthStore } from "@/stores/authStore";

if (import.meta.env.DEV) {
  localStorage.removeItem("asm-hris-auth");
  useAuthStore.getState().logout();
}
// 



createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);