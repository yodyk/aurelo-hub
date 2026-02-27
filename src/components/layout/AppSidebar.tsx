import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  Lightbulb,
  Settings,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import AureloLogo from '@/components/AureloLogo';
import { useAuth } from '@/data/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

const mainNavItems = [
  { title: 'Home', url: '/', icon: LayoutDashboard },
  { title: 'Clients', url: '/clients', icon: Users },
  { title: 'Projects', url: '/projects', icon: FolderKanban },
  { title: 'Time Log', url: '/time', icon: Clock },
  { title: 'Insights', url: '/insights', icon: Lightbulb },
];

const bottomNavItems = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

function NavItemList({ items }: { items: typeof mainNavItems }) {
  return (
    <SidebarMenu className="space-y-0.5">
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild className="h-9">
            <NavLink
              to={item.url}
              end={item.url === '/'}
              className="relative flex items-center gap-3 px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground transition-default rounded-lg"
              activeClassName="text-foreground font-medium bg-accent"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { user } = useAuth();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-4 py-5 flex items-start">
        <AureloLogo collapsed={false} />
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <NavItemList items={mainNavItems} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4 mt-auto border-t border-border/40 pt-3">
        <NavItemList items={bottomNavItems} />
        <div className="flex items-center gap-2.5 px-3 pt-3">
          <div className="h-7 w-7 rounded-[4px] bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground shrink-0">
            W
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">My Workspace</p>
            {user?.email && (
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
