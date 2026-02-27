import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Menu } from "lucide-react";
import { AuthProvider } from "@/data/AuthContext";
import { DataProvider } from "@/data/DataContext";
import { PlanProvider } from "@/data/PlanContext";
import { ThemeProvider } from "@/data/ThemeContext";

export default function Root() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <DataProvider>
        <PlanProvider>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <header className="h-12 flex items-center border-b border-border px-4 lg:hidden">
                  <SidebarTrigger>
                    <Menu className="h-5 w-5" />
                  </SidebarTrigger>
                </header>
                <main className="flex-1 overflow-auto">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </PlanProvider>
      </DataProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
