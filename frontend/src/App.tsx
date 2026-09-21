import { RouterProvider } from "react-router-dom";
import { router } from "@/routes/router";
import { Toaster } from "@/components/ui/toaster";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { useNotifications } from "@/hooks/useNotifications";

function App() {
  useIdleTimer();
  useNotifications();

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

export default App;