import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import AureloLogo from "@/components/AureloLogo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Time", url: "/time", icon: Clock },
  { title: "Insights", url: "/insights", icon: TrendingUp },
  { title: "Invoicing", url: "/invoicing", icon: FileText },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <AureloLogo collapsed={collapsed} />
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent/60 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              W
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">My Workspace</p>
              <Badge variant="outline" className="mt-0.5 text-[10px] font-medium px-1.5 py-0 border-primary/20 text-primary">
                Starter
              </Badge>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-primary/8 text-primary"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings">
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                    activeClassName="bg-primary/8 text-primary"
                  >
                    <Settings className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary shrink-0">
            U
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-foreground">User</p>
                <p className="text-xs text-muted-foreground truncate">user@email.com</p>
              </div>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
