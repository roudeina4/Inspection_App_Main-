import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, LogOut, Settings, Menu } from "lucide-react";
import type { User } from "@shared/schema";

interface TopBarProps {
  user: User | null;
  unreadCount: number;
  onLogout: () => void;
  onMobileMenuToggle?: () => void;
}

export function PortalTopBar({ user, unreadCount, onLogout, onMobileMenuToggle }: TopBarProps) {
  return (
    <header 
      className="sticky top-0 z-30 h-[60px] flex items-center justify-between px-4 md:px-8 gap-2 bg-white/80 backdrop-blur-xl border-b border-gray-100/80"
      data-testid="portal-topbar"
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className="md:hidden text-gray-500 hover:text-gray-900 h-9 w-9"
          data-testid="button-mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/notifications">
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-gray-400 hover:text-gray-700 h-9 w-9 rounded-lg"
            data-testid="button-notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-teal-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </Link>

        <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="flex items-center gap-2 px-2 hover:bg-gray-50 rounded-lg h-9"
              data-testid="button-user-menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-gradient-to-br from-slate-700 to-slate-800 text-white font-semibold text-xs">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-gray-700 text-sm hidden sm:inline">{user?.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/portal/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
