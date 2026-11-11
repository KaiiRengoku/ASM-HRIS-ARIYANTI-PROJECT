import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { router } from "@/routes/router";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { useNotifications } from "@/hooks/useNotifications";

function App() {
  useIdleTimer();
  useNotifications();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton
        offset={16}
        toastOptions={{ classNames: { toast: "rounded-lg shadow-lg text-sm" } }}
      />
    </>
  );
}

export default App;
