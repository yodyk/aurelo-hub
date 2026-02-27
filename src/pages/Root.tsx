import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
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
              <div className="min-h-screen flex w-full bg-background">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <TopBar />
                  <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
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
