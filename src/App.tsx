import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { ThemeProvider } from "@/data/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" toastOptions={{ style: { fontSize: '13px', fontWeight: 500 } }} />
    </ThemeProvider>
  );
}
