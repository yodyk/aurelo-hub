import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" toastOptions={{ style: { fontSize: '13px', fontWeight: 500 } }} />
    </>
  );
}
