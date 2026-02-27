import { LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/data/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useTheme } from '@/data/ThemeContext';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'AU';

  return (
    <header className="h-12 border-b border-border/50 flex items-center justify-between px-4 sticky top-0 z-30 bg-card">
      <SidebarTrigger className="mr-2" />

      <div className="flex items-center gap-3 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              {theme === 'dark' ? <Moon className="h-4 w-4" /> :
              theme === 'light' ? <Sun className="h-4 w-4" /> :
              <Monitor className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="h-4 w-4 mr-2" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="h-4 w-4 mr-2" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="h-4 w-4 mr-2" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-medium bg-accent text-muted-foreground">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
