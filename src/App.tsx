import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";
import { ThemeProvider } from "@/data/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
      <Toaster
        position="bottom-center"
        offset={20}
        gap={8}
        duration={3800}
        toastOptions={{
          unstyled: false,
          className: "aurelo-toast",
          style: {
            background: "var(--surface-overlay)",
            color: "var(--foreground)",
            border: "1px solid var(--hairline)",
            borderRadius: "10px",
            boxShadow: "var(--elev-3)",
            fontSize: "13px",
            fontWeight: 500,
            letterSpacing: "-0.005em",
            padding: "12px 14px",
            backdropFilter: "saturate(180%) blur(12px)",
            WebkitBackdropFilter: "saturate(180%) blur(12px)",
          },
        }}
      />
    </ThemeProvider>
  );
}
